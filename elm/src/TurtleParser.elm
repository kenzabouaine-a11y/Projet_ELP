module TurtleParser exposing (read, Instruction(..), TurtleProgram, ParseError(..))

{-|
  Module de parsing du langage TcTurtle
  
  Ce module parse les chaînes de code TcTurtle et les convertit en structures de données.
  Il gère les instructions Forward, Left, Right et Repeat avec leurs paramètres.
-}

import Parser as ParserLib exposing (Parser, (|.), (|=), succeed, symbol, int, spaces, oneOf, andThen, lazy, DeadEnd)

{-| Type d'instruction du langage TcTurtle -}
type Instruction
    = Forward Int                     
    | Left Int                    
    | Right Int                      
    | Repeat Int (List Instruction)   

{-| Programme = liste d'instructions -}
type alias TurtleProgram =
    List Instruction

{-| Type d'erreur de parsing -}
type ParseError
    = InvalidFormat


{-| Parse une chaîne de code TcTurtle et retourne un programme ou une erreur -}
read : String -> Result ParseError TurtleProgram
read input =
    case ParserLib.run parseProgram input of
        Ok program ->
            Ok program

        Err deadEnds ->
            Err (convertParserError deadEnds)


{-| Parse un programme complet (liste d'instructions entre crochets) -}
parseProgram : Parser TurtleProgram
parseProgram =
    succeed identity
        |. symbol "["
        |. spaces
        |= parseInstructionList
        |. spaces
        |. symbol "]"


{-| Parse une liste d'instructions (peut être vide) -}
parseInstructionList : Parser (List Instruction)
parseInstructionList =
    oneOf
        [ parseInstructionListNonEmpty
        , succeed []
        ]

{-| Parse une liste d'instructions non vide (séparées par des virgules) -}
parseInstructionListNonEmpty : Parser (List Instruction)
parseInstructionListNonEmpty =
    parseInstruction
        |. spaces
        |> andThen
            (\first ->
                oneOf
                    [ succeed (\rest -> first :: rest)
                        |. symbol ","
                        |. spaces
                        |= parseInstructionListNonEmpty
                    , succeed [ first ]
                    ]
            )


{-| Parse une instruction unique (Forward, Left, Right ou Repeat) -}
parseInstruction : Parser Instruction
parseInstruction =
    oneOf
        [ parseForward
        , parseLeft
        , parseRight
        , parseRepeat
        ]


{-| Parse l'instruction Forward -}
parseForward : Parser Instruction
parseForward =
    succeed Forward
        |. symbol "Forward"
        |. spaces
        |= int

{-| Parse l'instruction Left -}
parseLeft : Parser Instruction
parseLeft =
    succeed Left
        |. symbol "Left"
        |. spaces
        |= int

{-| Parse l'instruction Right -}
parseRight : Parser Instruction
parseRight =
    succeed Right
        |. symbol "Right"
        |. spaces
        |= int

{-| Parse l'instruction Repeat -}
parseRepeat : Parser Instruction
parseRepeat =
    succeed Repeat
        |. symbol "Repeat"
        |. spaces
        |= int
        |. spaces
        |. symbol "["
        |. spaces
        |= lazy (\_ -> parseInstructionList)
        |. spaces
        |. symbol "]"


{-| Convertit les erreurs du parser Elm en type ParseError personnalisé -}
convertParserError : List DeadEnd -> ParseError
convertParserError _ =
    InvalidFormat
