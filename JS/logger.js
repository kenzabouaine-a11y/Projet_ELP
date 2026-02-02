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
   */
  load() {
    try {
      const content = fs.readFileSync(this.filename, "utf8");
      this.data = JSON.parse(content);
    } catch (err) {
      console.log("📁 Nouveau fichier games.json");
      this.data = { games: [] };
    }
  }

  /**
   * Sauvegarde une manche complétée dans l'historique
   *
   * @param {number} numPlayers - Nombre de joueurs
   * @param {Array<PlayerState>} players - Les joueurs avec leur état final
   */
  saveRound(numPlayers, players) {
    const gameId = this.data.games.length + 1;

    const roundData = {
      id: gameId,
      date: new Date().toISOString(),
      numPlayers,
      players: players.map((p) => ({
        name: p.name,

        // Cartes
        numberCards: p.numberCards.map((c) => ({
          type: "number",
          value: c.value,
        })),
        modifiers: p.modifiers.map((m) => ({
          type: "modifier",
          kind: m.kind,
        })),

        // États
        busted: p.busted,
        frozen: p.frozen,
        stopped: p.stopped,

        // Scores
        
        roundScore:
          typeof p.lastRoundScore === "number"
            ? p.lastRoundScore
            : p.computeRoundScore(),

        totalScore: p.totalScore,
      })),
    };

    this.data.games.push(roundData);

    fs.writeFileSync(
      this.filename,
      JSON.stringify(this.data, null, 2),
      "utf8"
    );

    console.log(`📝 Manche ${gameId} sauvée (${this.filename})`);
  }
}

module.exports = GameLogger;
