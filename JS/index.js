<<<<<<< HEAD
/**
 * index.js - Point d'entrée principal du jeu Flip 7
 * Gère l'interface utilisateur en mode texte et la boucle du jeu
 */

const readline = require("readline");
const { Flip7Round } = require("./game");
const GameLogger = require("./logger");
const { cardToString } = require("./deck");
const fs = require("fs");

// === CODES COULEURS ANSI ===
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",     // Joueur actif
  red: "\x1b[31m",       // Joueur éliminé
  yellow: "\x1b[33m",    // Joueur arrêté
  blue: "\x1b[34m",      // Joueur gelé
  cyan: "\x1b[36m",      // Infos importantes
  magenta: "\x1b[35m",   // Titres
  gray: "\x1b[90m",      // Texte faible
};

/**
 * Affiche le statut d'un joueur avec couleurs
 */
function getPlayerStatus(player) {
  if (player.busted) {
    return `${colors.red}${colors.bright}✗ ${player.name}${colors.reset} (busted)`;
  }
  if (player.frozen) {
    return `${colors.blue}❄ ${player.name}${colors.reset} (gelé)`;
  }
  if (player.stopped) {
    return `${colors.yellow}⏸ ${player.name}${colors.reset} (arrêté)`;
  }
  return `${colors.green}${colors.bright}→ ${player.name}${colors.reset}`;
}

/**
 * Pose une question à l'utilisateur et retourne sa réponse
 */
function askQuestion(rl, text) {
  return new Promise((resolve) => rl.question(text, resolve));
}

/**
 *  Pose une question Oui/Non et force une réponse valide
 * @returns {Promise<boolean>} true = oui, false = non
 */
async function askYesNo(rl, text) {
  while (true) {
    const answer = await askQuestion(rl, text);
    const normalized = answer.trim().toLowerCase();

    if (normalized === "oui" || normalized === "o") return true;
    if (normalized === "non" || normalized === "n") return false;

    console.log(`${colors.red}❌ Réponse invalide. Tapez "oui" ou "non".${colors.reset}\n`);
  }
}

/**
 * Choix de cible interactif parmi une liste.
 * Retourne null si invalide.
 */
async function chooseTarget(rl, title, candidates) {
  console.log(`\n${colors.cyan}${colors.bright}${title}${colors.reset}`);
  candidates.forEach((p, idx) => {
    const extra =
      (p.hasSecondChance ? ` ${colors.gray}[2eCHANCE]${colors.reset}` : "") +
      (p.frozen ? ` ${colors.gray}[gelé]${colors.reset}` : "") +
      (p.busted ? ` ${colors.gray}[busted]${colors.reset}` : "") +
      (p.stopped ? ` ${colors.gray}[arrêté]${colors.reset}` : "");
    console.log(`  ${colors.green}${idx + 1}${colors.reset}. ${p.name} ${colors.gray}(${p.totalScore} pts)${colors.reset}${extra}`);
  });

  const ans = await askQuestion(rl, `\nCible ${colors.gray}(1-${candidates.length})${colors.reset} : `);
  const idx = parseInt(ans) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx >= candidates.length) return null;
  return candidates[idx];
}

/**
 * Résout une carte action en respectant :
 * - "Action peut cibler n'importe quel joueur actif, y compris soi-même"
 * - Règle spéciale "Second Chance" si la cible en a déjà une
 */
