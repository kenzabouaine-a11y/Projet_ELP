// IA très simple : cherche le plus petit coup possible qui bat la combinaison précédente.
// Si ce n’est pas possible, joue la plus petite carte ou passe.

// Génère tous les sous-ensembles possibles de la main (pour explorer les combinaisons).
function allSubsets(cards) {
  const res = [];
  const n = cards.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const subset = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(cards[i]);
    }
    res.push(subset);
  }
  return res;
}

// Cherche parmi tous les sous-ensembles celui qui bat le mieux le coup précédent.
function chooseBeat(prevCards, hand) {
  const prev = classify(prevCards);
  if (!prev || prev.type === HandType.PASS) return null;
  const candidates = [];
  allSubsets(hand).forEach((subset) => {
    const next = classify(subset);
    if (next && canBeat(prev, next)) {
      candidates.push({ subset, next });
    }
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.next.main - b.next.main || a.subset.length - b.subset.length);
  return candidates[0].subset;
}

// Retourne la plus petite carte seule de la main (fallback).
function minSingle(hand) {
  if (!hand.length) return null;
  let best = hand[0];
  for (let i = 1; i < hand.length; i++) {
    if (cardValue(hand[i]) < cardValue(best)) best = hand[i];
  }
  return [best];
}

// Petite utilitaire pour simuler un temps de réflexion asynchrone.
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Choisit le coup de l’IA pour un tour donné (éventuellement passe).
async function aiChoosePlay(prevCards, hand, turnIndex) {
  const delay = 500 + (turnIndex % 3) * 200;
  await sleep(delay);
  let choice = chooseBeat(prevCards, hand);
  if (!prevCards || !prevCards.length) {
    const straight = tryStraight(hand);
    if (straight) choice = straight;
  }
  if (!choice) {
    const single = minSingle(hand);
    return { cards: single, pass: !single };
  }
  return { cards: choice, pass: false };
}

// Essaie de trouver une suite simple raisonnablement longue dans la main.
function tryStraight(hand) {
  if (hand.length < 5) return null;
  const sorted = hand.slice().sort((a, b) => cardValue(a) - cardValue(b));
  const seq = [sorted[0]];
  const res = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cardValue(cur) === cardValue(prev) + 1 && cardValue(cur) < 15) {
      seq.push(cur);
    } else if (cardValue(cur) === cardValue(prev)) {
      continue;
    } else {
      if (seq.length >= 5) res.push(seq.slice());
      seq.length = 0;
      seq.push(cur);
    }
  }
  if (seq.length >= 5) res.push(seq);
  if (!res.length) return null;
  res.sort(
    (a, b) =>
      cardValue(a[0]) - cardValue(b[0]) ||
      a.length - b.length
  );
  return res[0];
}

