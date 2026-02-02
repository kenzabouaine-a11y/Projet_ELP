# Mini-Projet TcTurtle

## Présentation

TcTurtle est une application web développée en **Elm** permettant de visualiser des dessins générés à partir d’un langage de commandes inspiré des *Turtle Graphics*.  
L’utilisateur saisit un programme textuel décrivant les déplacements d’un crayon virtuel, et l’application affiche le tracé correspondant sous forme de dessin SVG.

Ce projet a été réalisé dans le cadre du mini-projet TcTurtle du département Télécommunications de l'INSA Lyon, par : 
- Shouzhi WANG
- Haifa CHKOUNDALI
- Kenza BOUAINE


## Fonctionnalités principales

- Interprétation d’un langage de dessin simple (**TcTurtle**)
- Parsing syntaxique des commandes utilisateur
- Génération dynamique de dessins SVG
- Gestion des répétitions imbriquées (`Repeat`)
- Exécution et affichage du dessin complet
- Animation du tracé pas à pas
- Interface web interactive (zone de saisie + exemples)


## Le langage TcTurtle

Le langage TcTurtle permet de contrôler un crayon virtuel à l’aide de quatre instructions :

- `Forward x` : avance de `x` unités en dessinant un segment
- `Left x` : tourne à gauche de `x` degrés
- `Right x` : tourne à droite de `x` degrés
- `Repeat n [ instructions ]` : répète `n` fois une suite d’instructions

### Exemples

[Repeat 4 [Forward 50, Left 90]]


## Architecture du projet

Le dépôt est organisé comme suit :

### Dossier `src/` (code Elm)

- **`src/Main.elm`**  
  Fichier principal de l’application. Il implémente *The Elm Architecture* :  
  - **Model** : état de l’application (texte saisi, résultat du parsing, animation, etc.)  
  - **Update** : gestion des actions utilisateur (saisie, exécution, animation…)  
  - **View** : interface HTML (zone de saisie, boutons, zone d’affichage SVG)  
  - **Subscriptions** : écoute des événements (ex. animation frame) pour le tracé pas à pas.

- **`src/TurtleParser.elm`**  
  Module de **parsing** du langage TcTurtle.  
  Il transforme le texte entré par l’utilisateur en une structure de données Elm (programme TcTurtle), ou renvoie une erreur si la syntaxe est incorrecte.  
  Le parsing repose sur `elm/parser` et gère notamment les `Repeat` imbriqués.

- **`src/Draw.elm`**  
  Module de **rendu**.  
  Il interprète le programme TcTurtle (position + orientation de la tortue) et produit le dessin sous forme de **SVG**.  
  Il contient aussi la logique permettant d’afficher le dessin **en partie** pour l’animation.

### Autres fichiers à la racine

- **`elm.json`**  
  Configuration Elm : version du compilateur, dépendances (`elm/browser`, `elm/html`, `elm/svg`, `elm/parser`, etc.), et dossier source (`src`).

- **`index.html`**  
  Page HTML qui charge le JavaScript généré par Elm (`Main.js`) et initialise l’application dans le `div` prévu.

- **`style.css`**  
  Feuille de style : mise en page, couleurs, boutons, responsive, mise en forme de la zone SVG.

- **`compiler.bat`**  
  Script Windows permettant de compiler rapidement le projet Elm en JavaScript (`Main.js`).

- **`README.md`**  
  Documentation du projet (présentation, installation, utilisation).

### Dossier `documents/`

- **`documents/Comparaison_java_elm.md`**  
  Document demandé dans le rendu : comparaison Elm vs JavaScript dans le contexte de ce projet.


## Installation et exécution

### Prérequis
- Avoir **Elm 0.19.1** installé (commande `elm --version`).

### Étapes 

1. **Cloner / télécharger** le projet
2. Ouvrir un terminal dans le dossier du projet
3. **Compiler Elm en JavaScript**  
   - Sur Windows : double-cliquer sur `compiler.bat`  
   - (ou en ligne de commande) :
     ```bash
     elm make src/Main.elm --output=Main.js
     ```
4. **Lancer l’application**  
   - Ouvrir `index.html` dans un navigateur (Chrome/Firefox recommandé)


## Utilisation

- Saisir un programme TcTurtle dans la zone de texte
- Cliquer sur Exécuter pour afficher le dessin
- Cliquer sur Animation pour visualiser le tracé pas à pas
- Tester les exemples fournis pour mieux comprendre le langage
- Appuyer sur "Aide" en cas de besoin


## Limites et améliorations possibles

- Gestion du crayon (couleur, épaisseur, levé/baissé)
- Meilleure gestion des erreurs syntaxiques
- Sauvegarde ou export des dessins
