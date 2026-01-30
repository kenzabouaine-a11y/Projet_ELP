/**
 * deck.js - Gestion du paquet de cartes Flip 7
 * Contient la création, le mélange et le tirage des cartes
 */

/**
 * Crée un paquet complet Flip 7 avec tous les types de cartes
 * 
 * Composition du paquet :
 * - Cartes nombres (valeurs 0-12) : 1x0 + 1x1 + 2x2 + ... + 12x12 = 79 cartes
 * - Modificateurs : +2 (2x), +4 (2x), +6 (2x), +8 (1x), +10 (1x), x2 (2x) = 10 cartes
 * - Actions spéciales : Freeze (3x), FlipThree (2x), SecondChance (2x) = 7 cartes
 * 
 * Total : 96 cartes
 * 
 * @returns {Array<Card>} Le paquet non mélangé
 */
function createDeck() {
  const deck = [];

  // === CARTES NOMBRES ===
  // Composition : 1x0, 1x1, 2x2, 3x3, ..., 12x12
  // Logique : chaque valeur N a exactement N copies (sauf 0 qui a 1 copie)
  deck.push({ type: "number", value: 0 });
  for (let value = 1; value <= 12; value++) {
    for (let i = 0; i < value; i++) {
      deck.push({ type: "number", value });
    }
  }

  // === MODIFICATEURS DE SCORE ===
  // Appliqués au calcul final du score (ajout ou multiplication)
  const modifiers = [
    { kind: "plus2" }, { kind: "plus2" },     // +2 points (2 copies)
    { kind: "plus4" }, { kind: "plus4" },     // +4 points (2 copies)
    { kind: "plus6" }, { kind: "plus6" },     // +6 points (2 copies)
    { kind: "plus8" },                        // +8 points (1 copie)
    { kind: "plus10" },                       // +10 points (1 copie)
    { kind: "x2" }, { kind: "x2" }            // ×2 le score (2 copies)
  ];
  modifiers.forEach((m) => deck.push({ type: "modifier", ...m }));

  // === ACTIONS SPÉCIALES ===
  // Ont des effets immédiats lors du tirage
  const actions = [
    { kind: "freeze" }, { kind: "freeze" }, { kind: "freeze" },  // Gèle le joueur (3 copies)
    { kind: "flipThree" }, { kind: "flipThree" },                  // Piocher 3 cartes bonus (2 copies)
    { kind: "secondChance" }, { kind: "secondChance" }             // Protection 1 doublon (2 copies)
  ];
  actions.forEach((a) => deck.push({ type: "action", ...a }));

  return deck;
}

/**
 * Mélange le paquet en place avec l'algorithme Fisher-Yates
 * 
 * @param {Array<Card>} deck - Le paquet à mélanger
 * @returns {Array<Card>} Le paquet mélangé (modifié en place)
 */
function shuffleDeck(deck) {
  // Algorithme de mélange Fisher-Yates : O(n)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Échange la carte i avec la carte j (aléatoire jusqu'à i)
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Tire une carte du sommet du paquet (et la retire du paquet)
 * 
 * @param {Array<Card>} deck - Le paquet dont tirer
 * @returns {Card|null} La carte tirée, ou null si le paquet est vide
 */
function drawCard(deck) {
  return deck.length > 0 ? deck.shift() : null;
}

/**
 * Convertit une carte en représentation textuelle lisible
 * Utilisé pour l'affichage dans le terminal
 * 
 * Format :
 * - Nombres : "0", "5", "12"
 * - Modificateurs : "+2", "+4", "x2"
 * - Actions : "GEL", "TROIS!", "2eCHANCE"
 * 
 * @param {Card} card - La carte à convertir
 * @returns {string} Représentation textuelle de la carte
 */
function cardToString(card) {
  // Affiche simplement la valeur pour les nombres
  if (card.type === "number") return String(card.value);
  
  // Affiche le symbole pour les modificateurs
  if (card.type === "modifier") {
    switch (card.kind) {
      case "plus2": return "+2";
      case "plus4": return "+4";
      case "plus6": return "+6";
      case "plus8": return "+8";
      case "plus10": return "+10";
      case "x2": return "x2";
    }
  }
  
  // Affiche le nom pour les actions spéciales
  if (card.type === "action") {
    switch (card.kind) {
      case "freeze": return "GEL";
      case "flipThree": return "TROIS!";
      case "secondChance": return "2eCHANCE";
    }
  }
  
  return "?"; // Fallback en cas de type inconnu
}

module.exports = { createDeck, shuffleDeck, drawCard, cardToString };
