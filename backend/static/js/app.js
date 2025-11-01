const initialDataElement = document.getElementById("initial-data");
const initialLobby = initialDataElement ? JSON.parse(initialDataElement.textContent) : null;

const playButton = document.getElementById("play-button");
const cancelButton = document.getElementById("cancel-button");
const queueStatus = document.getElementById("queue-status");
const squadContainer = document.getElementById("squad");
const heroName = document.getElementById("hero-name");
const highlightMode = document.getElementById("highlight-mode");
const highlightMap = document.getElementById("highlight-map");
const statOnline = document.getElementById("stat-online");
const statSearching = document.getElementById("stat-searching");
const statActive = document.getElementById("stat-active");
const currencyCredits = document.getElementById("currency-credits");
const currencyFlux = document.getElementById("currency-flux");
const currencyTokens = document.getElementById("currency-tokens");

const panels = {
  pass: document.getElementById("panel-pass"),
  locker: document.getElementById("panel-locker"),
  shop: document.getElementById("panel-shop"),
  profile: document.getElementById("panel-profile"),
};

const state = {
  sessionId: null,
  pollHandle: null,
  latestSession: null,
};

function setQueueSearching() {
  queueStatus.textContent = "Ricerca giocatori in corso...";
  playButton.disabled = true;
  playButton.textContent = "Ricerca in corso...";
  cancelButton.hidden = false;
  cancelButton.disabled = false;
  renderSquadPlaceholder();
}

function initialise() {
  hydrateLobby(initialLobby);
  bindNavigation();
  bindMatchmaking();
  toggleView("pass");
  window.setInterval(refreshLobby, 10000);
}

function bindNavigation() {
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => toggleView(button.dataset.view));
  });
}

function toggleView(view) {
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  Object.entries(panels).forEach(([panelName, element]) => {
    if (!element) {
      return;
    }
    if (view === "play") {
      element.hidden = panelName !== "pass";
    } else {
      element.hidden = panelName !== view;
    }
  });
}

function bindMatchmaking() {
  playButton.addEventListener("click", async () => {
    if (state.sessionId && state.latestSession && state.latestSession.match) {
      await startMatch();
      return;
    }
    await startQueue();
  });

  cancelButton.addEventListener("click", async () => {
    if (!state.sessionId) return;
    cancelButton.disabled = true;
    try {
      await fetch(`/api/session/${state.sessionId}/cancel`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Impossibile annullare la sessione", error);
    }
    resetQueue();
  });
}

function hydrateLobby(lobby) {
  if (!lobby) return;
  heroName.textContent = lobby.hero.displayName;
  highlightMode.textContent = lobby.dailyHighlight.mode;
  highlightMap.textContent = lobby.dailyHighlight.map;
  statOnline.textContent = lobby.activity.onlinePlayers;
  statSearching.textContent = lobby.activity.searching;
  statActive.textContent = lobby.activity.activeMatches;
  currencyCredits.textContent = lobby.currencies.credits;
  currencyFlux.textContent = lobby.currencies.flux;
  currencyTokens.textContent = lobby.currencies.tokens;
}

async function refreshLobby() {
  try {
    const response = await fetch("/api/lobby");
    if (!response.ok) return;
    const payload = await response.json();
    hydrateLobby(payload);
  } catch (error) {
    console.warn("Backend non raggiungibile", error);
  }
}

async function startQueue() {
  setQueueSearching();
  try {
    const response = await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: heroName.textContent }),
    });
    if (!response.ok) {
      throw new Error(`Queue failed with status ${response.status}`);
    }
    const session = await response.json();
    state.sessionId = session.sessionId;
    state.latestSession = session;
    renderSession(session);
    beginPolling();
  } catch (error) {
    console.error("Errore durante il matchmaking", error);
    queueStatus.textContent = "Errore di matchmaking. Riprova.";
    playButton.disabled = false;
    playButton.textContent = "Avvia Matchmaking";
    cancelButton.hidden = true;
  }
}

