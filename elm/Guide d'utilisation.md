# Guide d'utilisation TcTurtle

## Compilation et exécution

1. Après avoir entré dans le répertoire du projet, exécutez le script de compilation :
   ```powershell
   .\compiler.bat
   ```
   Ou double-cliquez directement sur le fichier `compiler.bat`.

2. Ouvrez le fichier `index.html` dans votre navigateur.

## Syntaxe du langage TcTurtle

Le programme doit être enveloppé entre crochets `[]`, et les instructions sont séparées par des virgules.

### Instructions de base

- `Forward x` - Avancer de x unités (dessiner une ligne)
- `Left x` - Tourner à gauche de x degrés
- `Right x` - Tourner à droite de x degrés
- `Repeat x [liste d'instructions]` - Répéter la liste d'instructions x fois

### Exemples

```
[Forward 100]
[Repeat 4 [Forward 50, Left 90]]
[Repeat 360 [Right 1, Forward 1]]
```

## Mode d'emploi

1. Entrez le code TcTurtle dans la zone de saisie
2. Cliquez sur le bouton "Exécuter" pour voir le graphique
3. Cliquez sur le bouton "Animation" pour regarder le processus de dessin étape par étape

## Installation des dépendances

1. Installer le compilateur Elm :
   ```powershell
   npm install -g elm
   ```

2. Installer les dépendances du projet :
   ```powershell
   elm install elm/browser
   elm install elm/html
   elm install elm/parser
   elm install elm/svg
   ```

   Ou utilisez `elm install` pour installer automatiquement toutes les dépendances listées dans `elm.json`.
