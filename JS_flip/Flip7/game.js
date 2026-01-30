const { createDeck, shuffleDeck, drawCard, cardToString } = require("./deck");

/**
 * Classe PlayerState : représente l'état d'un joueur pendant une manche
 * Gère :
 * - Les cartes en main (nombres, modificateurs, actions)
 * - L'état du joueur (actif, éliminé, gelé, arrêté)
 * - Le calcul du score
 */
class PlayerState {
  /**
   * Constructeur du joueur
   * @param {number} id - Identifiant du joueur (1, 2, 3, ...)
   * @param {number} totalScore - Score cumulé (0 au départ)
   */
  constructor(id, totalScore = 0) {
    this.id = id;
    this.name = `Joueur ${id}`;
    this.totalScore = totalScore; // Score total jusqu'à présent
    this.numberCards = [];        // Cartes nombres collectées
    this.modifiers = [];          // Cartes modificateurs (+2, +4, x2, ...)
    this.actionsInFront = [];     // Cartes actions en attente (2eChance, ...)
    this.busted = false;          // Éliminé (doublon sans 2eChance)
    this.frozen = false;          // Gelé (Freeze = 0 point)
    this.stopped = false;         // S'est arrêté volontairement
    this.hasSecondChance = false; // Possède protection 2eChance
  }

  /**
   * Vérifie si le joueur peut encore jouer
   * @returns {boolean} true si le joueur est actif
   */
  isActive() {
    return !this.busted && !this.frozen && !this.stopped;
  }

  /**
   * Récupère les valeurs uniques des cartes nombres
   * Utilisé pour déterminer les doublons et vérifier Flip 7
   * @returns {Set<number>} Ensemble des valeurs uniques (ex: {1, 3, 5, 7})
   */
  getUniqueNumberValues() {
    return new Set(this.numberCards.map((c) => c.value));
  }

  /**
   * Détecte si une nouvelle carte crée un doublon
   * Un doublon = même valeur 2 fois ou plus en main
   * @param {number} lastValue - Valeur de la dernière carte ajoutée
   * @returns {boolean} true si doublon détecté
   */
  hasDuplicateOnAdd(lastValue) {
    const values = this.numberCards.map((c) => c.value);
    const occurrences = values.filter((v) => v === lastValue).length;
    return occurrences > 1;
  }

  /**
   * Affiche la main du joueur en format lisible
   * Format : "1 3 5 [+2 x2] {2eChance}"
   * @returns {string} Représentation de la main
   */
  handToString() {
    const nums = this.numberCards.map((c) => cardToString(c)).join(" ");
    const mods = this.modifiers.map((c) => cardToString(c)).join(" ");
    const acts = this.actionsInFront.map((c) => cardToString(c)).join(" ");
    const parts = [];
    if (nums) parts.push(nums);
    if (mods) parts.push(`[${mods}]`);
    if (acts) parts.push(`{${acts}}`);
    return parts.join(" ") || "(aucune carte)";
  }

  /**
   * Calcule le score de la manche
   * Formule :
   * 1. Somme des cartes nombres
   * 2. + Modificateurs (+2, +4, +6, +8, +10, x2)
   * 3. + 15 points si Flip 7 (7 valeurs uniques ou plus)
   * 4. = 0 points si busted ou gelé
   * @returns {number} Score de la manche
   */
  computeRoundScore() {
    if (this.busted || this.frozen) return 0; 
    // Somme des cartes nombres
    let sum = this.numberCards.reduce((acc, c) => acc + c.value, 0);

    // Application des modificateurs de score
    for (const m of this.modifiers) {
      switch (m.kind) {
        case "plus2": sum += 2; break;
        case "plus4": sum += 4; break;
        case "plus6": sum += 6; break;
        case "plus8": sum += 8; break;
        case "plus10": sum += 10; break;
        case "x2": sum *= 2; break;
      }
    }

    // Bonus Flip 7 : 7 valeurs uniques ou plus = +15 points
    if (this.getUniqueNumberValues().size >= 7) {
      sum += 15;
    }

    // Accumule au score total du joueur
    this.totalScore += sum;
    return sum;
  }
}

/**
 * Classe Flip7Round : gère une manche complète du jeu
 * Une manche = tous les joueurs jouent jusqu'à ce qu'un gagne ou tous soient éliminés
 */
class Flip7Round {
  /**
   * Constructeur de la manche
   * @param {number} numPlayers - Nombre de joueurs
   * @param {Array<number>} playerScores - Scores cumulés des joueurs (pour continuer de la manche précédente)
   */
  constructor(numPlayers, playerScores = []) {
    this.numPlayers = numPlayers;
    // Crée les objets joueurs avec leurs scores précédents
    this.players = Array.from({ length: numPlayers }, (_, i) => 
      new PlayerState(i + 1, playerScores[i] || 0)
    );
    this.deck = shuffleDeck(createDeck());
    this.roundOver = false; // La manche se termine quand quelqu'un gagne ou tous sont éliminés
  }

  /**
   * Distribue une première carte à chaque joueur
   * Chaque joueur reçoit 1 carte au début de la manche
   */
  dealInitialCards() {
    console.log("\nNOUVELLE MANCHE");
    for (const player of this.players) {
      const card = drawCard(this.deck);
      if (!card) break;
      this.resolveDraw(player, card, { initialDeal: true });
      console.log(`${player.name} vous avez pioché ${cardToString(card)}`);
    }
  }

