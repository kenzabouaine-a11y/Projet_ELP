// Logique du paquet et de la distribution des cartes.
// Ce fichier ne gère que les valeurs et la répartition initiale.

const SUITS = ["♠", "♥", "♣", "♦"];
const RANKS = [
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
  "2",
];

// Crée un paquet complet de 54 cartes (3–A, 2 + deux jokers).
function buildDeck() {
  const deck = [];
  RANKS.forEach((rank) => {
    SUITS.forEach((suit) => {
      deck.push({ rank, suit });
    });
  });
  deck.push({ rank: "SJ", suit: "" }); // Small Joker
  deck.push({ rank: "BJ", suit: "" }); // Big Joker
  return deck;
}

// Convertit une carte en valeur numérique pour comparer les forces.
function cardValue(card) {
  if (card.rank === "SJ") return 16;
  if (card.rank === "BJ") return 17;
  return RANKS.indexOf(card.rank) + 3;
}

// Mélange le paquet avec l’algorithme de Fisher–Yates.
function shuffle(deck, rng = Math.random) {
  const arr = deck.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Distribue les cartes entre les 3 joueurs + les 3 cartes de la pioche (terrain du donneur).
function deal(shuffled) {
  const p0 = [];
  const p1 = [];
  const p2 = [];
  for (let i = 0; i < 51; i++) {
    const card = shuffled[i];
    if (i % 3 === 0) p0.push(card);
    else if (i % 3 === 1) p1.push(card);
    else p2.push(card);
  }
  const lord = shuffled.slice(51);
  const sortByValue = (a, b) => cardValue(a) - cardValue(b);
  return {
    hands: [p0.sort(sortByValue), p1.sort(sortByValue), p2.sort(sortByValue)],
    lord,
  };
}

