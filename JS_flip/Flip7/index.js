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
 * @param {PlayerState} player - Joueur à afficher
 * @returns {string} Chaîne formatée avec couleurs
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
 * Fonction utilitaire Promise-basée pour readline
 * 
 * @param {readline.Interface} rl - Interface readline
 * @param {string} text - Question à afficher
 * @returns {Promise<string>} Réponse de l'utilisateur
 */
function askQuestion(rl, text) {
  return new Promise((resolve) => rl.question(text, resolve));
}

/**
 * Fonction principale : boucle du jeu
 * 
 * Flux :
 * 1. Initialisation (nombre de joueurs, historique)
 * 2. Boucle des manches jusqu'à un gagnant (200+ pts)
 * 3. Pour chaque manche :
 *    a. Distribution initiale
 *    b. Tours de jeu jusqu'à fin de manche
 *    c. Calcul des scores
 *    d. Sauvegarde
 *    e. Vérification du gagnant
 */
async function main() {
  // === INITIALISATION ===
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const logger = new GameLogger();
  
  // Réinitialise l'historique (efface les manches précédentes)
  logger.data = { games: [] };
  fs.writeFileSync(logger.filename, "{}", "utf8");
  console.log("\n🆕 " + colors.cyan + colors.bright + "NOUVELLE PARTIE" + colors.reset + " (historique effacé)\n");

  // Demande le nombre de joueurs (minimum 2)
  const nbStr = await askQuestion(rl, "Nombre de joueurs : ");
  const numPlayers = Math.max(2, parseInt(nbStr) || 2);
  console.log(`\n${colors.magenta}${colors.bright}════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}🎮 FLIP 7 - ${numPlayers} joueurs${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}════════════════════════════${colors.reset}\n`);

  // Initialise les scores à 0 pour tous les joueurs
  const playerScores = Array(numPlayers).fill(0);

  // === BOUCLE DES MANCHES ===
  let manceNum = 1;
  while (true) {
    // Crée une nouvelle manche avec les scores accumulés
    const round = new Flip7Round(numPlayers, playerScores);
    round.dealInitialCards();
    
    // Affiche le début de la manche
    console.log(`\n${colors.magenta}${colors.bright}╔════════ MANCHE ${manceNum} ════════╗${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${colors.reset} `, round.players.map((p) => getPlayerStatus(p)).join(`  ${colors.magenta}║${colors.reset} `), colors.reset);
    console.log(`${colors.magenta}${colors.bright}╚════════════════════════════════╝${colors.reset}\n`);

    // === BOUCLE DES TOURS ===
    let currentIndex = 0;
    while (!round.isRoundOver()) {
      const player = round.players[currentIndex];
      
      // Joue seulement si le joueur est actif (pas busted, gelé ou arrêté)
      if (player.isActive()) {
        // Affiche l'état du joueur et ses cartes
        console.log(`${colors.cyan}${player.name}${colors.reset} ${colors.gray}(${player.totalScore} pts)${colors.reset}`);
        console.log(`Cartes : ${player.handToString()}\n`);
        
        // Demande au joueur s'il veut piocher
        const answer = await askQuestion(rl, `Continuer ? ${colors.gray}(oui/non)${colors.reset} : `);
        const normalized = answer.trim().toLowerCase();

        if (normalized === "non" || normalized === "n") {
          // Le joueur s'arrête volontairement (continue de la manche suivante)
          player.stopped = true;
          console.log(`${colors.yellow}⏸ ${player.name} s'arrête${colors.reset}\n`);
        } else {
          // Le joueur pioche une carte
          const card = round.drawForPlayer(player);
          if (!card) {
            // Paquet vide = fin de manche
            console.log(`${colors.red}❌ Plus de cartes - fin de manche${colors.reset}\n`);
            player.stopped = true;
          } else {
            // Affiche la carte piochée
            console.log(`${colors.bright}→ Pioche : ${cardToString(card)}${colors.reset}`);
            
            // Si c'est une action, demande la cible (page 2 - règles)
            if (card.type === "action") {
              const activePlayers = round.players.filter((p) => p.isActive() && p !== player);
              
              if (activePlayers.length > 0) {
                // Affiche les joueurs actifs disponibles
                console.log(`\n${colors.cyan}${colors.bright}Joueurs actifs :${colors.reset}`);
                activePlayers.forEach((p, idx) => {
                  console.log(`  ${colors.green}${idx + 1}${colors.reset}. ${p.name} ${colors.gray}(${p.totalScore} pts)${colors.reset}`);
                });
                
                // Demande la cible
                const targetAnswer = await askQuestion(rl, `\nCible ${colors.gray}(1-${activePlayers.length})${colors.reset} : `);
                const targetIdx = parseInt(targetAnswer) - 1;
                
                if (targetIdx >= 0 && targetIdx < activePlayers.length) {
                  const target = activePlayers[targetIdx];
                  // Applique l'action à la cible
                  round.resolveAction(card, target);
                  console.log(`${colors.bright}✓ Action sur ${target.name}${colors.reset}`);
                } else {
                  console.log(`${colors.red}❌ Cible invalide${colors.reset}, appliqué à vous-même.`);
                  round.resolveAction(card, player);
                }
              } else {
                console.log(`${colors.gray}(aucun autre joueur actif)${colors.reset}`);
                round.resolveAction(card, player);
              }
            }
            
            console.log(`Cartes : ${player.handToString()}\n`);
          }
        }
      } else {
        // Joueur inactif
        const status = player.busted ? "🔴 Busted" : player.frozen ? "🔵 Gelé" : "🟡 Arrêté";
        console.log(`${colors.gray}${status}${colors.reset}\n`);
      }
      
      // Passe au joueur suivant (tour circulaire)
      currentIndex = (currentIndex + 1) % numPlayers;
    }

    // === FIN DE MANCHE ===
    round.resetSecondChances();
    
    // Crée et affiche un tableau récapitulatif
    console.log(`\n${colors.magenta}${colors.bright}╔════════════ RÉSULTATS MANCHE ${manceNum} ════════════╗${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${colors.reset}`);
    
    const sortedPlayers = [...round.players].sort((a, b) => b.computeRoundScore() - a.computeRoundScore());
    let position = 1;
    sortedPlayers.forEach((p) => {
      const roundScore = p.computeRoundScore();
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

    // Sauvegarde la manche dans l'historique
    logger.saveRound(numPlayers, round.players);

    // === VÉRIFICATION DU GAGNANT ===
    const winner = round.players.find((p) => p.totalScore >= 200);
    if (winner) {
      console.log(`${colors.magenta}${colors.bright}╔════════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.magenta}${colors.bright}║${colors.reset}${colors.bright}${colors.green} 🏆  ${winner.name.toUpperCase()} GAGNE ! ${colors.reset}${colors.magenta}${colors.bright}║${colors.reset}`);
      console.log(`${colors.magenta}${colors.bright}║${colors.reset}${colors.bright}${colors.green} ${winner.totalScore} pts ${colors.reset}${colors.magenta}${colors.bright}║${colors.reset}`);
      console.log(`${colors.magenta}${colors.bright}╚════════════════════════════════════════════╝${colors.reset}\n`);
      break; // Sort de la boucle des manches
    }
    
    // Lance une nouvelle manche
    console.log(`${colors.gray}Nouvelle manche...${colors.reset}\n`);
    manceNum++;
  }

  rl.close();
}

// Lance le programme
main().catch(console.error);