async function resolveActionInteractive(rl, round, actingPlayer, actionCard) {
  // Cibles possibles : tous les joueurs actifs (y compris actingPlayer)
  const activePlayers = round.players.filter((p) => p.isActive());

  if (activePlayers.length === 0) {
    round.resolveAction(actionCard, actingPlayer);
    return;
  }

  // 1) choisir la cible de base
  const title = `Carte Action ${colors.bright}${cardToString(actionCard)}${colors.reset} — choisissez une cible :`;
  let target = await chooseTarget(rl, title, activePlayers);

  if (!target) {
    console.log(`${colors.red}❌ Cible invalide${colors.reset}, appliqué à vous-même.`);
    target = actingPlayer;
  }

  // 2) gestion spéciale Second Chance (règle complète)
  if (actionCard.kind === "secondChance" && target.hasSecondChance) {
    const eligible = round.players.filter(
      (p) => p.isActive() && !p.hasSecondChance && p !== target
    );

    if (eligible.length === 0) {
      console.log(`${colors.gray}${target.name} a déjà 2eCHANCE et personne d’éligible → carte défaussée.${colors.reset}`);
      return;
    }

    console.log(`\n${colors.yellow}${target.name} a déjà 2eCHANCE.${colors.reset}`);
    const redirected = await chooseTarget(
      rl,
      "Choisissez un autre joueur actif (sans 2eCHANCE) à qui donner la 2eCHANCE :",
      eligible
    );

    if (!redirected) {
      console.log(`${colors.gray}Choix invalide → carte défaussée.${colors.reset}`);
      return;
    }

    round.resolveAction(actionCard, redirected);
    console.log(`${colors.bright}✓ 2eCHANCE donnée à ${redirected.name}${colors.reset}`);
    return;
  }

  // 3) cas normal
  round.resolveAction(actionCard, target);
  console.log(`${colors.bright}✓ Action sur ${target.name}${colors.reset}`);
}

/**
 * Distribution initiale fidèle aux règles :
 * - Chaque joueur reçoit 1 carte face visible
 * - Si c'est une Action, on interrompt immédiatement pour la résoudre, puis on reprend la distribution
 */
async function dealInitialCardsInteractive(rl, round) {
  console.log("\nNOUVELLE MANCHE (distribution initiale)");

  for (const player of round.players) {
    const card = round.drawForPlayer(player, { initialDeal: true });

    if (!card) {
      console.log(`${colors.red}❌ Plus de cartes pendant la distribution initiale.${colors.reset}`);
      break;
    }

    if (card.type === "action") {
      console.log(`${colors.bright}${player.name} tire : ${cardToString(card)} (Action)${colors.reset}`);
      await resolveActionInteractive(rl, round, player, card);

    } else if (card.type === "number") {
      console.log(`${player.name} vous avez pioché ${cardToString(card)}`);
    }
    // Les modificateurs sont déjà affichés par game.js
  }
}

