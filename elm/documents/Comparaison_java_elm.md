# Comparaison entre Elm et JavaScript 

## Introduction

Dans le cadre du mini-projet TcTurtle, l’application a été développée en Elm puis compilée en JavaScript afin d’être exécutée dans un navigateur web.  
Ce choix nous a poussé à nous demander : puisque Elm est compilé en JavaScript, pourquoi ne pas écrire directement l’application en JavaScript ?  
Cette comparaison vise à mettre en évidence les différences entre Elm et JavaScript dans le contexte précis de ce projet.


## Elm et JavaScript : une relation de compilation

Elm n’est pas exécuté directement par le navigateur. Le code Elm est d’abord **compilé en JavaScript**, puis intégré à une page HTML.  
Dans le projet TcTurtle, le fichier `Main.elm` est compilé en `Main.js`, qui est ensuite chargé par le fichier `index.html`.

Elm peut interagir avec JavaScript de deux manières :

- **Les flags**, transmis au moment de l’initialisation du programme Elm depuis JavaScript
- **Les ports**, permettant une communication bidirectionnelle entre Elm et JavaScript pendant l’exécution

Dans ce projet, aucune interopérabilité avancée n’est nécessaire, car Elm suffit à gérer l’interface, le parsing et le rendu SVG. JavaScript est uniquement utilisé comme environnement d’exécution.


## Pourquoi utiliser Elm plutôt que JavaScript ?

### Typage fort et sécurité à la compilation

Elm est un langage **fortement typé** et **entièrement compilé**.  
Dans le projet TcTurtle, cela garantit par exemple que :
- une instruction TcTurtle est toujours correctement formée,
- le parser retourne soit un programme valide, soit une erreur explicite,
- les fonctions de dessin reçoivent toujours des données cohérentes.

Un grand nombre d’erreurs (types incompatibles, valeurs manquantes, oublis de cas) ont été détectées **avant l’exécution**, contrairement à JavaScript où ces erreurs seraient apparues à l’exécution dans le navigateur.


### Paradigme fonctionnel pur

Elm est un langage **fonctionnel pur** :
- pas d’effets de bord imprévus,
- pas de variables globales modifiables,
- pas d’états cachés.

Dans TcTurtle, cela facilite :
- l’exécution déterministe des instructions,
- la reproduction exacte d’un dessin à partir d’un même programme,
- la mise en place d’une animation pas à pas sans comportements inattendus.

En JavaScript, la gestion manuelle de l’état et des effets (timers, mutations d’objets, callbacks) rendrait le code plus complexe et plus fragile.


### Architecture claire de l’application

Elm impose **The Elm Architecture**, basée sur la séparation :
- Model (état),
- Update (logique),
- View (affichage).

Dans ce projet, cette architecture rend le code :
- plus lisible,
- mieux structuré,
- plus facile à maintenir.

En JavaScript, une structure équivalente doit être imposée manuellement, souvent à l’aide de frameworks ou de conventions, ce qui augmente la complexité initiale.


## Limites d’Elm par rapport à JavaScript

Elm présente également certaines limitations :

- L’écosystème est plus restreint que celui de JavaScript
- Toute interaction avancée avec des bibliothèques externes nécessite l’utilisation de ports
- Le langage impose des contraintes strictes, pouvant être déroutantes au début

Cependant, dans le cadre de notre projet, ces limitations ne constituent pas un frein, car les besoins sont bien couverts par les bibliothèques standards d’Elm.


## Conclusion

Bien que l’application TcTurtle soit finalement exécutée en JavaScript, le choix d’Elm apporte une **meilleure fiabilité**, une **structure claire** et une **réduction significative des erreurs**.  
Elm permet de se concentrer sur la logique du langage TcTurtle et sur le dessin, sans avoir à gérer manuellement les erreurs d’état ou de typage.

Ainsi, Elm apparaît comme un choix particulièrement adapté pour ce projet, malgré le fait qu’il soit compilé en JavaScript.