  /**
   * Le joueur tire une carte du paquet
   * Pour les cartes normales et modificateurs, l'effet s'applique immédiatement
   * Pour les actions, la cible sera spécifiée par l'appelant
   * 
   * @param {PlayerState} player - Le joueur qui tire
   * @param {Object} options - Options pour resolveDraw
   * @returns {Card} La carte tirée, null si le paquet est vide
   */
  drawForPlayer(player, options = {}) {
    const card = drawCard(this.deck);
    if (!card) return null;
    
    // Pour les actions, on laisse l'appelant spécifier la cible
    // Pour les autres types, on résout immédiatement
    if (card.type === "action") {
      // Retourne la carte sans la résoudre (sera résolu avec la cible en index.js)
      return card;
    } else {
      this.resolveDraw(player, card, options);
    }
    
    return card;
  }

  /**
   * Traite une carte après qu'elle soit tirée
   * Gère les 3 types de cartes :
   * - NOMBRES : ajoutées à la main, vérifie doublons et Flip 7
   * - MODIFICATEURS : ajoutés aux modificateurs
   * - ACTIONS : Freeze, FlipThree, SecondChance (jouées sur une cible)
   * 
   * @param {PlayerState} player - Le joueur qui reçoit la carte
   * @param {Card} card - La carte à traiter
   * @param {Object} options - Options supplémentaires
   *   - fromFlipThree: true si la carte vient de FlipThree (n'active pas Flip 7 immédiat)
   *   - initialDeal: true si c'est la distribution initiale
   *   - target: PlayerState de la cible (pour les actions spéciales)
   */
  resolveDraw(player, card, { fromFlipThree = false, initialDeal = false, target = null } = {}) {
    if (card.type === "number") {
      // Ajoute la carte nombre à la main
      player.numberCards.push(card);
      
      const value = card.value;
      // Vérifie si c'est un doublon
      if (player.hasDuplicateOnAdd(value)) {
        if (player.hasSecondChance) {
          // REGLE : Doublon avec 2eChance = protection = pas d'élimination 
          player.hasSecondChance = false;
          player.actionsInFront = player.actionsInFront.filter(a => a.kind !== "secondChance");
          player.numberCards.pop(); // Retire la carte qui crée le doublon
          console.log(`${player.name} utilise 2eCHANCE → doublon évité !`);
        } else {
          // REGLE : Doublon sans protection = 0 point + éliminé 
          player.busted = true;
          player.numberCards = [];
          console.log(`${player.name} doublon ${value} → 0 point et éliminé !`);
        }
      } else if (player.getUniqueNumberValues().size >= 7 && !fromFlipThree) {
        // REGLE : Flip 7 = 7 valeurs uniques = fin de manche immédiate [page:1][page:2]
        console.log(`${player.name} FLIP 7 ! 🎉`);
        this.roundOver = true;
      }

    } else if (card.type === "modifier") {
      // Les modificateurs sont simplement stockés pour le calcul final
      player.modifiers.push(card);
      console.log(`${player.name} reçoit ${cardToString(card)}`);

    } else if (card.type === "action") {
      // Les actions spéciales ont des effets immédiats
      // Utilise la cible fournie, ou le joueur lui-même par défaut
      const targetPlayer = target || player;
      this.resolveAction(card, targetPlayer);
    }
  }

  /**
   * Applique une carte action à un joueur cible
   * Utilisé quand une action est jouée sur un autre joueur
   * 
   * @param {Card} card - La carte action à appliquer
   * @param {PlayerState} target - Le joueur cible
   */
  resolveAction(card, target) {
    if (card.type !== "action") return;
    
    switch (card.kind) {
      case "freeze":
        // REGLE : Freeze = gelé = 0 point et éliminé [page:2]
        target.frozen = true;
        target.numberCards = [];
        console.log(`${target.name} GEL/FREEZE → 0 point et éliminé !`);
        break;

      case "flipThree":
        // REGLE : FlipThree = piocher 3 cartes bonus [page:2]
        console.log(`${target.name} TROIS/FLIP THREE ! 3 cartes.`);
        for (let i = 0; i < 3; i++) {
          // S'arrête si la manche est finie ou le joueur éliminé
          if (this.roundOver || target.busted || target.frozen) break;
          const extra = drawCard(this.deck);
          if (!extra) break;
          console.log(`  → ${i+1}/3 : ${cardToString(extra)}`);
          // fromFlipThree=true empêche Flip 7 de se déclencher sur les 3 cartes bonus
          this.resolveDraw(target, extra, { fromFlipThree: true });
        }
        break;

      case "secondChance":
        // REGLE : SecondChance = protection contre 1 doublon [page:2]
        if (!target.hasSecondChance) {
          target.hasSecondChance = true;
          target.actionsInFront.push(card);
          console.log(`${target.name} reçoit 2eCHANCE (protégé 1 doublon).`);
        } else {
          // Impossible d'avoir 2x SecondChance en même temps
          console.log(`${target.name} a déjà 2eCHANCE → défaussée.`);
        }
        break;
    }
  }

  /**
   * La manche se termine quand :
   * 1. Un joueur a fait Flip 7, OU
   * 2. Tous les joueurs restants sont éliminés (busted, frozen, ou stopped)
   * @returns {boolean} true si la manche est finie
   */
  isRoundOver() {
    return this.roundOver || 
           this.players.every((p) => p.busted || p.frozen || p.stopped);
  }

  /**
   * Réinitialise les protections SecondChance à la fin de la manche
   * REGLE : toutes 2eChance sont défaussées en fin de manche [page:1][page:2]
   */
  resetSecondChances() {
    this.players.forEach((p) => {
      p.hasSecondChance = false;
      p.actionsInFront = [];
    });
  }
}

module.exports = { Flip7Round };
