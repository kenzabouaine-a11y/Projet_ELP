// Logique principale du jeu : état global, rendu, événements et intégration de l’IA.

let state = null;

let leaderboard = [];

// Initialise une nouvelle manche : mélange, distribution et attribution du donneur.
function initState() {
  const deck = shuffle(buildDeck());
  const { hands, lord } = deal(deck);
  const landlordIndex = 0;
  hands[landlordIndex].push(...lord);
  hands[landlordIndex].sort((a, b) => cardValue(a) - cardValue(b));
  state = {
    hands,
    landlordIndex,
    lord,
    currentTurn: landlordIndex,
    lastPlayCards: [],
    lastPlayer: null,
    selectedIndexes: new Set(),
    finished: false,
  };
}

// Charge le classement depuis localStorage ou initialise avec des données fictives.
function loadLeaderboard() {
  try {
    const raw = localStorage.getItem("ddz_leaderboard");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Migration : remplace les anciens noms chinois par les versions françaises.
        leaderboard = parsed.map((entry) => {
          if (entry && entry.name === "你") {
            return { ...entry, name: "Vous" };
          }
          return entry;
        });
      }
    }
  } catch (_) {}
  if (!leaderboard.length) {
    leaderboard = [
      { name: "Vous", wins: 0 },
      { name: "Jean-Claude le Flambeur", wins: 7 },
      { name: "Patrick Bruel", wins: 5 },
      { name: "Antoine Saout", wins: 3 },
      { name: "Bob le Tavernier", wins: 2 },
      { name: "Noob_42", wins: 0 },
    ];
  }
}

// Sauvegarde le classement actuel dans localStorage.
function saveLeaderboard() {
  try {
    localStorage.setItem("ddz_leaderboard", JSON.stringify(leaderboard));
  } catch (_) {}
}

// Met à jour l’affichage du tableau de classement dans la modale.
function renderLeaderboard() {
  const body = el("board-body");
  if (!body) return;
  body.innerHTML = "";
  const sorted = leaderboard
    .slice()
    .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name))
    .slice(0, 7);
  sorted.forEach((entry, idx) => {
    const tr = document.createElement("tr");
    const rankTd = document.createElement("td");
    const nameTd = document.createElement("td");
    const winsTd = document.createElement("td");
    rankTd.textContent = String(idx + 1);
    nameTd.textContent = entry.name;
    winsTd.textContent = String(entry.wins);
    if (entry.name === "Vous") {
      tr.classList.add("me");
    }
    tr.append(rankTd, nameTd, winsTd);
    body.appendChild(tr);
  });
}

// Incrémente le nombre de victoires de l’utilisateur ("Vous").
function addWinForYou() {
  let you = leaderboard.find((e) => e.name === "Vous");
  if (!you) {
    you = { name: "Vous", wins: 0 };
    leaderboard.push(you);
  }
  you.wins += 1;
  saveLeaderboard();
  renderLeaderboard();
}

// Raccourci pour récupérer un élément du DOM par id.
function el(id) {
  return document.getElementById(id);
}

// Affiche le rôle de chaque joueur (donneur ou fermier).
function renderRoles() {
  [0, 1, 2].forEach((i) => {
    const roleEl = el(`p${i}-role`);
    if (!roleEl) return;
    const isLandlord = i === state.landlordIndex;
    roleEl.textContent = isLandlord ? "Donneur" : "Fermier";
    roleEl.className = "player-role-badge " + (isLandlord ? "landlord" : "farmer");
  });
}

// Affiche les 3 cartes du donneur (pioche supplémentaire).
function renderLordCards() {
  const wrap = el("lord-cards");
  wrap.innerHTML = "";
  state.lord.forEach((card) => {
    wrap.appendChild(createCardEl(card, true));
  });
}

