## Présentation du projet

Ce projet est un travail autonome de JavaScript pour le cours ELP 2025.  
Il implémente une version web simplifiée de « Dou Di Zhu », un jeu de cartes chinois à trois joueurs :  
une manche complète (distribution, coups, IA, détection de la fin) est jouable directement dans le navigateur, avec musique d’ambiance, fenêtre d’aide sur les combinaisons et classement local.  
L’objectif principal est de mettre en avant des fonctionnalités modernes de JavaScript (style fonctionnel, asynchronisme, modularisation, manipulation du DOM).

## Fichiers du projet

- `index.html` :  
  Fichier d’entrée. Définit la structure de la page (trois joueurs, zone des cartes du donneur, zone de jeu centrale, en-tête et pied de page),  
  ainsi que les boutons « Nouvelle manche », « Aide » et « Classement ».  
  Il référence la feuille de style, les scripts JavaScript et l’élément audio pour la musique de fond.

- `style.css` :  
  Feuille de style. Met en place une interface sombre avec des accents dorés (effet « bling-bling »), les panneaux des joueurs, la zone centrale,  
  les boutons, et deux fenêtres modales (aide et classement).  
  La première ébauche de la palette de couleurs et de la mise en page a été générée avec le modèle Gemini à partir du prompt  
  « aide-moi à concevoir une interface jolie avec une palette de couleurs dorées, style bling-bling »,  
  puis ajustée et simplifiée manuellement. Toute la logique JavaScript est en revanche écrite pour ce projet.

- `deck.js` :  
  Logique liée au paquet de cartes :  
  - définition d’un paquet standard de 54 cartes (3–A, 2, plus deux jokers) ;  
  - création, mélange (Fisher–Yates) et distribution selon les règles de Dou Di Zhu (3 × 17 cartes + 3 cartes du donneur) ;  
  - fonction de conversion « carte → valeur numérique » utilisée par le module de règles.

- `rules.js` :  
  Moteur de règles qui reconnaît les combinaisons et compare deux coups :  
  - combinaisons supportées : carte seule, paire, brelan, brelan + une carte, suite, suite de paires, avion (suite de brelans), bombe, double joker ;  
  - classification d’un ensemble de cartes en type de combinaison avec une valeur principale et une longueur ;  
  - fonction générique qui décide si un coup peut légalement battre le coup précédent, avec la priorité des bombes.

- `ai.js` :  
  IA simple mais générique pour choisir un coup :  
  - génération de tous les sous-ensembles possibles de la main courante ;  
  - filtrage via `rules.js` pour ne garder que les combinaisons légales qui battent la précédente ;  
  - sélection d’un coup « raisonnable » (valeur minimale, peu de cartes) pour conserver les bonnes cartes le plus longtemps possible ;  
  - utilisation de `async/await` et d’un délai artificiel pour simuler un temps de réflexion.

- `game.js` :  
  Centre de contrôle de la partie :  
  - gère l’état global (mains des joueurs, donneur/fermiers, joueur courant, dernier pli, fin de partie) ;  
  - rend l’interface (cartes, compte de cartes restantes, pli central, messages d’état) ;  
  - gère les interactions utilisateur (sélection des cartes, boutons « Jouer »/« Passer »/« Nouvelle manche ») ;  
  - orchestre les tours des IA en utilisant `ai.js` et en validant chaque coup via `rules.js` ;  
  - pilote la musique de fond (BGM) ;  
  - maintient un petit classement local dans `localStorage` en incrémentant le nombre de victoires de l’utilisateur.

- `ddz-readme.md` :  
  Le présent document, destiné à présenter rapidement le projet au correcteur.

## Origine du jeu (résumé)

« Dou Di Zhu » est un jeu de cartes chinois à trois joueurs, très populaire :  
- on joue avec un paquet de 54 cartes ;  
- un joueur est le « donneur » (équivalent d’un propriétaire de terrain), les deux autres forment le camp des « fermiers » ;  
- le donneur reçoit 3 cartes supplémentaires (les cartes du donneur) et commence la manche ;  
- les joueurs enchaînent des combinaisons (carte seule, paire, suite, brelan + une carte, bombe, etc.) en essayant de battre le pli précédent ;  
- la première personne qui se débarrasse de toutes ses cartes fait gagner son camp.

Dans ce projet, nous implémentons une version volontairement légère de ces règles :  
- musique de fond, fenêtre d’aide et classement fictif;  
- le classement inclut un joueur nommé « Bob le Tavernier », clin d’œil à Bob, le tavernier de l’auberge dans Hearthstone Battlegrounds.

## Lancement

- Ouvrir `index.html` dans un navigateur moderne (Chrome, Edge, Firefox, …).  
- Aucune installation supplémentaire n’est nécessaire : tout est exécuté côté client.  
- Le jeu essaie de lancer automatiquement la BGM au chargement ; si le navigateur bloque l’autoplay, un clic sur un des boutons de la barre supérieure suffit à activer le son.

## Stratégie de l’IA (résumé)

Lors de son tour, l’IA :  
1. détermine si elle doit battre un coup existant ou si elle commence une nouvelle série ;  
2. énumère tous les sous-ensembles possibles de sa main et les classe via `rules.js` ;  
3. retient les coups valides qui battent le précédent, puis choisit le plus petit en valeur (et en nombre de cartes) ;  
4. si elle ouvre la série et possède une suite / suite de paires / avion, elle privilégie ce type de combinaison, sinon elle joue sa plus petite carte seule.  

Chaque coup d’IA est repassé par le validateur de règles avant d’être posé sur la table, pour garantir la cohérence du jeu.

## Règles de jeu couvertes

Le projet couvre l’essentiel des règles de combinaison de Dou Di Zhu :

- Rôles et camps :  
  - 3 joueurs : vous + 2 IA ;  
  - vous êtes toujours le donneur, les autres sont des fermiers ;  
  - si le donneur vide sa main en premier, le camp du donneur gagne, sinon ce sont les fermiers.

- Combinaisons supportées :  
  - carte seule, paire, brelan ;  
  - brelan + une carte isolée ;  
  - suite (au moins 5 cartes consécutives, sans 2 ni joker) ;  
  - suite de paires (par ex. 3-3, 4-4, 5-5, même contrainte sur le 2 et les jokers) ;  
  - avion (suite de brelans, sans cartes annexes) ;  
  - bombe (quatre cartes identiques) et double joker (plus forte combinaison du jeu).

- Comparaison des coups :  
  - seuls deux coups de même type et de même longueur peuvent être comparés,  
    à l’exception des bombes qui peuvent battre n’importe quel coup non bombe ;  
  - parmi les bombes, le double joker est toujours supérieur ;  
  - pour un type donné, on compare la valeur principale (ou la valeur de départ pour les suites).

- Classement et comptage de victoires :  
  - le classement est stocké localement et contient des joueurs fictifs ainsi que « Vous » ;  
  - chaque fois que votre camp gagne, votre nombre de victoires est incrémenté et le tableau est réordonné ;  
  - les données sont persistées dans `localStorage`.