/**
 * Fonction principale : boucle du jeu
 */
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const logger = new GameLogger();

  // Réinitialise l'historique (efface les manches précédentes)
  logger.data = { games: [] };
  fs.writeFileSync(logger.filename, "{}", "utf8");
  console.log("\n🆕 " + colors.cyan + colors.bright + "NOUVELLE PARTIE" + colors.reset + " (historique effacé)\n");

  const nbStr = await askQuestion(rl, "Nombre de joueurs : ");
  const numPlayers = Math.max(2, parseInt(nbStr) || 2);

  console.log(`\n${colors.magenta}${colors.bright}════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}🎮 FLIP 7 - ${numPlayers} joueurs${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}════════════════════════════${colors.reset}\n`);

  let playerScores = Array(numPlayers).fill(0);

  let manceNum = 1;
  while (true) {
    const round = new Flip7Round(numPlayers, playerScores);

    await dealInitialCardsInteractive(rl, round);

    console.log(`\n${colors.magenta}${colors.bright}╔════════ MANCHE ${manceNum} ════════╗${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${colors.reset} `, round.players.map((p) => getPlayerStatus(p)).join(`  ${colors.magenta}║${colors.reset} `), colors.reset);
    console.log(`${colors.magenta}${colors.bright}╚════════════════════════════════╝${colors.reset}\n`);

    // === BOUCLE DES TOURS ===
    let currentIndex = 0;
    while (!round.isRoundOver()) {
      const player = round.players[currentIndex];

      if (player.isActive()) {
        console.log(`${colors.cyan}${player.name}${colors.reset} ${colors.gray}(${player.totalScore} pts)${colors.reset}`);
        console.log(`Cartes : ${player.handToString()}\n`);

        // Validation stricte oui/non
        const wantsToContinue = await askYesNo(
          rl,
          `Continuer ? ${colors.gray}(oui/non)${colors.reset} : `
        );

        if (!wantsToContinue) {
          player.stopped = true;
          console.log(`${colors.yellow}⏸ ${player.name} s'arrête${colors.reset}\n`);
        } else {
          const card = round.drawForPlayer(player);
          if (!card) {
            console.log(`${colors.red}❌ Plus de cartes - fin de manche${colors.reset}\n`);
            player.stopped = true;
          } else {
            console.log(`${colors.bright}→ Pioche : ${cardToString(card)}${colors.reset}`);

            if (card.type === "action") {
              await resolveActionInteractive(rl, round, player, card);
            }

            console.log(`Cartes : ${player.handToString()}\n`);
          }
        }
      } else {
        const status = player.busted ? "🔴 Busted" : player.frozen ? "🔵 Gelé" : "🟡 Arrêté";
        console.log(`${colors.gray}${status}${colors.reset}\n`);
      }

      currentIndex = (currentIndex + 1) % numPlayers;
    }

    // === FIN DE MANCHE ===
    round.resetSecondChances();

    console.log(`\n${colors.magenta}${colors.bright}╔════════════ RÉSULTATS MANCHE ${manceNum} ════════════╗${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${colors.reset}`);

    const roundScores = new Map();
    for (const p of round.players) {
      const rs = p.computeRoundScore();
      roundScores.set(p, rs);
      p.totalScore += rs;
      p.lastRoundScore = rs;
    }
    playerScores = round.players.map(p => p.totalScore);

    const sortedPlayers = [...round.players].sort((a, b) => roundScores.get(b) - roundScores.get(a));

    let position = 1;
    sortedPlayers.forEach((p) => {
      const roundScore = roundScores.get(p);
      const totalScore = p.totalScore;
      const status = p.busted ? "(busted)" : p.frozen ? "(gelé)" : p.stopped ? "(arrêté)" : "";
      const scoreColor = roundScore > 0 ? colors.green : colors.red;

      const paddedName = p.name.padEnd(12);
      const paddedRound = roundScore.toString().padStart(3);
      const paddedTotal = totalScore.toString().padStart(3);

      console.log(`${colors.magenta}${colors.bright}║${colors.reset} ${position}. ${paddedName} ${scoreColor}${paddedRound}${colors.reset} pts (total: ${colors.cyan}${paddedTotal}${colors.reset}) ${colors.gray}${status}${colors.reset}`);
      position++;
    });

    console.log(`${colors.magenta}${colors.bright}╚${Array(45).fill("═").join("")}╝${colors.reset}\n`);

    logger.saveRound(numPlayers, round.players);

    const reached200 = round.players.some((p) => p.totalScore >= 200);
    if (reached200) {
      const maxScore = Math.max(...round.players.map((p) => p.totalScore));
      const winners = round.players.filter((p) => p.totalScore === maxScore);

      console.log(`${colors.magenta}${colors.bright}╔════════════════════════════════════════════╗${colors.reset}`);

      if (winners.length === 1) {
        const winner = winners[0];
        console.log(`${colors.magenta}${colors.bright}║${colors.reset}${colors.bright}${colors.green} 🏆  ${winner.name.toUpperCase()} GAGNE ! ${colors.reset}${colors.magenta}${colors.bright}║${colors.reset}`);
        console.log(`${colors.magenta}${colors.bright}║${colors.reset}${colors.bright}${colors.green} ${winner.totalScore} pts ${colors.reset}${colors.magenta}${colors.bright}║${colors.reset}`);
      } else {
        console.log(`${colors.magenta}${colors.bright}║${colors.reset}${colors.bright}${colors.green} 🏆  ÉGALITÉ ! ${colors.reset}${colors.magenta}${colors.bright}║${colors.reset}`);
        winners.forEach((w) => {
          console.log(`${colors.magenta}${colors.bright}║${colors.reset}${colors.bright}${colors.green} ${w.name} : ${w.totalScore} pts ${colors.reset}${colors.magenta}${colors.bright}║${colors.reset}`);
        });
      }

      console.log(`${colors.magenta}${colors.bright}╚════════════════════════════════════════════╝${colors.reset}\n`);
      break;
    }

    console.log(`${colors.gray}Nouvelle manche...${colors.reset}\n`);
    manceNum++;
  }

  rl.close();
}

