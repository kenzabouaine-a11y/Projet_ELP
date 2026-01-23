module Draw exposing (display, displayPartial, TurtleState, Line)

{-|
  Module de dessin TcTurtle
  
  Ce module convertit les programmes parsés en graphiques SVG.
  Il gère l'exécution des instructions, le calcul des positions et l'affichage.
-}

import Svg exposing (Svg, svg, line)
import Svg.Attributes exposing (viewBox, x1, y1, x2, y2, stroke, strokeWidth, width, height)
import TurtleParser exposing (Instruction(..), TurtleProgram)
import List
import Basics exposing (pi, cos, sin)

{-| État de la tortue (position et orientation) -}
type alias TurtleState =
    { x : Float        -- Coordonnée X
    , y : Float        -- Coordonnée Y
    , angle : Float    -- Angle en degrés (0° vers le haut)
    }

{-| Segment de ligne pour le dessin SVG -}
type alias Line =
    { x1 : Float    -- Point de départ X
    , y1 : Float    -- Point de départ Y
    , x2 : Float    -- Point d'arrivée X
    , y2 : Float    -- Point d'arrivée Y
    }

{-| Rectangle de délimitation -}
type alias Bounds =
    { minX : Float
    , minY : Float
    , maxX : Float
    , maxY : Float
    }

{-| Convertit un programme complet en SVG -}
display : TurtleProgram -> Svg msg
display program =
    let
        initialState =
            { x = 0, y = 0, angle = 90 }

        ( lines, _ ) =
            executeProgram program initialState

        bounds =
            if List.isEmpty lines then
                { minX = -50, minY = -50, maxX = 50, maxY = 50 }
            else
                calculateBounds lines

        margin = 20

        widthVal =
            bounds.maxX - bounds.minX + 2 * margin

        heightVal =
            bounds.maxY - bounds.minY + 2 * margin

        viewBoxStr =
            String.fromFloat (bounds.minX - margin)
                ++ " "
                ++ String.fromFloat (bounds.minY - margin)
                ++ " "
                ++ String.fromFloat widthVal
                ++ " "
                ++ String.fromFloat heightVal

        widthStr =
            "800"

        heightStr =
            "600"
    in
    svg
        [ viewBox viewBoxStr
        , width widthStr
        , height heightStr
        ]
        (List.map lineToSvg lines)


