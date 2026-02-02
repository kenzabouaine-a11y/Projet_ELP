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
   * Calcule le score de la manche (SANS modifier totalScore)
   * Règles importantes :
   * - busted ou gelé => 0
   * - x2 double uniquement la somme des cartes nombres (ne double pas les +2/+4/...)
   * - Flip 7 => +15 si 7 valeurs uniques ou plus
   * @returns {number} Score de la manche
   */
  computeRoundScore() {
    if (this.busted || this.frozen) return 0;

    // Somme des cartes nombres
    const sumNumbers = this.numberCards.reduce((acc, c) => acc + c.value, 0);

    // Bonus +2/+4/+6/+8/+10 (non doublés par x2)
    let bonusPlus = 0;

    // Nombre de x2 (chaque x2 re-double les nombres)
    let x2Count = 0;

    for (const m of this.modifiers) {
      switch (m.kind) {
        case "plus2": bonusPlus += 2; break;
        case "plus4": bonusPlus += 4; break;
        case "plus6": bonusPlus += 6; break;
        case "plus8": bonusPlus += 8; break;
        case "plus10": bonusPlus += 10; break;
        case "x2": x2Count += 1; break;
      }
    }

    const numbersAfterX2 = sumNumbers * Math.pow(2, x2Count);

    // Bonus Flip 7
    const flip7Bonus = (this.getUniqueNumberValues().size >= 7) ? 15 : 0;

    return numbersAfterX2 + bonusPlus + flip7Bonus;
  }
}

/**
 * Classe Flip7Round : gère une manche complète du jeu
 */
class Flip7Round {
  /**
   * Constructeur de la manche
   * @param {number} numPlayers - Nombre de joueurs
   * @param {Array<number>} playerScores - Scores cumulés des joueurs
   */
  constructor(numPlayers, playerScores = []) {
    this.numPlayers = numPlayers;
    this.players = Array.from({ length: numPlayers }, (_, i) =>
      new PlayerState(i + 1, playerScores[i] || 0)
    );
    this.deck = shuffleDeck(createDeck());
    this.roundOver = false;
  }

  /**
   * Distribue une première carte à chaque joueur
   */
  dealInitialCards() {
    console.log("\nNOUVELLE MANCHE");
    for (const player of this.players) {
      const card = drawCard(this.deck);
      if (!card) break;
      this.resolveDraw(player, card);
      console.log(`${player.name} vous avez pioché ${cardToString(card)}`);
    }
  }

  /**
   * Le joueur tire une carte du paquet
   * - Action : renvoyée pour que index.js choisisse la cible
   * - Sinon : résolue immédiatement
   */
  drawForPlayer(player, options = {}) {
    const card = drawCard(this.deck);
    if (!card) return null;

    if (card.type === "action") {
      return card; // résolu avec la cible dans index.js
    } else {
      this.resolveDraw(player, card, options);
    }

    return card;
  }

  /**
   * Traite une carte après qu'elle soit tirée
   */
  resolveDraw(player, card, {target = null } = {}) {
    if (card.type === "number") {
      player.numberCards.push(card);

      const value = card.value;

      // Doublon ?
      if (player.hasDuplicateOnAdd(value)) {
        if (player.hasSecondChance) {
          // Protection : on annule le doublon
          player.hasSecondChance = false;
          player.actionsInFront = player.actionsInFront.filter(a => a.kind !== "secondChance");
          player.numberCards.pop();
          console.log(`${player.name} utilise 2eCHANCE → doublon évité !`);
        } else {
          // Éliminé
          player.busted = true;
          player.numberCards = [];
          console.log(`${player.name} doublon ${value} → 0 point et éliminé !`);
        }
      } else if (player.getUniqueNumberValues().size >= 7) {
        // Flip 7 (doit pouvoir arriver même pendant FlipThree)
        console.log(`${player.name} FLIP 7 ! 🎉`);
        this.roundOver = true;
      }

    } else if (card.type === "modifier") {
      player.modifiers.push(card);
      console.log(`${player.name} reçoit ${cardToString(card)}`);

    } else if (card.type === "action") {
      const targetPlayer = target || player;
      this.resolveAction(card, targetPlayer);
    }
  }

  /**
   * Applique une carte action à un joueur cible
   */
  resolveAction(card, target) {
    if (card.type !== "action") return;

    switch (card.kind) {
      case "freeze":
        target.frozen = true;
        target.numberCards = [];
        console.log(`${target.name} GEL/FREEZE → 0 point et éliminé !`);
        break;

      case "flipThree":
        console.log(`${target.name} TROIS/FLIP THREE ! 3 cartes.`);
        for (let i = 0; i < 3; i++) {
          if (this.roundOver || target.busted || target.frozen) break;
          const extra = drawCard(this.deck);
          if (!extra) break;
          console.log(`  → ${i + 1}/3 : ${cardToString(extra)}`);

          // on ne bloque plus Flip 7 ici
          this.resolveDraw(target, extra);
        }
        break;

      case "secondChance":
        if (!target.hasSecondChance) {
          target.hasSecondChance = true;
          target.actionsInFront.push(card);
          console.log(`${target.name} reçoit 2eCHANCE (protégé 1 doublon).`);

          // RÈGLE : en recevant 2eCHANCE, tu pioches immédiatement une autre carte
          const extra = drawCard(this.deck);
          if (extra) {
            console.log(`  → Bonus 2eCHANCE : ${cardToString(extra)}`);

            // Si c'est une action, on l'applique à la cible par défaut
          
            if (extra.type === "action") {
              this.resolveAction(extra, target);
            } else {
              this.resolveDraw(target, extra);
            }
          }
        } else {
          console.log(`${target.name} a déjà 2eCHANCE → défaussée.`);
        }
        break;
    }
  }

  /**
   * Manche terminée si Flip7 OU tous inactifs
   */
  isRoundOver() {
    return this.roundOver ||
      this.players.every((p) => p.busted || p.frozen || p.stopped);
  }

  /**
   * Reset des SecondChance en fin de manche
   */
  resetSecondChances() {
    this.players.forEach((p) => {
      p.hasSecondChance = false;
      p.actionsInFront = [];
    });
  }
}

module.exports = { Flip7Round };