main().catch(console.error);
=======
/**
 * index.js - Point d'entrée principal du jeu Flip 7
 * Gère l'interface utilisateur en mode texte et la boucle du jeu
 */

const readline = require("readline");
const { Flip7Round } = require("./game");
const GameLogger = require("./logger");
const { cardToString } = require("./deck");
const fs = require("fs");

// === CODES COULEURS ANSI ===
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",     // Joueur actif
  red: "\x1b[31m",       // Joueur éliminé
  yellow: "\x1b[33m",    // Joueur arrêté
  blue: "\x1b[34m",      // Joueur gelé
  cyan: "\x1b[36m",      // Infos importantes
  magenta: "\x1b[35m",   // Titres
  gray: "\x1b[90m",      // Texte faible
};

/**
 * Affiche le statut d'un joueur avec couleurs
 */
function getPlayerStatus(player) {
  if (player.busted) {
    return `${colors.red}${colors.bright}✗ ${player.name}${colors.reset} (busted)`;
  }
  if (player.frozen) {
    return `${colors.blue}❄ ${player.name}${colors.reset} (gelé)`;
  }
  if (player.stopped) {
    return `${colors.yellow}⏸ ${player.name}${colors.reset} (arrêté)`;
  }
  return `${colors.green}${colors.bright}→ ${player.name}${colors.reset}`;
}

/**
 * Pose une question à l'utilisateur et retourne sa réponse
 */
function askQuestion(rl, text) {
  return new Promise((resolve) => rl.question(text, resolve));
}

/**
 *  Pose une question Oui/Non et force une réponse valide
 * @returns {Promise<boolean>} true = oui, false = non
 */
async function askYesNo(rl, text) {
  while (true) {
    const answer = await askQuestion(rl, text);
    const normalized = answer.trim().toLowerCase();

    if (normalized === "oui" || normalized === "o") return true;
    if (normalized === "non" || normalized === "n") return false;

    console.log(`${colors.red}❌ Réponse invalide. Tapez "oui" ou "non".${colors.reset}\n`);
  }
}

/**
 * Choix de cible interactif parmi une liste.
 * Retourne null si invalide.
 */
async function chooseTarget(rl, title, candidates) {
  console.log(`\n${colors.cyan}${colors.bright}${title}${colors.reset}`);
  candidates.forEach((p, idx) => {
    const extra =
      (p.hasSecondChance ? ` ${colors.gray}[2eCHANCE]${colors.reset}` : "") +
      (p.frozen ? ` ${colors.gray}[gelé]${colors.reset}` : "") +
      (p.busted ? ` ${colors.gray}[busted]${colors.reset}` : "") +
      (p.stopped ? ` ${colors.gray}[arrêté]${colors.reset}` : "");
    console.log(`  ${colors.green}${idx + 1}${colors.reset}. ${p.name} ${colors.gray}(${p.totalScore} pts)${colors.reset}${extra}`);
  });

  const ans = await askQuestion(rl, `\nCible ${colors.gray}(1-${candidates.length})${colors.reset} : `);
  const idx = parseInt(ans) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx >= candidates.length) return null;
  return candidates[idx];
}

/**
 * Résout une carte action en respectant :
 * - "Action peut cibler n'importe quel joueur actif, y compris soi-même"
 * - Règle spéciale "Second Chance" si la cible en a déjà une
 */
