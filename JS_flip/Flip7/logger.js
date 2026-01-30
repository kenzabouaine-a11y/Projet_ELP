/**
 * logger.js - Système de journalisation des parties
 * Sauvegarde l'historique de chaque manche dans games.json
 */

const fs = require("fs");

/**
 * Classe GameLogger : gère la sauvegarde et le chargement de l'historique
 * Persiste les résultats de chaque manche dans un fichier JSON
 */
class GameLogger {
  /**
   * Constructeur du logger
   * @param {string} filename - Chemin du fichier d'historique (défaut: "games.json")
   */
  constructor(filename = "games.json") {
    this.filename = filename;
    this.data = { games: [] };
    this.load(); // Charge l'historique existant ou crée un nouveau
  }

  /**
   * Charge l'historique depuis le fichier
   * Si le fichier n'existe pas ou est invalide, démarre avec un historique vide
   * (Ne lance pas d'erreur, affiche juste un message)
   */
  load() {
    try {
      const content = fs.readFileSync(this.filename, "utf8");
      this.data = JSON.parse(content);
    } catch (err) {
      // Fichier manquant ou JSON invalide → démarre avec historique vide
      console.log("📁 Nouveau fichier games.json");
    }
  }

  /**
   * Sauvegarde une manche complétée dans l'historique
   * 
   * Données sauvegardées par manche :
   * - ID de la manche
   * - Date et heure
   * - Nombre de joueurs
   * - État final de chaque joueur (cartes, scores, états)
   * 
   * @param {number} numPlayers - Nombre de joueurs
   * @param {Array<PlayerState>} players - Les joueurs avec leur état final
   */
  saveRound(numPlayers, players) {
    // ID = numéro séquentiel basé sur le nombre de manches précédentes
    const gameId = this.data.games.length + 1;
    
    // Prépare les données de la manche
    const roundData = {
      id: gameId,
      date: new Date().toISOString(), // Format ISO 8601 pour la date/heure
      numPlayers,
      // Extrait les informations pertinentes de chaque joueur
      players: players.map((p) => ({
        name: p.name,
        // Sauvegarde uniquement la structure des cartes (pas les objets complets)
        numberCards: p.numberCards.map((c) => ({ type: "number", value: c.value })),
        modifiers: p.modifiers.map((m) => ({ type: "modifier", kind: m.kind })),
        // État du joueur
        busted: p.busted,      // Éliminé (doublon sans protection)
        frozen: p.frozen,      // Gelé (Freeze)
        stopped: p.stopped,    // Arrêté volontairement
        // Scores
        roundScore: p.computeRoundScore(), // Score de cette manche
        totalScore: p.totalScore            // Score cumulé jusqu'à présent
      }))
    };

    // Ajoute la manche à l'historique
    this.data.games.push(roundData);
    
    // Sauvegarde dans le fichier (formaté avec indentation pour lisibilité)
    fs.writeFileSync(this.filename, JSON.stringify(this.data, null, 2), "utf8");
    console.log(`📝 Manche ${gameId} sauvée (${this.filename})`);
  }
}

module.exports = GameLogger;