// Construit un élément DOM représentant une carte (taille normale ou réduite).
function createCardEl(card, small = false, selectableIndex = null) {
  const div = document.createElement("div");
  div.className = "card" + (small ? " small" : "");
  const rank = document.createElement("div");
  rank.className = "card-rank";
  const suit = document.createElement("div");
  suit.className = "card-suit";
  const foot = document.createElement("div");
  foot.className = "card-footer";
  if (card.rank === "SJ" || card.rank === "BJ") {
    rank.textContent = card.rank === "SJ" ? "Joker rouge" : "Joker noir";
    suit.textContent = "";
    div.classList.add(card.rank === "SJ" ? "red" : "black");
    foot.textContent = "JOKER";
  } else {
    rank.textContent = card.rank;
    suit.textContent = card.suit;
    const isRed = card.suit === "♥" || card.suit === "♦";
    div.classList.add(isRed ? "red" : "black");
    foot.textContent = card.suit + " " + card.rank;
  }
  div.append(rank, suit, foot);
  if (selectableIndex != null) {
    if (state.selectedIndexes.has(selectableIndex)) div.classList.add("selected");
    div.addEventListener("click", () => {
      if (state.finished || state.currentTurn !== 0) return;
      if (state.selectedIndexes.has(selectableIndex))
        state.selectedIndexes.delete(selectableIndex);
      else state.selectedIndexes.add(selectableIndex);
      renderHand();
    });
  }
  return div;
}

// Affiche la main du joueur humain et le nombre de cartes restantes chez les IA.
function renderHand() {
  const wrap = el("p0-hand");
  wrap.innerHTML = "";
  const hand = state.hands[0];
  hand.forEach((card, idx) => {
    wrap.appendChild(createCardEl(card, false, idx));
  });
  el("p1-hand").textContent = `${state.hands[1].length} cartes`;
  el("p2-hand").textContent = `${state.hands[2].length} cartes`;
}

// Met à jour la zone centrale qui affiche le dernier coup joué.
function renderLastPlay() {
  const meta = el("last-meta");
  const area = el("last-cards");
  area.innerHTML = "";
  if (!state.lastPlayCards || !state.lastPlayCards.length) {
    meta.textContent = "Aucun pli sur la table pour l’instant.";
    return;
  }
  const name =
    state.lastPlayer === 0 ? "Vous" : state.lastPlayer === 1 ? "Joueur du haut" : "Joueur du bas";
  meta.textContent = `${name} a joué :`;
  state.lastPlayCards.forEach((card) => {
    area.appendChild(createCardEl(card, true));
  });
}

// Affiche un message d’état (et optionnellement un style de danger).
function setStatus(text, danger = false) {
  const e = el("status-line");
  e.textContent = text;
  e.style.color = danger ? "#ffb3c1" : "";
}

// Vérifie si la partie est terminée et met à jour le classement si l’utilisateur gagne.
function checkWin() {
  for (let i = 0; i < 3; i++) {
    if (!state.hands[i].length) {
      state.finished = true;
      const landlordWin = i === state.landlordIndex;
      const playerIsLandlord = state.landlordIndex === 0;
      const playerSideWin =
        (playerIsLandlord && landlordWin) || (!playerIsLandlord && !landlordWin);
      if (playerSideWin) addWinForYou();
      const msg = landlordWin ? "Le donneur gagne !" : "Les fermiers gagnent !";
      setStatus(msg);
      alert(msg);
      return true;
    }
  }
  return false;
}

// Affiche une modale (aide ou classement).
function showModal(id) {
  const modal = el(id);
  if (modal) modal.classList.add("show");
}

// Masque une modale.
function hideModal(id) {
  const modal = el(id);
  if (modal) modal.classList.remove("show");
}

// Connecte les boutons de la barre supérieure aux modales.
function initModals() {
  const helpBtn = el("help-btn");
  const boardBtn = el("board-btn");
  if (helpBtn) helpBtn.addEventListener("click", () => showModal("help-modal"));
  if (boardBtn) {
    boardBtn.addEventListener("click", () => {
      renderLeaderboard();
      showModal("board-modal");
    });
  }
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-close");
      if (id) hideModal(id);
    });
  });
}

// Lance la musique de fond si le navigateur l’autorise (ou après une interaction).
function tryPlayBgm() {
  const audio = el("bgm");
  if (!audio) return;
  if (!audio.paused) return;
  audio.volume = 0.5;
  audio
    .play()
    .catch(() => {
      // L’autoplay peut être bloqué ; on réessaiera après une interaction utilisateur.
    });
}