async function resolveActionInteractive(rl, round, actingPlayer, actionCard) {
  // Cibles possibles : tous les joueurs actifs (y compris actingPlayer)
  const activePlayers = round.players.filter((p) => p.isActive());

  if (activePlayers.length === 0) {
    round.resolveAction(actionCard, actingPlayer);
    return;
  }

  // 1) choisir la cible de base
  const title = `Carte Action ${colors.bright}${cardToString(actionCard)}${colors.reset} — choisissez une cible :`;
  let target = await chooseTarget(rl, title, activePlayers);

  if (!target) {
    console.log(`${colors.red}❌ Cible invalide${colors.reset}, appliqué à vous-même.`);
    target = actingPlayer;
  }

  // 2) gestion spéciale Second Chance (règle complète)
  if (actionCard.kind === "secondChance" && target.hasSecondChance) {
    const eligible = round.players.filter(
      (p) => p.isActive() && !p.hasSecondChance && p !== target
    );

    if (eligible.length === 0) {
      console.log(`${colors.gray}${target.name} a déjà 2eCHANCE et personne d’éligible → carte défaussée.${colors.reset}`);
      return;
    }

    console.log(`\n${colors.yellow}${target.name} a déjà 2eCHANCE.${colors.reset}`);
    const redirected = await chooseTarget(
      rl,
      "Choisissez un autre joueur actif (sans 2eCHANCE) à qui donner la 2eCHANCE :",
      eligible
    );

    if (!redirected) {
      console.log(`${colors.gray}Choix invalide → carte défaussée.${colors.reset}`);
      return;
    }

    round.resolveAction(actionCard, redirected);
    console.log(`${colors.bright}✓ 2eCHANCE donnée à ${redirected.name}${colors.reset}`);
    return;
  }

  // 3) cas normal
  round.resolveAction(actionCard, target);
  console.log(`${colors.bright}✓ Action sur ${target.name}${colors.reset}`);
}

/**
 * Distribution initiale fidèle aux règles :
 * - Chaque joueur reçoit 1 carte face visible
 * - Si c'est une Action, on interrompt immédiatement pour la résoudre, puis on reprend la distribution
 */
async function dealInitialCardsInteractive(rl, round) {
  console.log("\nNOUVELLE MANCHE (distribution initiale)");

  for (const player of round.players) {
    const card = round.drawForPlayer(player, { initialDeal: true });

    if (!card) {
      console.log(`${colors.red}❌ Plus de cartes pendant la distribution initiale.${colors.reset}`);
      break;
    }

    if (card.type === "action") {
      console.log(`${colors.bright}${player.name} tire : ${cardToString(card)} (Action)${colors.reset}`);
      await resolveActionInteractive(rl, round, player, card);

    } else if (card.type === "number") {
      console.log(`${player.name} vous avez pioché ${cardToString(card)}`);
    }
    // Les modificateurs sont déjà affichés par game.js
  }
}

