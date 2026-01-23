# Présentation du projet TcTurtle

## Vue d'ensemble

TcTurtle est un outil de dessin en ligne développé en Elm, qui implémente un système de Turtle Graphics similaire au langage Logo. Les utilisateurs peuvent contrôler une "tortue virtuelle" pour se déplacer et dessiner sur le canevas en écrivant des instructions textuelles simples, créant ainsi divers motifs géométriques.

## Architecture technique

Le projet est développé avec Elm 0.19.1. L'application est divisée en trois modules principaux qui collaborent pour accomplir le processus complet de l'entrée de code au rendu graphique.

### Modules principaux

**Main.elm** - Contrôleur principal de l'application 

C'est l'entrée et le centre de coordination de toute l'application. Il implémente l'architecture complète d'Elm :
- **Model** : Gère l'état de l'application, y compris le code saisi par l'utilisateur, les résultats du parsing, l'état de l'animation, etc.
- **Update** : Traite les interactions utilisateur (saisie de code, clic sur exécuter, démarrage de l'animation, etc.) et met à jour l'état de l'application
- **View** : Rend l'interface utilisateur, y compris la zone de saisie de code, les boutons d'exemples, le bouton d'exécution et la zone d'affichage des résultats
- **Subscriptions** : Écoute les événements de frame d'animation pour réaliser une lecture d'animation fluide

L'interface utilise un style de dégradé moderne et fournit plusieurs exemples prédéfinis (carré, cercle, triangle, fleur, etc.) que les utilisateurs peuvent charger d'un clic et modifier. Après la génération, les utilisateurs peuvent également cliquer sur le bouton d'animation. Le système déplie le programme en séquence d'étapes, puis rend frame par frame, permettant aux utilisateurs de voir clairement comment le graphique est dessiné étape par étape.

**TurtleParser.elm** - Analyseur de langage 

Ce module est responsable de l'analyse du code texte saisi par l'utilisateur en structures de programme. Il utilise la bibliothèque Parser d'Elm pour implémenter un analyseur lexical et syntaxique complet.

Le langage TcTurtle supporte quatre instructions de base :
- `Forward n` : Avancer de n unités et dessiner une ligne
- `Left n` : Tourner à gauche de n degrés
- `Right n` : Tourner à droite de n degrés  
- `Repeat n [liste d'instructions]` : Répéter la liste d'instructions n fois

L'analyseur peut traiter les instructions Repeat imbriquées et supporter des structures récursives complexes. Lorsqu'il rencontre une erreur de syntaxe, il retourne des informations d'erreur détaillées pour aider les utilisateurs à localiser rapidement le problème.

**Draw.elm** - Moteur de rendu graphique 

C'est le cœur du dessin du projet, responsable de la conversion des programmes analysés en graphiques SVG visuels.

Le processus de travail est le suivant :
1. **Exécution du programme** : Selon l'ordre des instructions, maintient un "état de la tortue" (position et angle), exécute chaque instruction et enregistre tous les segments de ligne dessinés
2. **Calcul des coordonnées** : Utilise des fonctions trigonométriques pour calculer les nouvelles coordonnées après chaque mouvement, supportant les virages à n'importe quel angle
3. **Calcul des limites** : Calcule automatiquement la boîte de délimitation de tous les segments de ligne pour assurer l'affichage complet du graphique
4. **Génération SVG** : Convertit les segments de ligne en éléments SVG, définit le viewBox et la taille appropriés

Ce module implémente également la fonction `displayPartial` pour la lecture d'animation. Il déplie d'abord le programme en séquence d'instructions aplatie, puis n'exécute que les N premières étapes, réalisant ainsi l'effet de dessin progressif.

## Détails d'implémentation

### Système de coordonnées

Le système utilise un système de coordonnées mathématiques standard, la position initiale est à l'origine (0, 0), l'angle initial est de 90 degrés (vers le haut). Chaque instruction `Forward` calcule les nouvelles coordonnées selon l'angle actuel et la distance, en utilisant les formules `x + distance * cos(angle)` et `y - distance * sin(angle)` (notez que l'axe Y vers le bas est positif, donc on utilise le signe moins).

### Fonction d'animation

Le système appelle d'abord `flattenProgram` pour déplier les instructions Repeat imbriquées en séquence linéaire, puis utilise `Browser.Events.onAnimationFrame` pour s'abonner aux événements de frame d'animation du navigateur. À chaque mise à jour de frame, le compteur s'incrémente, et lorsqu'il atteint le seuil, l'étape suivante est exécutée, contrôlant ainsi la vitesse de l'animation. Tout le processus est entièrement réactif, sans gestion manuelle des minuteries.

### Gestion des erreurs

L'analyseur fournit un message d'erreur. On retrouve également un bouton "Aide" pour assister l'utilisateur dans la correction de l'erreur.

## Mode d'utilisation

Les utilisateurs n'ont qu'à saisir le code TcTurtle dans la zone de texte, puis cliquer sur "Exécuter" pour voir le graphique. Le code doit être enveloppé entre crochets, les instructions sont séparées par des virgules. Par exemple, `[Forward 100, Repeat 4 [Forward 50, Left 90]]` dessinera un carré. Cliquer sur le bouton "Animation" permet de regarder le processus de dessin étape par étape, très utile pour comprendre le flux d'exécution du programme.

Le projet fournit également un script de compilation `compiler.bat`, qui compile en un clic le code source Elm en JavaScript, puis ouvrir `index.html` dans le navigateur pour l'exécuter.