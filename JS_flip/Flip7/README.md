# 🎴 Flip 7 - Jeu de Cartes Texte

Un jeu de cartes multi-joueurs en mode texte pour Node.js, où l'objectif est d'être le premier à atteindre **200 points**.

## 🎮 Description

**Flip 7** est un jeu de cartes basé sur la gestion du risque et la stratégie. Les joueurs piochent des cartes et accumulent des points, mais doivent faire attention aux doublons qui peuvent les éliminer. L'originalité du jeu réside dans les **cartes d'action** qui offrent des bonus ou des pénalités spectaculaires.

## 🚀 Démarrage Rapide

### Installation

```bash
npm install
```

(Aucune dépendance externe requise - utilise uniquement la stdlib Node.js)

### Lancer le jeu

```bash
npm start
```

ou directement :

```bash
node index.js
```

Le jeu vous demande le nombre de joueurs, puis lance le jeu en mode interactif.

## 📋 Règles du Jeu

### Objectif
Être le premier joueur à atteindre **200 points** cumulés sur plusieurs manches.

### Composition du Paquet (96 cartes)

#### 🔢 Cartes Nombres (79 cartes)
- **0** : 1 copie
- **1 à 12** : N copies chacune (ex: le 5 a 5 copies)
- Les nombres sont additionnés pour calculer le score

#### ➕ Modificateurs (10 cartes)
- **+2, +4, +6, +8, +10** : Ajoutent des points au score
- **×2** : Multiplie le score total par 2

#### ⚡ Actions Spéciales (7 cartes)
- **Freeze (Gel)** : Élimine le joueur cible → 0 point
- **FlipThree** : Le joueur cible pioche 3 cartes bonus
- **SecondChance** : Le joueur cible est protégé contre 1 doublon

**Règle page 2** : Les cartes Action peuvent être jouées sur n'importe quel joueur actif (incluant vous-même si aucun autre joueur actif).

### Déroulement d'une Manche

1. **Distribution initiale** : Chaque joueur reçoit 1 carte
2. **Tours de jeu** : À tour de rôle, chaque joueur :
   - Voit son score intermédiaire et ses cartes
   - Décide de **piocher** ou de **s'arrêter**
   - Si pioche : reçoit une carte qui s'applique immédiatement
3. **Fin de manche** : Quand tous les joueurs restants se sont arrêtés ou sont éliminés
4. **Calcul des scores** : Chaque joueur marque les points de sa main

### Règles Clés

#### 🔴 Doublon = Éliminé
Si vous pichez une carte avec une valeur que vous avez déjà :
- **Avec SecondChance** : La carte est défaussée, vous gardez votre main
- **Sans SecondChance** : Vous êtes busted (éliminé) = **0 point**

#### 🎉 Flip 7 = Fin de Manche
Si vous avez **7 valeurs uniques ou plus** :
- La manche s'arrête immédiatement
- Les autres joueurs continuent normalement

#### ❄️ Actions Spéciales
- **Freeze** : Gèle le joueur cible (éliminé) = 0 point
- **FlipThree** : Le joueur cible pioche 3 cartes supplémentaires
- **SecondChance** : Le joueur cible est protégé contre 1 doublon
  - S'utilise automatiquement si vous pichez un doublon
  - S'efface en fin de manche

**Lors d'une action** : Vous devez choisir la cible parmi les joueurs actifs (page 2). L'action s'applique immédiatement à la cible.

#### 📊 Calcul du Score
```
Score = Somme des nombres + Modificateurs + Bonus Flip 7
```

Exemple :
- Main : 2, 5, 7, +2, +4, ×2
- Calcul : (2+5+7) + 2 + 4 = 20 × 2 = **40 points**

Si vous avez 7+ valeurs uniques → **+15 points bonus**

## 📁 Structure du Projet

```
Flip7/
├── index.js          # Point d'entrée - Interface et boucle du jeu
├── game.js           # Logique du jeu (PlayerState, Flip7Round)
├── deck.js           # Gestion du paquet de cartes
├── logger.js         # Sauvegarde de l'historique des manches
├── games.json        # Historique des manches (auto-généré)
├── package.json      # Configuration Node.js
└── README.md         # Ce fichier
```

