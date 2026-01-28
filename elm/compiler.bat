@echo off
chcp 65001 >nul
echo Compilation du programme Elm en cours...
echo Elm va automatiquement installer les dépendances si nécessaire...
echo.

REM Compiler le programme principal (installe automatiquement les dépendances)
elm make src/Main.elm --output=Main.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Compilation réussie ! Main.js a été généré.
    echo Vous pouvez maintenant ouvrir index.html dans votre navigateur.
    echo.
) else (
    echo.
    echo La compilation a échoué, veuillez vérifier les messages d'erreur.
    echo.
)

pause