// Gère le passage au tour suivant (joueur humain ou IA).
async function nextTurn() {
  if (checkWin()) return;
  state.currentTurn = (state.currentTurn + 1) % 3;
  state.selectedIndexes.clear();
  renderHand();
  renderLastPlay();
  if (state.currentTurn === 0) {
    setStatus("À vous de jouer.");
  } else {
    setStatus(state.currentTurn === 1 ? "L’IA du haut réfléchit…" : "L’IA du bas réfléchit…");
    await aiTurn(state.currentTurn);
  }
}

// Tour d’une IA : choisit un coup via aiChoosePlay puis met à jour l’état.
async function aiTurn(index) {
  const hand = state.hands[index];
  const prevCards =
    state.lastPlayer === null || state.lastPlayer === index
      ? []
      : state.lastPlayCards;
  const res = await aiChoosePlay(prevCards, hand, index);
  if (!res || !res.cards || res.pass) {
    if (state.lastPlayer === null || state.lastPlayer === index) {
      state.lastPlayCards = [];
      state.lastPlayer = null;
    }
    renderLastPlay();
    return nextTurn();
  }
  const play = res.cards;
  // Sécurité : on repasse le coup de l’IA par la validation des règles.
  const check = isValidPlay(prevCards, play);
  if (!check.ok) {
    // Si le coup est invalide, on le considère comme un « je passe ».
    return nextTurn();
  }
  state.hands[index] = hand.filter((c) => !play.includes(c));
  state.lastPlayCards = play;
  state.lastPlayer = index;
  renderHand();
  renderLastPlay();
  await nextTurn();
}

// Gère un clic sur les boutons « Jouer » ou « Passer » pour l’utilisateur.
function onHumanPlay(pass = false) {
  if (state.finished || state.currentTurn !== 0) return;
  const hand = state.hands[0];
  if (pass) {
    if (!state.lastPlayCards.length || state.lastPlayer === 0) {
      setStatus("Vous ne pouvez pas passer maintenant.", true);
      return;
    }
    return nextTurn();
  }
  const chosen = [...state.selectedIndexes]
    .sort((a, b) => a - b)
    .map((idx) => hand[idx]);
  if (!chosen.length) {
    setStatus("Sélectionnez au moins une carte.", true);
    return;
  }
  const prevCards =
    state.lastPlayer === null || state.lastPlayer === 0 ? [] : state.lastPlayCards;
  const check = isValidPlay(prevCards, chosen);
  if (!check.ok) {
    setStatus(check.reason || "Ce coup n’est pas autorisé.", true);
    return;
  }
  state.hands[0] = hand.filter((c) => !chosen.includes(c));
  state.lastPlayCards = chosen;
  state.lastPlayer = 0;
  state.selectedIndexes.clear();
  renderHand();
  renderLastPlay();
  nextTurn();
}

// Connecte les boutons de la page aux fonctions de contrôle du jeu.
function bindEvents() {
  el("new-game-btn").addEventListener("click", () => {
    initState();
    renderRoles();
    renderLordCards();
    renderHand();
    renderLastPlay();
    setStatus("Nouvelle manche : vous êtes le donneur et commencez.");
    tryPlayBgm();
  });
  el("play-btn").addEventListener("click", () => onHumanPlay(false));
  el("pass-btn").addEventListener("click", () => onHumanPlay(true));
  ["help-btn", "board-btn"].forEach((id) => {
    const b = el(id);
    if (b) b.addEventListener("click", tryPlayBgm);
  });
}

// Point d’entrée : prépare l’état, les événements, l’UI et tente de lancer la BGM.
window.addEventListener("DOMContentLoaded", () => {
  initState();
  loadLeaderboard();
  bindEvents();
  initModals();
  renderRoles();
  renderLordCards();
  renderHand();
  renderLastPlay();
  setStatus("Les cartes sont distribuées, vous êtes le donneur et jouez en premier.");
  tryPlayBgm();
});