### Fichiers Clés

#### [index.js](index.js)
- Interface utilisateur en mode texte
- Boucle principale du jeu (manches successives)
- Gestion des entrées joueur

#### [game.js](game.js)
- **PlayerState** : État d'un joueur (cartes, scores, états)
- **Flip7Round** : Gestion d'une manche complète
- Logique de résolution des cartes (doublons, Flip 7, actions)

#### [deck.js](deck.js)
- Création du paquet de 96 cartes
- Mélange (Fisher-Yates)
- Tirage et affichage des cartes

#### [logger.js](logger.js)
- Sauvegarde chaque manche dans `games.json`
- Format : historique avec ID, date, joueurs, scores

## � Interface Utilisateur

### Affichage en Couleurs

L'interface utilise des codes couleurs ANSI pour plus de clarté :

- **🟢 Vert** : Joueur actif (en train de jouer)
- **🔴 Rouge** : Joueur busted (éliminé)
- **🔵 Bleu** : Joueur gelé (Freeze)
- **🟡 Jaune** : Joueur arrêté volontairement
- **🔷 Cyan** : Infos importantes (noms, points)
- **🟣 Magenta** : Titres et encadrés

### Début de Manche

Affichage du statut de tous les joueurs :
```
╔════════ MANCHE 1 ════════╗
║  → Joueur 1  ❄ Joueur 2  ⏸ Joueur 3
╚════════════════════════════════╝
```

### Tour de Jeu

```
Joueur 1 (32 pts)
Cartes : 5 7 [+2]

Continuer ? (oui/non) : oui
→ Pioche : 10
Cartes : 5 7 [+2] 10
```

Si c'est une action, sélection de la cible :
```
→ Pioche : Gel

Joueurs actifs :
  1. Joueur 2 (18 pts)
  2. Joueur 3 (25 pts)

Cible (1-2) : 1
✓ Action sur Joueur 2
```

### Récapitulatif de Fin de Manche

Tableau clair et coloré avec classement :
```
╔════════════ RÉSULTATS MANCHE 1 ════════════╗
║
║ 1. Alice           32 pts (total:  32) 
║ 2. Bob             18 pts (total:  18) 
║ 3. Charlie         -5 pts (total:  -5) (busted)
╚═══════════════════════════════════════════╝
```

## 🎯 Exemple de Partie

```
🆕 NOUVELLE PARTIE (historique effacé)
Nombre de joueurs : 2

════════════════════════════
🎮 FLIP 7 - 2 joueurs
════════════════════════════

╔════════ MANCHE 1 ════════╗
║  → Joueur 1  → Joueur 2
╚════════════════════════════════╝

Joueur 1 (0 pts)
Cartes : 5

Continuer ? (oui/non) : oui
→ Pioche : 7
Cartes : 5 7

Joueur 2 (0 pts)
Cartes : 3

Continuer ? (oui/non) : oui
→ Pioche : [+4]
Cartes : 3 [+4]

... (tours suivants)

╔════════════ RÉSULTATS MANCHE 1 ════════════╗
║
║ 1. Joueur 2       27 pts (total:  27) 
║ 2. Joueur 1       12 pts (total:  12) 
╚═══════════════════════════════════════════╝

Nouvelle manche...

(Manche 2, 3, ... jusqu'à atteindre 200 pts)

╔════════════════════════════════════════════╗
║  🏆  JOUEUR 1 GAGNE !                      ║
║  205 pts                                   ║
╚════════════════════════════════════════════╝
```

## 📊 Historique des Manches

Chaque manche est sauvegardée dans `games.json` avec :
- ID et date
- Nombre de joueurs
- État final de chaque joueur :
  - Cartes piochées
  - Modificateurs appliqués
  - États (busted, frozen, stopped)
  - Score de la manche et total cumulé

Exemple :
```json
{
  "id": 1,
  "date": "2026-01-28T15:30:00.000Z",
  "numPlayers": 2,
  "players": [
    {
      "name": "Joueur 1",
      "numberCards": [{"type": "number", "value": 5}],
      "modifiers": [],
      "busted": false,
      "frozen": false,
      "stopped": true,
      "roundScore": 5,
      "totalScore": 5
    }
  ]
}
```
