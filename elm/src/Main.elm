module Main exposing (main, Model, Msg(..), ParseResult(..), AnimationState(..), update, init, errorToString)

{-|
  Module principal TcTurtle
  
  Ce module implémente l'architecture Elm, coordonne les modules de parsing et de dessin,
  et fournit l'interface utilisateur complète avec gestion de l'animation.
-}

import Browser
import Browser.Events
import Html exposing (Html, div, h1, h2, label, button, text, textarea, p)
import Html.Attributes exposing (value, placeholder, rows, style)
import Html.Events exposing (onClick, onInput)
import TurtleParser exposing (read, ParseError, TurtleProgram, Instruction(..))
import Draw exposing (display, displayPartial)

{-| Modèle d'état de l'application -}
type alias Model =
    { input : String              -- Code TcTurtle saisi par l'utilisateur
    , result : ParseResult        -- Résultat du parsing
    , animationState : AnimationState  -- État de l'animation
    , animationCounter : Int      -- Compteur pour contrôler la vitesse d'animation
    , showHelp : Bool             -- Afficher l'aide
    }

{-| État de l'animation -}
type AnimationState
    = NotAnimating                         -- Animation non lancée
    | Animating Int TurtleProgram          -- En cours : étape actuelle, programme complet
    | AnimationComplete                    -- Animation terminée

{-| Résultat du parsing -}
type ParseResult
    = NotParsed                    -- Non parsé
    | ParsedOk TurtleProgram       -- Parsing réussi
    | ParsedError ParseError       -- Parsing échoué

{-| Messages utilisateur -}
type Msg
    = InputChanged String              -- Modification de l'entrée
    | ExecuteButtonClicked             -- Clic sur "Exécuter"
    | ClearButtonClicked               -- Clic sur "Effacer"
    | LoadExample String               -- Charger un exemple
    | AnimateButtonClicked             -- Clic sur "Animation"
    | AnimationTick                    -- Pas de temps d'animation
    | ResetAnimation                   -- Réinitialiser l'animation
    | HelpButtonClicked                -- Clic sur "Aide"

{-| Point d'entrée du programme -}
main : Program () Model Msg
main =
    Browser.element
        { init = \_ -> ( init, Cmd.none )
        , update = update
        , view = view
        , subscriptions = subscriptions
        }

{-| Abonnements : écoute les événements d'animation -}
subscriptions : Model -> Sub Msg
subscriptions model =
    case model.animationState of
        Animating _ _ ->
            Browser.Events.onAnimationFrame (\_ -> AnimationTick)

        _ ->
            Sub.none

{-| Initialise le modèle avec des valeurs par défaut -}
init : Model
init =
    { input = ""
    , result = NotParsed
    , animationState = NotAnimating
    , animationCounter = 0
    , showHelp = False
    }

{-| Traite les messages et met à jour le modèle -}
update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        InputChanged newInput ->
            ( { model | input = newInput, result = NotParsed, animationState = NotAnimating, animationCounter = 0 }
            , Cmd.none
            )

        ExecuteButtonClicked ->
            case read model.input of
                Ok program ->
                    ( { model | result = ParsedOk program, animationState = NotAnimating, animationCounter = 0 }
                    , Cmd.none
                    )

                Err error ->
                    ( { model | result = ParsedError error, animationState = NotAnimating, animationCounter = 0 }
                    , Cmd.none
                    )

        ClearButtonClicked ->
            ( { model
                | input = ""
                , result = NotParsed
                , animationState = NotAnimating
                , animationCounter = 0
              }
            , Cmd.none
            )

        LoadExample exampleCode ->
            ( { model
                | input = exampleCode
                , result = NotParsed
                , animationState = NotAnimating
                , animationCounter = 0
              }
            , Cmd.none
            )

        AnimateButtonClicked ->
            case model.result of
                ParsedOk program ->
                    let
                        stepCount = countSteps program
                    in
                    if stepCount > 0 then
                        ( { model | animationState = Animating 0 program, animationCounter = 0 }
                        , Cmd.none
                        )
                    else
                        ( model, Cmd.none )

                _ ->
                    ( model, Cmd.none )

        AnimationTick ->
            case model.animationState of
                Animating step program ->
                    let
                        totalSteps = countSteps program
                        newCounter = model.animationCounter + 1
                        framesPerStep = 9  -- Mettre à jour l'étape toutes les 9 frames (contrôle de la vitesse)
                    in
                    if step >= totalSteps then
                        ( { model | animationState = AnimationComplete, animationCounter = 0 }
                        , Cmd.none
                        )
                    else if newCounter >= framesPerStep then
                        ( { model | animationState = Animating (step + 1) program, animationCounter = 0 }
                        , Cmd.none
                        )
                    else
                        ( { model | animationCounter = newCounter }
                        , Cmd.none
                        )

                _ ->
                    ( model, Cmd.none )

        ResetAnimation ->
            ( { model | animationState = NotAnimating, animationCounter = 0 }
            , Cmd.none
            )


        HelpButtonClicked ->
            ( { model | showHelp = not model.showHelp }
            , Cmd.none
            )

{-| Calcule le nombre total d'étapes du programme (après dépliage de Repeat) -}
countSteps : TurtleProgram -> Int
countSteps program =
    List.sum (List.map countInstructionSteps program)

{-| Calcule le nombre d'étapes d'une instruction -}
countInstructionSteps : Instruction -> Int
countInstructionSteps instruction =
    case instruction of
        Forward _ -> 1
        Left _ -> 1
        Right _ -> 1
        Repeat n innerInstructions ->
            n * List.sum (List.map countInstructionSteps innerInstructions)

{-| Rend l'interface utilisateur complète -}
view : Model -> Html Msg
view model =
    div
        [ style "padding" "0"
        , style "font-family" "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif"
        , style "background" "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        , style "min-height" "100vh"
        ]
        [ div
            [ style "max-width" "1200px"
            , style "margin" "0 auto"
            , style "background-color" "white"
            , style "box-shadow" "0 10px 40px rgba(0,0,0,0.2)"
            , style "min-height" "100vh"
            ]
            [ -- En-tête avec titre
              div
                [ style "background" "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                , style "padding" "30px 40px"
                , style "color" "white"
                , style "box-shadow" "0 2px 10px rgba(0,0,0,0.1)"
                ]
                [ h1
                    [ style "margin" "0"
                    , style "font-size" "2.5em"
                    , style "font-weight" "300"
                    , style "letter-spacing" "2px"
                    ]
                    [ text "TcTurtle" ]
                , p
                    [ style "margin" "10px 0 0 0"
                    , style "opacity" "0.9"
                    , style "font-size" "1.1em"
                    ]
                    [ text "Dessinez avec des commandes simples" ]
                ]

            -- Zone principale
            , div [ style "padding" "40px" ]
                [ -- Section des exemples
                  div
                    [ style "margin-bottom" "30px"
                    , style "padding" "20px"
                    , style "background" "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
                    , style "border-radius" "10px"
                    , style "box-shadow" "0 2px 5px rgba(0,0,0,0.1)"
                    ]
                    [ h2
                        [ style "margin" "0 0 15px 0"
                        , style "color" "#333"
                        , style "font-size" "1.3em"
                        , style "font-weight" "400"
                        ]
                        [ text "Exemples rapides" ]
                    , div
                        [ style "display" "flex"
                        , style "flex-wrap" "wrap"
                        , style "gap" "10px"
                        ]
                        [ exampleButton "Carré" "[Repeat 4 [Forward 50, Left 90]]"
                        , exampleButton "Cercle" "[Repeat 360 [Right 1, Forward 1]]"
                        , exampleButton "Triangle" "[Repeat 3 [Forward 60, Left 120]]"
                        , exampleButton "Fleur" "[Repeat 36 [Right 10, Repeat 8 [Forward 25, Left 45]]]"
                        , exampleButton "Étoile" "[Repeat 5 [Forward 80, Right 144]]"
                        , exampleButton "Ligne" "[Forward 100]"
                        ]
                    , if model.showHelp then
                        div
                            [ style "margin-top" "20px"
                            , style "padding" "15px"
                            , style "background" "#e3f2fd"
                            , style "border-radius" "8px"
                            , style "border-left" "4px solid #667eea"
                            ]
                            [ p
                                [ style "margin" "0 0 10px 0"
                                , style "font-weight" "600"
                                , style "color" "#333"
                                ]
                                [ text "Format du code TcTurtle :" ]
                            , p
                                [ style "margin" "0 0 8px 0"
                                , style "color" "#555"
                                , style "font-size" "14px"
                                ]
                                [ text "Le code doit être entre crochets [ ]. Les instructions sont séparées par des virgules." ]
                            , p
                                [ style "margin" "0 0 8px 0"
                                , style "color" "#555"
                                , style "font-size" "14px"
                                ]
                                [ text "Instructions disponibles :" ]
                            , div
                                [ style "margin" "0 0 8px 0"
                                , style "padding-left" "20px"
                                , style "color" "#555"
                                , style "font-size" "14px"
                                ]
                                [ div [ style "margin-bottom" "4px" ] [ text "• Forward n : avancer de n unités" ]
                                , div [ style "margin-bottom" "4px" ] [ text "• Left n : tourner à gauche de n degrés" ]
                                , div [ style "margin-bottom" "4px" ] [ text "• Right n : tourner à droite de n degrés" ]
                                , div [ style "margin-bottom" "4px" ] [ text "• Repeat n [instructions] : répéter les instructions n fois" ]
                                ]
                            , p
                                [ style "margin" "0"
                                , style "color" "#555"
                                , style "font-size" "14px"
                                ]
                                [ text "Exemple : [Forward 100, Repeat 4 [Forward 50, Left 90]]" ]
                            ]
                      else
                        text ""
                    ]

                -- Zone de saisie
                , div
                    [ style "margin-bottom" "30px"
                    , style "padding" "25px"
                    , style "background" "#fafbfc"
                    , style "border-radius" "10px"
                    , style "box-shadow" "0 2px 8px rgba(0,0,0,0.08)"
                    ]
                    [ div
                        [ style "display" "flex"
                        , style "justify-content" "space-between"
                        , style "align-items" "center"
                        , style "margin-bottom" "10px"
                        ]
                        [ label
                            [ style "color" "#333"
                            , style "font-weight" "500"
                            , style "font-size" "1.1em"
                            ]
                            [ text "Votre code TcTurtle :" ]
                        , button
                            [ onClick HelpButtonClicked
                            , style "padding" "8px 16px"
                            , style "font-size" "14px"
                            , style "cursor" "pointer"
                            , style "background" "white"
                            , style "color" "#667eea"
                            , style "border" "2px solid #667eea"
                            , style "border-radius" "6px"
                            , style "font-weight" "500"
                            ]
                            [ text "Aide" ]
                        ]
                    , textarea
                        [ onInput InputChanged
                        , value model.input
                        , placeholder "[Forward 100, Repeat 4 [Forward 50, Left 90]]"
                        , rows 6
                        , style "width" "100%"
                        , style "font-family" "'Courier New', monospace"
                        , style "font-size" "14px"
                        , style "padding" "15px"
                        , style "border" "2px solid #e1e8ed"
                        , style "border-radius" "8px"
                        , style "box-sizing" "border-box"
                        , style "resize" "vertical"
                        , style "transition" "all 0.3s ease"
                        ]
                        []
                    , div
                        [ style "display" "flex"
                        , style "gap" "10px"
                        , style "margin-top" "15px"
                        ]
                        [ button
                            [ onClick ExecuteButtonClicked
                            , style "padding" "12px 30px"
                            , style "font-size" "16px"
                            , style "font-weight" "500"
                            , style "cursor" "pointer"
                            , style "background" "white"
                            , style "color" "#667eea"
                            , style "border" "2px solid #667eea"
                            , style "border-radius" "8px"
                            , style "flex" "1"
                            ]
                            [ text "Exécuter" ]
                        , button
                            [ onClick ClearButtonClicked
                            , style "padding" "12px 30px"
                            , style "font-size" "16px"
                            , style "font-weight" "500"
                            , style "cursor" "pointer"
                            , style "background" "#f5f7fa"
                            , style "color" "#667eea"
                            , style "border" "2px solid #667eea"
                            , style "border-radius" "8px"
                            , style "transition" "all 0.3s ease"
                            ]
                            [ text "Effacer" ]
                        ]
                    , case model.result of
                        ParsedOk _ ->
                            case model.animationState of
                                Animating _ _ ->
                                    button
                                        [ onClick ResetAnimation
                                        , style "padding" "12px 30px"
                                        , style "font-size" "16px"
                                        , style "font-weight" "500"
                                        , style "cursor" "pointer"
                                        , style "background" "#f5f7fa"
                                        , style "color" "#667eea"
                                        , style "border" "2px solid #667eea"
                                        , style "border-radius" "8px"
                                        , style "width" "100%"
                                        , style "margin-top" "10px"
                                        ]
                                        [ text "Arrêter" ]
                                
                                AnimationComplete ->
                                    button
                                        [ onClick ResetAnimation
                                        , style "padding" "12px 30px"
                                        , style "font-size" "16px"
                                        , style "font-weight" "500"
                                        , style "cursor" "pointer"
                                        , style "background" "#f5f7fa"
                                        , style "color" "#667eea"
                                        , style "border" "2px solid #667eea"
                                        , style "border-radius" "8px"
                                        , style "width" "100%"
                                        , style "margin-top" "10px"
                                        ]
                                        [ text "Arrêter" ]
                                
                                _ ->
                                    button
                                        [ onClick AnimateButtonClicked
                                        , style "padding" "12px 30px"
                                        , style "font-size" "16px"
                                        , style "font-weight" "500"
                                        , style "cursor" "pointer"
                                        , style "background" "white"
                                        , style "color" "#667eea"
                                        , style "border" "2px solid #667eea"
                                        , style "border-radius" "8px"
                                        , style "width" "100%"
                                        , style "margin-top" "10px"
                                        ]
                                        [ text "Animation" ]
                        
                        _ ->
                            text ""
                    ]

                -- Zone de résultat
                , div
                    [ style "padding" "25px"
                    , style "background" "#ffffff"
                    , style "border-radius" "10px"
                    , style "box-shadow" "0 2px 8px rgba(0,0,0,0.08)"
                    , style "min-height" "500px"
                    , style "border" "2px dashed #e1e8ed"
                    ]
                    [ case model.result of
                        NotParsed ->
                            div
                                [ style "text-align" "center"
                                , style "padding" "100px 20px"
                                , style "color" "#95a5a6"
                                ]
                                [ p
                                    [ style "font-size" "1.2em"
                                    , style "margin" "0"
                                    , style "font-style" "italic"
                                    ]
                                    [ text "Cliquez sur 'Exécuter' pour dessiner votre création" ]
                                ]

                        ParsedOk program ->
                            let
                                ( displayText, svgContent ) =
                                    case model.animationState of
                                        Animating step _ ->
                                            let
                                                totalSteps = countSteps program
                                                percentage = 
                                                    if totalSteps > 0 then
                                                        String.fromInt ((step * 100) // totalSteps)
                                                    else
                                                        "0"
                                            in
                                            ( "Animation en cours... " ++ percentage ++ "%"
                                            , displayPartial step program
                                            )
                                        
                                        AnimationComplete ->
                                            ( "Animation terminée"
                                            , display program
                                            )
                                        
                                        _ ->
                                            ( "Votre dessin :"
                                            , display program
                                            )
                            in
                            div []
                                [ div
                                    [ style "margin-bottom" "20px"
                                    , style "padding" "15px"
                                    , style "background" "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"
                                    , style "border-radius" "8px"
                                    , style "color" "#2c3e50"
                                    , style "font-weight" "500"
                                    ]
                                    [ text displayText ]
                                , svgContent
                                ]

                        ParsedError error ->
                            div
                                [ style "padding" "20px"
                                , style "background" "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
                                , style "border-radius" "8px"
                                , style "border-left" "5px solid #e74c3c"
                                , style "box-shadow" "0 2px 10px rgba(231, 76, 60, 0.2)"
                                ]
                                [ div
                                    [ style "color" "#2c3e50"
                                    , style "font-size" "1em"
                                    , style "line-height" "1.6"
                                    ]
                                    [ text (errorToString error) ]
                                ]
                    ]
                ]
            ]
        ]


{-| Crée un bouton d'exemple -}
exampleButton : String -> String -> Html Msg
exampleButton label exampleCode =
    button
        [ onClick (LoadExample exampleCode)
        , style "padding" "10px 20px"
        , style "font-size" "14px"
        , style "cursor" "pointer"
        , style "background" "white"
        , style "color" "#667eea"
        , style "border" "2px solid #667eea"
        , style "border-radius" "6px"
        , style "transition" "all 0.3s ease"
        , style "font-weight" "500"
        ]
        [ text label ]

{-| Convertit une erreur de parsing en chaîne lisible -}
errorToString : ParseError -> String
errorToString _ =
    "Format incorrect. Cliquez sur le bouton Aide pour voir le format correct."
