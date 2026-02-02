// Règles simplifiées : détection de combinaisons et comparaison des coups.

const HandType = {
  PASS: "PASS",
  SINGLE: "SINGLE",
  PAIR: "PAIR",
  TRIPLE: "TRIPLE",
  TRIPLE_SINGLE: "TRIPLE_SINGLE", // brelan + une carte
  PLANE: "PLANE", // suite de brelans (avion sans ailes)
  BOMB: "BOMB",
  STRAIGHT: "STRAIGHT",
  DOUBLE_STRAIGHT: "DOUBLE_STRAIGHT", // suite de doubles
};

// Compte le nombre de cartes par valeur (rank -> count).
function countByRank(cards) {
  const map = new Map();
  cards.forEach((c) => {
    map.set(c.rank, (map.get(c.rank) || 0) + 1);
  });
  return map;
}

// Transforme un ensemble de cartes en liste de valeurs triées.
function sortedVals(cards) {
  return cards.map(cardValue).sort((a, b) => a - b);
}

// Suite simple : chaque valeur apparaît une fois, longueur >= 5, sans 2 ni joker.
function isStraight(cards) {
  if (cards.length < 5) return false;
  const vals = sortedVals(cards);
  if (vals[vals.length - 1] >= cardValue({ rank: "2" })) return false;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] !== vals[i - 1] + 1) return false;
  }
  return true;
}

// Suite de doubles : par ex. 334455, longueur >= 6 et paire à chaque rang, sans 2 ni joker.
function isDoubleStraight(map, totalSize) {
  if (totalSize < 6 || totalSize % 2 !== 0) return false;
  const ranks = [...map.keys()];
  if (ranks.length * 2 !== totalSize) return false;
  const vals = ranks
    .map((r) => cardValue({ rank: r }))
    .sort((a, b) => a - b);
  if (vals[vals.length - 1] >= cardValue({ rank: "2" })) return false;
  for (const count of map.values()) {
    if (count !== 2) return false;
  }
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] !== vals[i - 1] + 1) return false;
  }
  return true;
}

// Avion « nu » : uniquement des brelans consécutifs, par ex. 333444 ou 555666777.
function isPlane(map, totalSize) {
  if (totalSize < 6 || totalSize % 3 !== 0) return false;
  const triples = [];
  for (const [rank, count] of map.entries()) {
    if (count === 3) {
      triples.push(cardValue({ rank }));
    } else {
      return false;
    }
  }
  if (triples.length * 3 !== totalSize) return false;
  triples.sort((a, b) => a - b);
  if (triples[triples.length - 1] >= cardValue({ rank: "2" })) return false;
  for (let i = 1; i < triples.length; i++) {
    if (triples[i] !== triples[i - 1] + 1) return false;
  }
  return { start: triples[0], length: totalSize };
}

// Classe une liste de cartes en un type de combinaison (ou null si non supportée).
function classify(cards) {
  if (!cards || cards.length === 0) return { type: HandType.PASS };
  const map = countByRank(cards);
  const size = cards.length;
  if (size === 1) return { type: HandType.SINGLE, main: cardValue(cards[0]) };
  if (size === 2) {
    const ranks = [...map.keys()];
    if (ranks.length === 1) return { type: HandType.PAIR, main: cardValue(cards[0]) };
    if (ranks.includes("SJ") && ranks.includes("BJ"))
      return { type: HandType.BOMB, main: 999 };
  }
  if (size === 3 && map.size === 1)
    return { type: HandType.TRIPLE, main: cardValue(cards[0]) };
  if (size === 4) {
    if (map.size === 1) {
      return { type: HandType.BOMB, main: cardValue(cards[0]) };
    }
    // Brelan + une carte isolée.
    if (map.size === 2) {
      for (const [rank, count] of map.entries()) {
        if (count === 3) {
          return {
            type: HandType.TRIPLE_SINGLE,
            main: cardValue({ rank }),
            length: 4,
          };
        }
      }
    }
  }
  if (isDoubleStraight(map, size)) {
    const ranks = [...map.keys()];
    const start = ranks
      .map((r) => cardValue({ rank: r }))
      .sort((a, b) => a - b)[0];
    return {
      type: HandType.DOUBLE_STRAIGHT,
      main: start,
      length: size,
    };
  }
  const plane = isPlane(map, size);
  if (plane)
    return {
      type: HandType.PLANE,
      main: plane.start,
      length: plane.length,
    };
  if (isStraight(cards))
    return { type: HandType.STRAIGHT, main: sortedVals(cards)[0], length: cards.length };
  return null;
}

// Indique si une combinaison peut légalement battre une autre.
function canBeat(prev, next) {
  if (!next || next.type === HandType.PASS) return false;
  if (!prev || prev.type === HandType.PASS) return true;
  if (next.type === HandType.BOMB && prev.type !== HandType.BOMB) return true;
  if (prev.type === HandType.BOMB && next.type !== HandType.BOMB) return false;
  if (prev.type !== next.type) return false;
  if (
    (prev.type === HandType.STRAIGHT ||
      prev.type === HandType.DOUBLE_STRAIGHT ||
      prev.type === HandType.PLANE) &&
    prev.length !== next.length
  )
    return false;
  return next.main > prev.main;
}

// Valide un coup par rapport au coup précédent et renvoie un objet { ok, reason/info }.
function isValidPlay(prevHandCards, nextCards) {
  const prev = classify(prevHandCards);
  const next = classify(nextCards);
  if (!next) return { ok: false, reason: "Combinaison non supportée" };
  if (next.type === HandType.PASS)
    return { ok: prev && prev.type !== HandType.PASS, reason: "" };
  if (!prev || prev.type === HandType.PASS) return { ok: true, info: next };
  if (!canBeat(prev, next)) return { ok: false, reason: "Le coup doit être plus fort que le précédent" };
  return { ok: true, info: next };
}