{-| Affiche les N premières étapes du programme (pour l'animation) -}
displayPartial : Int -> TurtleProgram -> Svg msg
displayPartial maxSteps program =
    let
        initialState =
            { x = 0, y = 0, angle = 90 }

        allSteps = flattenProgram program
        stepsToExecute = List.take maxSteps allSteps
        ( lines, _ ) = executeSteps stepsToExecute initialState

        bounds =
            if List.isEmpty lines then
                { minX = -50, minY = -50, maxX = 50, maxY = 50 }
            else
                calculateBounds lines

        margin = 20

        widthVal = bounds.maxX - bounds.minX + 2 * margin

        heightVal = bounds.maxY - bounds.minY + 2 * margin

        viewBoxStr =
            String.fromFloat (bounds.minX - margin)
                ++ " "
                ++ String.fromFloat (bounds.minY - margin)
                ++ " "
                ++ String.fromFloat widthVal
                ++ " "
                ++ String.fromFloat heightVal

        widthStr = "800"
        heightStr = "600"
    in
    svg
        [ viewBox viewBoxStr
        , width widthStr
        , height heightStr
        ]
        (List.map lineToSvg lines)


{-| Déplie le programme en séquence d'instructions (déplie Repeat) -}
flattenProgram : TurtleProgram -> List Instruction
flattenProgram program =
    List.concatMap flattenInstruction program

{-| Déplie une instruction (répète les instructions internes de Repeat) -}
flattenInstruction : Instruction -> List Instruction
flattenInstruction instruction =
    case instruction of
        Forward _ -> [ instruction ]
        Left _ -> [ instruction ]
        Right _ -> [ instruction ]
        Repeat n innerInstructions ->
            let
                flattenedInner = flattenProgram innerInstructions
            in
            List.concat (List.repeat n flattenedInner)


{-| Exécute une séquence d'instructions et retourne les lignes générées -}
executeSteps : List Instruction -> TurtleState -> ( List Line, TurtleState )
executeSteps steps state =
    case steps of
        [] ->
            ( [], state )

        instruction :: rest ->
            let
                ( lines1, newState1 ) = executeInstruction instruction state
                ( lines2, newState2 ) = executeSteps rest newState1
            in
            ( lines1 ++ lines2, newState2 )


{-| Exécute un programme complet et retourne toutes les lignes générées -}
executeProgram : TurtleProgram -> TurtleState -> ( List Line, TurtleState )
executeProgram program state =
    case program of
        [] ->
            ( [], state )

        instruction :: rest ->
            let
                ( lines1, newState1 ) =
                    executeInstruction instruction state

                ( lines2, newState2 ) =
                    executeProgram rest newState1
            in
            ( lines1 ++ lines2, newState2 )


{-| Exécute une instruction unique et met à jour l'état de la tortue -}
executeInstruction : Instruction -> TurtleState -> ( List Line, TurtleState )
executeInstruction instruction state =
    case instruction of
        Forward distance ->
            let
                ( newX, newY ) =
                    calculateNewPosition state.x state.y state.angle (toFloat distance)

                newLine =
                    { x1 = state.x
                    , y1 = state.y
                    , x2 = newX
                    , y2 = newY
                    }

                newState =
                    { x = newX, y = newY, angle = state.angle }
            in
            ( [ newLine ], newState )

        Left degrees ->
            let
                newState =
                    { state | angle = state.angle + toFloat degrees }
            in
            ( [], newState )

        Right degrees ->
            let
                newState =
                    { state | angle = state.angle - toFloat degrees }
            in
            ( [], newState )

        Repeat times instructions ->
            executeRepeat times instructions state


{-| Répète l'exécution d'une liste d'instructions un nombre de fois donné -}
executeRepeat : Int -> List Instruction -> TurtleState -> ( List Line, TurtleState )
executeRepeat times instructions state =
    if times <= 0 then
        ( [], state )
    else
        let
            ( lines1, newState1 ) =
                executeProgram instructions state

            ( lines2, newState2 ) =
                executeRepeat (times - 1) instructions newState1
        in
        ( lines1 ++ lines2, newState2 )


{-| Calcule la nouvelle position après un déplacement selon l'angle et la distance -}
calculateNewPosition : Float -> Float -> Float -> Float -> ( Float, Float )
calculateNewPosition x y angle degrees =
    let
        angleRad =
            angle * pi / 180

        newX =
            x + degrees * cos angleRad

        newY =
            y - degrees * sin angleRad
    in
    ( newX, newY )


{-| Calcule le rectangle de délimitation minimal de toutes les lignes -}
calculateBounds : List Line -> Bounds
calculateBounds lines =
    case lines of
        [] ->
            { minX = -50, minY = -50, maxX = 50, maxY = 50 }

        _ :: _ ->
            let
                allPoints =
                    List.concatMap
                        (\line ->
                            [ ( line.x1, line.y1 )
                            , ( line.x2, line.y2 )
                            ]
                        )
                        lines

                xs =
                    List.map Tuple.first allPoints

                ys =
                    List.map Tuple.second allPoints

                minX =
                    List.minimum xs |> Maybe.withDefault 0

                maxX =
                    List.maximum xs |> Maybe.withDefault 0

                minY =
                    List.minimum ys |> Maybe.withDefault 0

                maxY =
                    List.maximum ys |> Maybe.withDefault 0
            in
            { minX = minX, minY = minY, maxX = maxX, maxY = maxY }


{-| Convertit un segment de ligne en élément SVG -}
lineToSvg : Line -> Svg msg
lineToSvg lineData =
    line
        [ x1 (String.fromFloat lineData.x1)
        , y1 (String.fromFloat lineData.y1)
        , x2 (String.fromFloat lineData.x2)
        , y2 (String.fromFloat lineData.y2)
        , stroke "black"
        , strokeWidth "2"
        ]
        []