function beginPolling() {
  stopPolling();
  state.pollHandle = window.setInterval(async () => {
    if (!state.sessionId) return;
    try {
      const response = await fetch(`/api/session/${state.sessionId}`);
      if (!response.ok) {
        throw new Error(`Session lookup failed: ${response.status}`);
      }
      const session = await response.json();
      state.latestSession = session;
      renderSession(session);
      if (session.status !== "waiting" && session.status !== "matched") {
        stopPolling();
      }
    } catch (error) {
      console.error("Polling error", error);
      queueStatus.textContent = "Connessione persa. Riprova a cercare.";
      resetQueue();
    }
  }, 1500);
}

function stopPolling() {
  if (state.pollHandle) {
    window.clearInterval(state.pollHandle);
    state.pollHandle = null;
  }
}

function renderSession(session) {
  if (!session) return;
  if (session.status === "waiting") {
    const position = session.queuePosition ?? 1;
    const total = session.playersSearching ?? session.queuePosition ?? 1;
    queueStatus.textContent = `In coda · posizione ${position} su ${total}`;
    playButton.textContent = "Ricerca in corso...";
    playButton.disabled = true;
    cancelButton.hidden = false;
    cancelButton.disabled = false;
    renderSquadPlaceholder();
  } else if (session.status === "matched" && session.match) {
    queueStatus.textContent = `Match trovato: ${session.match.mode} · ${session.match.map}`;
    playButton.textContent = "Entra nel match";
    playButton.disabled = false;
    cancelButton.hidden = false;
    cancelButton.disabled = false;
    renderSquad(session.match.squad);
  } else if (session.status === "playing") {
    queueStatus.textContent = "Sessione avviata. Buona fortuna!";
    playButton.textContent = "Avvia Matchmaking";
    playButton.disabled = false;
    cancelButton.hidden = true;
    renderSquad(session.match ? session.match.squad : null);
    state.sessionId = null;
  }
}

function renderSquad(squad) {
  squadContainer.innerHTML = "";
  if (!squad || squad.length === 0) {
    renderSquadPlaceholder();
    return;
  }

  squad.forEach((member) => {
    const item = document.createElement("div");
    item.className = `squad-member${member.isBot ? " bot" : ""}`;

    const name = document.createElement("span");
    name.textContent = member.displayName;

    const badge = document.createElement("span");
    badge.textContent = member.isBot ? "BOT" : "PLAYER";

    item.appendChild(name);
    item.appendChild(badge);
    squadContainer.appendChild(item);
  });
}

function renderSquadPlaceholder() {
  squadContainer.innerHTML = "";
  const placeholder = document.createElement("p");
  placeholder.textContent = "In attesa di comporre la squadra...";
  squadContainer.appendChild(placeholder);
}

async function startMatch() {
  if (!state.sessionId) return;
  playButton.disabled = true;
  playButton.textContent = "Avvio match...";
  try {
    const response = await fetch(`/api/session/${state.sessionId}/start`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Start failed with status ${response.status}`);
    }
    const payload = await response.json();
    queueStatus.textContent = `Match ${payload.matchId} avviato!`; // eventual hook for game scene
    cancelButton.hidden = true;
    stopPolling();
    state.sessionId = null;
  } catch (error) {
    console.error("Impossibile avviare il match", error);
    queueStatus.textContent = "Errore durante l'avvio. Riprova.";
    playButton.disabled = false;
    playButton.textContent = "Entra nel match";
  }
}

function resetQueue() {
  stopPolling();
  state.sessionId = null;
  state.latestSession = null;
  playButton.disabled = false;
  playButton.textContent = "Avvia Matchmaking";
  cancelButton.hidden = true;
  queueStatus.textContent = "Pronto a lanciarti.";
  renderSquadPlaceholder();
}

initialise();