/**
 * Fonction principale : boucle du jeu
 */
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const logger = new GameLogger();

  // Réinitialise l'historique (efface les manches précédentes)
  logger.data = { games: [] };
  fs.writeFileSync(logger.filename, "{}", "utf8");
  console.log("\n🆕 " + colors.cyan + colors.bright + "NOUVELLE PARTIE" + colors.reset + " (historique effacé)\n");

  const nbStr = await askQuestion(rl, "Nombre de joueurs : ");
  const numPlayers = Math.max(2, parseInt(nbStr) || 2);

  console.log(`\n${colors.magenta}${colors.bright}════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}🎮 FLIP 7 - ${numPlayers} joueurs${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}════════════════════════════${colors.reset}\n`);

  let playerScores = Array(numPlayers).fill(0);

  let manceNum = 1;
  while (true) {
    const round = new Flip7Round(numPlayers, playerScores);

    await dealInitialCardsInteractive(rl, round);

    console.log(`\n${colors.magenta}${colors.bright}╔════════ MANCHE ${manceNum} ═════════════╗${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${colors.reset} `, round.players.map((p) => getPlayerStatus(p)).join(`  ${colors.magenta}║${colors.reset} `), colors.reset);
    console.log(`${colors.magenta}${colors.bright}╚════════════════════════════════╝${colors.reset}\n`);

    // === BOUCLE DES TOURS ===
    let currentIndex = 0;
    while (!round.isRoundOver()) {
      const player = round.players[currentIndex];

      if (player.isActive()) {
        console.log(`${colors.cyan}${player.name}${colors.reset} ${colors.gray}(${player.totalScore} pts)${colors.reset}`);
        console.log(`Cartes : ${player.handToString()}\n`);

        // Validation stricte oui/non
        const wantsToContinue = await askYesNo(
          rl,
          `Continuer ? ${colors.gray}(oui/non)${colors.reset} : `
        );

        if (!wantsToContinue) {
          player.stopped = true;
          console.log(`${colors.yellow}⏸ ${player.name} s'arrête${colors.reset}\n`);
        } else {
          const card = round.drawForPlayer(player);
          if (!card) {
            console.log(`${colors.red}❌ Plus de cartes - fin de manche${colors.reset}\n`);
            player.stopped = true;
          } else {
            console.log(`${colors.bright}→ Pioche : ${cardToString(card)}${colors.reset}`);

            if (card.type === "action") {
              await resolveActionInteractive(rl, round, player, card);
            }

            console.log(`Cartes : ${player.handToString()}\n`);
          }
        }
      } else {
        const status = player.busted ? "🔴 Busted" : player.frozen ? "🔵 Gelé" : "🟡 Arrêté";
        console.log(`${colors.gray}${status}${colors.reset}\n`);
      }

      currentIndex = (currentIndex + 1) % numPlayers;
    }

    // === FIN DE MANCHE ===
    round.resetSecondChances();

    console.log(`\n${colors.magenta}${colors.bright}╔════════════ RÉSULTATS MANCHE ${manceNum} ════════════╗${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${colors.reset}`);

    const roundScores = new Map();
    for (const p of round.players) {
      const rs = p.computeRoundScore();
      roundScores.set(p, rs);
      p.totalScore += rs;
      p.lastRoundScore = rs;
    }
    playerScores = round.players.map(p => p.totalScore);

    const sortedPlayers = [...round.players].sort((a, b) => roundScores.get(b) - roundScores.get(a));

    let position = 1;
    sortedPlayers.forEach((p) => {
      const roundScore = roundScores.get(p);
      const totalScore = p.totalScore;
      const status = p.busted ? "(busted)" : p.frozen ? "(gelé)" : p.stopped ? "(arrêté)" : "";
      const scoreColor = roundScore > 0 ? colors.green : colors.red;

      const paddedName = p.name.padEnd(12);
      const paddedRound = roundScore.toString().padStart(3);
      const paddedTotal = totalScore.toString().padStart(3);

      console.log(`${colors.magenta}${colors.bright}║${colors.reset} ${position}. ${paddedName} ${scoreColor}${paddedRound}${colors.reset} pts (total: ${colors.cyan}${paddedTotal}${colors.reset}) ${colors.gray}${status}${colors.reset}`);
      position++;
    });

    console.log(`${colors.magenta}${colors.bright}╚${Array(45).fill("═").join("")}╝${colors.reset}\n`);

    logger.saveRound(numPlayers, round.players);

    const reached200 = round.players.some((p) => p.totalScore >= 200);
    if (reached200) {
      const maxScore = Math.max(...round.players.map((p) => p.totalScore));
      const winners = round.players.filter((p) => p.totalScore === maxScore);

      console.log(`${colors.magenta}${colors.bright}╔════════════════════════════════════════════╗${colors.reset}`);

      if (winners.length === 1) {
        const winner = winners[0];
        console.log(`${colors.magenta}${colors.bright}║${colors.reset}${colors.bright}${colors.green} 🏆  ${winner.name.toUpperCase()} GAGNE ! ${colors.reset}${colors.magenta}${colors.bright}║${colors.reset}`);
        console.log(`${colors.magenta}${colors.bright}║${colors.reset}${colors.bright}${colors.green} ${winner.totalScore} pts ${colors.reset}${colors.magenta}${colors.bright}║${colors.reset}`);
      } else {
        console.log(`${colors.magenta}${colors.bright}║${colors.reset}${colors.bright}${colors.green} 🏆  ÉGALITÉ ! ${colors.reset}${colors.magenta}${colors.bright}║${colors.reset}`);
        winners.forEach((w) => {
          console.log(`${colors.magenta}${colors.bright}║${colors.reset}${colors.bright}${colors.green} ${w.name} : ${w.totalScore} pts ${colors.reset}${colors.magenta}${colors.bright}║${colors.reset}`);
        });
      }

      console.log(`${colors.magenta}${colors.bright}╚════════════════════════════════════════════╝${colors.reset}\n`);
      break;
    }

    console.log(`${colors.gray}Nouvelle manche...${colors.reset}\n`);
    manceNum++;
  }

  rl.close();
}

main().catch(console.error);
>>>>>>> refs/remotes/origin/main
