const initialDataElement = document.getElementById("initial-data");
const initialLobby = initialDataElement ? JSON.parse(initialDataElement.textContent) : null;

const playButton = document.getElementById("play-button");
const cancelButton = document.getElementById("cancel-button");
const queueStatus = document.getElementById("queue-status");
const squadContainer = document.getElementById("squad");
const heroName = document.getElementById("hero-name");
const heroTitle = document.getElementById("hero-title");
const heroLevel = document.getElementById("hero-level");
const xpFill = document.getElementById("xp-fill");
const loadoutPrimary = document.getElementById("loadout-primary");
const loadoutSecondary = document.getElementById("loadout-secondary");
const loadoutGadget = document.getElementById("loadout-gadget");
const highlightMode = document.getElementById("highlight-mode");
const highlightMap = document.getElementById("highlight-map");
const newsHeadline = document.getElementById("news-headline");
const newsBlurb = document.getElementById("news-blurb");
const statOnline = document.getElementById("stat-online");
const statSearching = document.getElementById("stat-searching");
const statActive = document.getElementById("stat-active");
const currencyCredits = document.getElementById("currency-credits");
const currencyFlux = document.getElementById("currency-flux");
const currencyTokens = document.getElementById("currency-tokens");
const passLevel = document.getElementById("pass-level");
const passProgress = document.getElementById("pass-progress");
const passProgressLabel = document.getElementById("pass-progress-label");
const passTrack = document.getElementById("pass-track");
const passPreviewName = document.getElementById("pass-preview-name");
const passPreviewDescription = document.getElementById("pass-preview-description");
const passPreviewRarity = document.getElementById("pass-preview-rarity");
const passPreviewStatus = document.getElementById("pass-preview-status");
const passPreviewImage = document.getElementById("pass-preview-image");
const passPreviewReward = document.getElementById("pass-preview-reward");
const passPreviewPremium = document.getElementById("pass-preview-premium");
const passClaimButton = document.getElementById("pass-claim-button");
const lockerOutfit = document.getElementById("locker-outfit");
const lockerBackbling = document.getElementById("locker-backbling");
const lockerPickaxe = document.getElementById("locker-pickaxe");
const lockerGlider = document.getElementById("locker-glider");
const lockerWrap = document.getElementById("locker-wrap");
const lockerEmotes = document.getElementById("locker-emotes");
const lockerOutfitThumb = document.getElementById("locker-outfit-thumb");
const lockerWeaponThumb = document.getElementById("locker-weapon-thumb");
const lockerWrapBonus = document.getElementById("locker-wrap-bonus");
const lockerOutfitRarity = document.getElementById("locker-outfit-rarity");
const animationName = document.getElementById("animation-name");
const animationDescription = document.getElementById("animation-description");
const outfitList = document.getElementById("outfit-list");
const weaponSkinList = document.getElementById("weapon-skin-list");
const outfitCount = document.getElementById("outfit-count");
const weaponCount = document.getElementById("weapon-count");
const outfitImportForm = document.getElementById("outfit-import-form");
const weaponImportForm = document.getElementById("weapon-import-form");
const animationSelect = document.getElementById("outfit-animation-set");
const shopFeatured = document.getElementById("shop-featured");
const shopDaily = document.getElementById("shop-daily");
const shopPreviewImage = document.getElementById("shop-preview-image");
const shopPreviewName = document.getElementById("shop-preview-name");
const shopPreviewDescription = document.getElementById("shop-preview-description");
const shopPreviewRarity = document.getElementById("shop-preview-rarity");
const shopPreviewPrice = document.getElementById("shop-preview-price");
const shopPreviewType = document.getElementById("shop-preview-type");
const shopPreviewOwned = document.getElementById("shop-preview-owned");
const shopBuyButton = document.getElementById("shop-buy-button");
const profileMatches = document.getElementById("profile-matches");
const profileWins = document.getElementById("profile-wins");
const profileWinrate = document.getElementById("profile-winrate");
const profileKdr = document.getElementById("profile-kdr");
const profileTime = document.getElementById("profile-time");
const friendList = document.getElementById("friend-list");
const friendForm = document.getElementById("friend-form");
const friendFeedback = document.getElementById("friend-feedback");
const settingsEmail = document.getElementById("settings-email");
const settings2fa = document.getElementById("settings-2fa");
const settingsNews = document.getElementById("settings-news");
const logoutButton = document.getElementById("logout-button");
const logoutFeedback = document.getElementById("logout-feedback");
const navButtons = Array.from(document.querySelectorAll(".nav-btn"));
const viewSections = Array.from(document.querySelectorAll("[data-view-section]"));
const allowedViews = new Set(["play", "pass", "locker", "shop", "stats", "friends", "settings"]);
const authOverlay = document.getElementById("auth-overlay");
const authTabs = Array.from(document.querySelectorAll("[data-auth-tab]"));
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginError = document.getElementById("login-error");
const registerError = document.getElementById("register-error");

const state = {
  token: window.localStorage.getItem("dropzonex-token"),
  profile: null,
  sessionId: null,
  pollHandle: null,
  latestSession: null,
  cosmetics: null,
  battlePass: null,
  shop: null,
  selectedTierId: null,
  selectedShopItemId: null,
  matchmakingSocket: null,
};

async function apiFetch(url, options = {}) {
  const init = { ...options };
  const existing = options.headers ? new Headers(options.headers) : new Headers();
  if (state.token) {
    existing.set("Authorization", `Bearer ${state.token}`);
  }
  init.headers = existing;
  const response = await fetch(url, init);
  if (response.status === 401) {
    handleUnauthorized();
  }
  return response;
}

function showAuthOverlay(mode = "login") {
  if (authOverlay) {
    authOverlay.hidden = false;
  }
  setAuthMode(mode);
}

function hideAuthOverlay() {
  if (authOverlay) {
    authOverlay.hidden = true;
  }
  if (loginError) loginError.hidden = true;
  if (registerError) registerError.hidden = true;
}

function setAuthMode(mode) {
  authTabs.forEach((tab) => {
    const active = tab.dataset.authTab === mode;
    tab.classList.toggle("active", active);
  });
  if (loginForm) loginForm.hidden = mode !== "login";
  if (registerForm) registerForm.hidden = mode !== "register";
}

function handleUnauthorized() {
  window.localStorage.removeItem("dropzonex-token");
  state.token = null;
  state.profile = null;
  resetQueue();
  hydrateLobby(initialLobby);
  showAuthOverlay("login");
}

async function loadProfile() {
  if (!state.token) return null;
  const response = await apiFetch("/api/auth/me");
  if (!response.ok) {
    throw new Error(`Profilo non disponibile: ${response.status}`);
  }
  const profile = await response.json();
  state.profile = profile;
  return profile;
}

async function fetchLobbyData() {
  if (!state.token) return null;
  const response = await apiFetch("/api/lobby");
  if (!response.ok) {
    throw new Error(`Lobby non disponibile: ${response.status}`);
  }
  const lobby = await response.json();
  state.lobby = lobby;
  return lobby;
}

async function authenticateAndLoad() {
  if (!state.token) {
    hydrateLobby(initialLobby);
    showAuthOverlay("login");
    return;
  }
  try {
    await loadProfile();
    const lobby = await fetchLobbyData();
    hydrateLobby(lobby || initialLobby);
    hideAuthOverlay();
  } catch (error) {
    console.error("Impossibile caricare i dati dell'account", error);
    handleUnauthorized();
  }
}

function initialiseAuth() {
  authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setAuthMode(tab.dataset.authTab || "login");
    });
  });

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const payload = {
        username: formData.get("username"),
        password: formData.get("password"),
      };
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`Login fallito: ${response.status}`);
        }
        const data = await response.json();
        state.token = data.accessToken;
        window.localStorage.setItem("dropzonex-token", state.token);
        state.profile = data.profile;
        if (loginError) loginError.hidden = true;
        await authenticateAndLoad();
      } catch (error) {
        console.error("Errore login", error);
        if (loginError) {
          loginError.textContent = "Credenziali non valide";
          loginError.hidden = false;
        }
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(registerForm);
      const payload = {
        username: formData.get("username"),
        email: formData.get("email"),
        password: formData.get("password"),
      };
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`Registrazione fallita: ${response.status}`);
        }
        const data = await response.json();
        state.token = data.accessToken;
        window.localStorage.setItem("dropzonex-token", state.token);
        state.profile = data.profile;
        if (registerError) registerError.hidden = true;
        await authenticateAndLoad();
      } catch (error) {
        console.error("Errore registrazione", error);
        if (registerError) {
          registerError.textContent = "Registrazione non riuscita";
          registerError.hidden = false;
        }
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        if (state.token) {
          await apiFetch("/api/auth/logout", { method: "POST" });
        }
      } catch (error) {
        console.warn("Logout non completato", error);
      }
      handleUnauthorized();
      if (logoutFeedback) {
        logoutFeedback.textContent = "Sessione terminata";
        logoutFeedback.hidden = false;
        window.setTimeout(() => {
          logoutFeedback.hidden = true;
        }, 2000);
      }
    });
  }
}

function formatBattlePassReward(tier) {
  if (!tier) return "-";
  const reward = tier.reward || {};
  if (reward.type === "currency" && reward.amount) {
    return `${reward.amount} ${String(reward.currency || "").toUpperCase()}`;
  }
  if (reward.type === "outfit" || reward.cosmeticKind === "outfit") {
    return "Skin operatore";
  }
  if (reward.type === "weapon" || reward.cosmeticKind === "weapon") {
    return "Skin arma";
  }
  if (reward.type === "emote") {
    return "Emote";
  }
  if (reward.type === "profile") {
    return "Oggetto profilo";
  }
  return reward.type ? reward.type.charAt(0).toUpperCase() + reward.type.slice(1) : "Ricompensa";
}

function formatShopReward(item) {
  if (!item) return "Ricompensa";
  const kind = item.rewardType || item.cosmeticKind || "cosmetico";
  switch (kind) {
    case "outfit":
      return "Skin operatore";
    case "weapon":
      return "Skin arma";
    case "emote":
      return "Emote";
    case "bundle":
      return "Bundle";
    case "currency":
      return "Valuta";
    default:
      return kind.charAt(0).toUpperCase() + kind.slice(1);
  }
}

function setQueueSearching() {
  queueStatus.textContent = "Ricerca giocatori in corso...";
  playButton.disabled = true;
  playButton.textContent = "Ricerca in corso...";
  cancelButton.hidden = false;
  cancelButton.disabled = false;
  renderSquadPlaceholder();
}

function initialise() {
  initialiseAuth();
  bindNavigation();
  bindMatchmaking();
  bindCosmetics();
  bindBattlePass();
  bindShop();
  bindFriends();
  const url = new URL(window.location.href);
  const requestedView = url.searchParams.get("view") || document.body.dataset.activeView;
  toggleView(requestedView);
  authenticateAndLoad();
  window.setInterval(() => refreshLobby({ silent: true }), 10000);
}

function bindNavigation() {
  navButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      toggleView(button.dataset.view, { updateHistory: true });
    });
  });

  window.addEventListener("popstate", (event) => {
    const stateView = event.state?.view;
    const fallback = new URL(window.location.href).searchParams.get("view");
    toggleView(stateView || fallback);
  });
}

function toggleView(view, options = {}) {
  const { updateHistory = false } = options;
  const targetView = allowedViews.has(view) ? view : "play";
  document.body.dataset.activeView = targetView;
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === targetView);
  });
  viewSections.forEach((section) => {
    section.hidden = section.dataset.viewSection !== targetView;
  });

  if (updateHistory) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", targetView);
    window.history.pushState({ view: targetView }, "", url);
  }
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
      await apiFetch(`/api/session/${state.sessionId}/cancel`, {
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
  state.cosmetics = lobby.cosmetics || null;
  state.battlePass = lobby.battlePass || null;
  state.shop = lobby.shop || null;
  heroName.textContent = lobby.hero.displayName;
  if (heroTitle) {
    heroTitle.textContent = lobby.hero.title;
  }
  if (heroLevel) {
    heroLevel.textContent = lobby.hero.level;
  }
  if (xpFill) {
    xpFill.style.width = `${Math.round((lobby.hero.xpProgress || 0) * 100)}%`;
  }
  if (loadoutPrimary) {
    loadoutPrimary.textContent = lobby.hero.loadout?.primary ?? "-";
  }
  if (loadoutSecondary) {
    loadoutSecondary.textContent = lobby.hero.loadout?.secondary ?? "-";
  }
  if (loadoutGadget) {
    loadoutGadget.textContent = lobby.hero.loadout?.gadget ?? "-";
  }
  highlightMode.textContent = lobby.dailyHighlight.mode;
  highlightMap.textContent = lobby.dailyHighlight.map;
  statOnline.textContent = lobby.activity.onlinePlayers;
  statSearching.textContent = lobby.activity.searching;
  statActive.textContent = lobby.activity.activeMatches;
  currencyCredits.textContent = lobby.currencies.credits;
  currencyFlux.textContent = lobby.currencies.flux;
  currencyTokens.textContent = lobby.currencies.tokens;
  if (newsHeadline) {
    newsHeadline.textContent = lobby.news.headline;
  }
  if (newsBlurb) {
    newsBlurb.textContent = lobby.news.blurb;
  }
  if (passLevel) {
    passLevel.textContent = lobby.battlePass.level;
  }
  if (passProgress) {
    passProgress.style.width = `${Math.round((lobby.battlePass.progress || 0) * 100)}%`;
  }
  if (passProgressLabel) {
    passProgressLabel.textContent = `${Math.round((lobby.battlePass.progress || 0) * 100)}% completato`;
  }
  renderPassTrack(state.battlePass, state.selectedTierId);
  renderLocker(lobby.locker || {}, lobby.cosmetics || {}, lobby.hero || {});
  renderOutfitList(lobby.cosmetics?.outfits || [], lobby.hero?.outfit?.id);
  renderWeaponSkinList(lobby.cosmetics?.weaponSkins || [], lobby.hero?.weaponSkin?.id);
  populateAnimationSelect(lobby.cosmetics?.animationSets || [], lobby.hero?.outfit?.animationSetId);
  renderShop(state.shop, state.selectedShopItemId);
  renderProfile(lobby.profile || {});
  renderFriends(lobby.friends || []);
  renderSettings(lobby.settings || {});
}

async function refreshLobby(options = {}) {
  if (!state.token) return;
  try {
    const response = await apiFetch("/api/lobby");
    if (!response.ok) return;
    const payload = await response.json();
    hydrateLobby(payload);
  } catch (error) {
    if (!options.silent) {
      console.warn("Backend non raggiungibile", error);
    }
  }
}

async function startQueue() {
  if (!state.token) {
    showAuthOverlay("login");
    return;
  }
  setQueueSearching();
  try {
    const response = await apiFetch("/api/queue", {
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
    connectMatchmakingSocket(session.sessionId);
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
      const response = await apiFetch(`/api/session/${state.sessionId}`);
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

function connectMatchmakingSocket(sessionId) {
  if (!state.token) return;
  closeMatchmakingSocket();
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${protocol}://${window.location.host}/ws/matchmaking/${sessionId}?token=${state.token}`);
  socket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      state.latestSession = payload;
      renderSession(payload);
    } catch (error) {
      console.warn("Messaggio matchmaking non valido", error);
    }
  });
  socket.addEventListener("close", () => {
    if (state.matchmakingSocket === socket) {
      state.matchmakingSocket = null;
    }
  });
  socket.addEventListener("error", () => {
    console.warn("WebSocket matchmaking in errore");
  });
  state.matchmakingSocket = socket;
}

function closeMatchmakingSocket() {
  if (state.matchmakingSocket) {
    try {
      state.matchmakingSocket.close();
    } catch (error) {
      console.warn("Errore chiusura WebSocket", error);
    }
    state.matchmakingSocket = null;
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
    renderSquad(extractSquadMembers(session.match, session));
  } else if (session.status === "playing") {
    queueStatus.textContent = "Sessione avviata. Buona fortuna!";
    playButton.textContent = "Avvia Matchmaking";
    playButton.disabled = false;
    cancelButton.hidden = true;
    renderSquad(session.match ? extractSquadMembers(session.match, session) : null);
    closeMatchmakingSocket();
    state.sessionId = null;
  }
}

function extractSquadMembers(match, session) {
  if (!match) return null;
  if (match.playerSquad?.members) {
    return match.playerSquad.members;
  }
  if (session?.squadId && Array.isArray(match.squads)) {
    const squad = match.squads.find((group) => group.squadId === session.squadId);
    if (squad) return squad.members;
  }
  if (Array.isArray(match.squads) && match.squads.length > 0) {
    return match.squads[0].members;
  }
  return match.squad || null;
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
    if (member.cosmetics?.outfitId) {
      const detail = document.createElement("span");
      detail.className = "cosmetic-tag";
      detail.textContent = member.cosmetics.name ?? "Skin";
      item.appendChild(detail);
    }
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
    const response = await apiFetch(`/api/session/${state.sessionId}/start`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Start failed with status ${response.status}`);
    }
    const payload = await response.json();
    queueStatus.textContent = `Match ${payload.matchId} avviato!`;
    cancelButton.hidden = true;
    stopPolling();
    state.sessionId = null;
    state.latestSession = null;
    const destination = payload.matchUrl || "/";
    window.location.href = destination;
  } catch (error) {
    console.error("Impossibile avviare il match", error);
    queueStatus.textContent = "Errore durante l'avvio. Riprova.";
    playButton.disabled = false;
    playButton.textContent = "Entra nel match";
  }
}

function resetQueue() {
  stopPolling();
  closeMatchmakingSocket();
  state.sessionId = null;
  state.latestSession = null;
  playButton.disabled = false;
  playButton.textContent = "Avvia Matchmaking";
  cancelButton.hidden = true;
  queueStatus.textContent = "Pronto a lanciarti.";
  renderSquadPlaceholder();
}

function renderPassTrack(battlePass, preferredTierId) {
  if (!passTrack) return;
  passTrack.innerHTML = "";
  const tiers = battlePass?.tiers || [];
  tiers.forEach((tier) => {
    const item = document.createElement("li");
    const classes = ["pass-card"];
    if (tier.claimed) classes.push("claimed");
    else if (!tier.unlocked) classes.push("locked");
    if (tier.premium) classes.push("premium");
    if (tier.owned) classes.push("owned");
    item.className = classes.join(" ");
    item.dataset.tierId = tier.id;

    const button = document.createElement("button");
    button.type = "button";
    const tierLabel = document.createElement("span");
    tierLabel.className = "tier-label";
    tierLabel.textContent = `Tier ${tier.tier}`;

    const figure = document.createElement("figure");
    figure.className = "card-thumb";
    const img = document.createElement("img");
    img.src = tier.thumbnailUrl;
    img.alt = tier.name;
    figure.appendChild(img);

    const body = document.createElement("div");
    body.className = "card-body";
    const title = document.createElement("strong");
    title.textContent = tier.name;
    const rarity = document.createElement("span");
    rarity.className = "rarity";
    rarity.textContent = tier.rarity;
    const rewardLabel = document.createElement("span");
    rewardLabel.className = "reward";
    rewardLabel.textContent = formatBattlePassReward(tier);
    body.appendChild(title);
    body.appendChild(rarity);
    body.appendChild(rewardLabel);
    if (tier.premium) {
      const badge = document.createElement("span");
      badge.className = "badge premium";
      badge.textContent = "Premium";
      body.appendChild(badge);
    }
    if (tier.claimed || tier.owned) {
      const status = document.createElement("span");
      status.className = "status";
      status.textContent = tier.claimed ? "Riscattato" : "Nel locker";
      body.appendChild(status);
    }

    button.appendChild(tierLabel);
    button.appendChild(figure);
    button.appendChild(body);
    item.appendChild(button);
    passTrack.appendChild(item);
  });

  if (tiers.length === 0) {
    state.selectedTierId = null;
    updatePassPreview(null);
    return;
  }

  let targetId = preferredTierId && tiers.some((tier) => tier.id === preferredTierId) ? preferredTierId : null;
  if (!targetId) {
    const claimable = tiers.find((tier) => !tier.claimed && tier.unlocked);
    targetId = (claimable && claimable.id) || tiers[0].id;
  }
  selectPassTier(targetId);
}

function selectPassTier(tierId) {
  if (!state.battlePass) return;
  const tiers = state.battlePass.tiers || [];
  const tier = tiers.find((entry) => entry.id === tierId) || null;
  state.selectedTierId = tier ? tierId : null;
  Array.from(passTrack?.children || []).forEach((node) => {
    node.classList.toggle("selected", tier && node.dataset.tierId === tier.id);
  });
  updatePassPreview(tier);
}

function updatePassPreview(tier) {
  if (!passClaimButton) return;
  if (!tier) {
    passClaimButton.disabled = true;
    passClaimButton.dataset.tierId = "";
    passClaimButton.dataset.unlock = "false";
    passClaimButton.textContent = "Seleziona un tier";
    if (passPreviewName) passPreviewName.textContent = "Seleziona una ricompensa";
    if (passPreviewDescription)
      passPreviewDescription.textContent = "Scegli un tier del Battle Pass per visualizzare dettagli e requisiti.";
    if (passPreviewRarity) passPreviewRarity.textContent = "-";
    if (passPreviewStatus) passPreviewStatus.textContent = "-";
    if (passPreviewReward) passPreviewReward.textContent = "-";
    if (passPreviewPremium) passPreviewPremium.textContent = "-";
    if (passPreviewImage && passPreviewImage.tagName === "IMG") {
      passPreviewImage.src = "";
      passPreviewImage.alt = "Anteprima ricompensa";
    }
    return;
  }

  if (passPreviewName) passPreviewName.textContent = tier.name;
  if (passPreviewDescription) passPreviewDescription.textContent = tier.description || "";
  if (passPreviewRarity) passPreviewRarity.textContent = tier.rarity || "";
  if (passPreviewStatus) {
    let status = "Bloccato";
    if (tier.claimed) status = "Riscattato";
    else if (tier.owned) status = "Nel locker";
    else if (tier.unlocked) status = "Disponibile";
    passPreviewStatus.textContent = status;
  }
  if (passPreviewReward) passPreviewReward.textContent = formatBattlePassReward(tier);
  if (passPreviewPremium) passPreviewPremium.textContent = tier.premium ? "Premium" : "Base";
  if (passPreviewImage && passPreviewImage.tagName === "IMG") {
    passPreviewImage.src = tier.thumbnailUrl;
    passPreviewImage.alt = tier.name;
  }

  const requiresUnlock = !tier.unlocked && tier.unlockCost && tier.unlockCurrency;
  passClaimButton.dataset.tierId = tier.id;
  passClaimButton.dataset.unlock = requiresUnlock ? "true" : "false";
  passClaimButton.disabled = tier.claimed || (!tier.unlocked && !requiresUnlock);
  if (tier.claimed) {
    passClaimButton.textContent = "Già riscattato";
  } else if (tier.unlocked) {
    passClaimButton.textContent = "Riscatta ricompensa";
  } else if (requiresUnlock) {
    passClaimButton.textContent = `Sblocca per ${tier.unlockCost} ${String(tier.unlockCurrency).toUpperCase()}`;
  } else {
    passClaimButton.textContent = "Bloccato";
  }
}

function bindBattlePass() {
  if (passTrack) {
    passTrack.addEventListener("click", (event) => {
      const target = event.target.closest("li[data-tier-id]");
      if (!target) return;
      selectPassTier(target.dataset.tierId);
    });
  }
  if (passClaimButton) {
    passClaimButton.addEventListener("click", async () => {
      if (passClaimButton.disabled) return;
      const tierId = passClaimButton.dataset.tierId;
      if (!tierId) return;
      const unlock = passClaimButton.dataset.unlock === "true";
      await claimBattlePassTier(tierId, unlock);
    });
  }
}

async function claimBattlePassTier(tierId, unlock) {
  try {
    const response = await apiFetch("/api/battle-pass/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tierId, unlock }),
    });
    if (!response.ok) {
      throw new Error(`Claim failed ${response.status}`);
    }
    await response.json();
    await refreshLobby();
    if (state.battlePass?.tiers?.some((tier) => tier.id === tierId)) {
      selectPassTier(tierId);
    }
  } catch (error) {
    console.error("Impossibile aggiornare il Battle Pass", error);
  }
}

function renderLocker(locker, cosmetics, hero) {
  if (lockerOutfit) lockerOutfit.textContent = locker.outfit ?? hero?.outfit?.name ?? "-";
  if (lockerBackbling) lockerBackbling.textContent = locker.backbling ?? "-";
  if (lockerPickaxe) lockerPickaxe.textContent = locker.pickaxe ?? "-";
  if (lockerGlider) lockerGlider.textContent = locker.glider ?? "-";
  if (lockerWrap) lockerWrap.textContent = locker.wrap ?? hero?.weaponSkin?.name ?? "-";
  if (lockerOutfitThumb && (hero?.outfit?.thumbnailUrl || cosmetics?.equippedOutfit?.thumbnailUrl)) {
    lockerOutfitThumb.src = hero?.outfit?.thumbnailUrl || cosmetics.equippedOutfit.thumbnailUrl;
  }
  if (lockerWeaponThumb && (hero?.weaponSkin?.thumbnailUrl || cosmetics?.equippedWeaponSkin?.thumbnailUrl)) {
    lockerWeaponThumb.src = hero?.weaponSkin?.thumbnailUrl || cosmetics.equippedWeaponSkin.thumbnailUrl;
  }
  if (lockerWrapBonus) {
    const modifier = hero?.weaponSkin?.powerModifier ?? cosmetics?.equippedWeaponSkin?.powerModifier ?? 0;
    lockerWrapBonus.textContent = `+${Math.round(modifier * 1000) / 10}% potenza`;
  }
  if (lockerOutfitRarity) {
    lockerOutfitRarity.textContent = hero?.outfit?.rarity || cosmetics?.equippedOutfit?.rarity || "";
  }
  if (animationName) {
    const animationId = hero?.outfit?.animationSetId || cosmetics?.equippedOutfit?.animationSetId;
    const animation = (cosmetics?.animationSets || []).find((item) => item.id === animationId);
    animationName.textContent = animation?.name || "Animazioni personalizzate";
    if (animationDescription) {
      animationDescription.textContent = animation?.description || "Importa una skin per collegare automaticamente le animazioni.";
    }
  }
  if (lockerEmotes) {
    lockerEmotes.innerHTML = "";
    (locker.emotes || []).forEach((emote) => {
      const li = document.createElement("li");
      li.textContent = emote;
      lockerEmotes.appendChild(li);
    });
  }
  if (outfitCount) outfitCount.textContent = String((cosmetics?.outfits || []).length);
  if (weaponCount) weaponCount.textContent = String((cosmetics?.weaponSkins || []).length);
}

function renderOutfitList(outfits, equippedId) {
  if (!outfitList) return;
  outfitList.innerHTML = "";
  outfits.forEach((outfit) => {
    const item = document.createElement("li");
    const owned = Boolean(outfit.owned);
    item.className = `cosmetic-item${equippedId && equippedId === outfit.id ? " equipped" : ""}${owned ? "" : " locked"}`;
    item.dataset.outfitId = outfit.id;

    const preview = document.createElement("img");
    preview.src = outfit.thumbnailUrl;
    preview.alt = outfit.name;

    const details = document.createElement("div");
    details.className = "cosmetic-details";
    const title = document.createElement("strong");
    title.textContent = outfit.name;
    const rarity = document.createElement("span");
    rarity.textContent = outfit.rarity;
    details.appendChild(title);
    details.appendChild(rarity);

    const button = document.createElement("button");
    button.type = "button";
    button.type = "button";
    button.className = "equip-btn";
    button.dataset.equipOutfit = outfit.id;
    if (!owned) {
      button.textContent = "Non posseduta";
      button.disabled = true;
    } else {
      button.textContent = equippedId && equippedId === outfit.id ? "Equipaggiata" : "Equipaggia";
    }

    item.appendChild(preview);
    item.appendChild(details);
    item.appendChild(button);
    outfitList.appendChild(item);
  });
}

function renderWeaponSkinList(weaponSkins, equippedId) {
  if (!weaponSkinList) return;
  weaponSkinList.innerHTML = "";
  weaponSkins.forEach((skin) => {
    const item = document.createElement("li");
    const owned = Boolean(skin.owned);
    item.className = `cosmetic-item${equippedId && equippedId === skin.id ? " equipped" : ""}${owned ? "" : " locked"}`;
    item.dataset.weaponId = skin.id;

    const preview = document.createElement("img");
    preview.src = skin.thumbnailUrl;
    preview.alt = skin.name;

    const details = document.createElement("div");
    details.className = "cosmetic-details";
    const title = document.createElement("strong");
    title.textContent = skin.name;
    const rarity = document.createElement("span");
    rarity.textContent = skin.rarity;
    details.appendChild(title);
    details.appendChild(rarity);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "equip-btn";
    button.dataset.equipWeapon = skin.id;
    if (!owned) {
      button.textContent = "Non posseduta";
      button.disabled = true;
    } else {
      button.textContent = equippedId && equippedId === skin.id ? "Equipaggiata" : "Equipaggia";
    }

    item.appendChild(preview);
    item.appendChild(details);
    item.appendChild(button);
    weaponSkinList.appendChild(item);
  });
}

function populateAnimationSelect(animationSets, selectedId) {
  if (!animationSelect) return;
  animationSelect.innerHTML = "";
  animationSets.forEach((animation) => {
    const option = document.createElement("option");
    option.value = animation.id;
    option.textContent = animation.name;
    if (selectedId && selectedId === animation.id) option.selected = true;
    animationSelect.appendChild(option);
  });
}

function bindCosmetics() {
  if (outfitList) {
    outfitList.addEventListener("click", async (event) => {
      const trigger = event.target.closest("[data-equip-outfit]");
      if (!trigger) return;
      const outfitId = trigger.dataset.equipOutfit;
      await equipCosmetics({ outfitId });
    });
  }
  if (weaponSkinList) {
    weaponSkinList.addEventListener("click", async (event) => {
      const trigger = event.target.closest("[data-equip-weapon]");
      if (!trigger) return;
      const weaponSkinId = trigger.dataset.equipWeapon;
      await equipCosmetics({ weaponSkinId });
    });
  }
  if (outfitImportForm) {
    outfitImportForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(outfitImportForm);
      const payload = Object.fromEntries(formData.entries());
      try {
        const response = await apiFetch("/api/cosmetics/outfits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Import outfit failed: ${response.status}`);
        outfitImportForm.reset();
        await refreshLobby();
      } catch (error) {
        console.error("Impossibile importare la skin", error);
      }
    });
  }
  if (weaponImportForm) {
    weaponImportForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(weaponImportForm);
      const payload = Object.fromEntries(formData.entries());
      const power = parseFloat(payload.powerModifier || "0");
      payload.powerModifier = power / 100;
      try {
        const response = await apiFetch("/api/cosmetics/weapon-skins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Import weapon skin failed: ${response.status}`);
        weaponImportForm.reset();
        await refreshLobby();
      } catch (error) {
        console.error("Impossibile importare la skin arma", error);
      }
    });
  }
}

async function equipCosmetics(payload) {
  try {
    const response = await apiFetch("/api/locker/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Equip failed ${response.status}`);
    await refreshLobby();
  } catch (error) {
    console.error("Impossibile aggiornare l'armadietto", error);
  }
}

function bindFriends() {
  if (friendForm) {
    friendForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!state.token) {
        showAuthOverlay("login");
        return;
      }
      const formData = new FormData(friendForm);
      const username = formData.get("username");
      try {
        const response = await apiFetch("/api/friends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        if (!response.ok) {
          throw new Error(`Add friend failed: ${response.status}`);
        }
        friendForm.reset();
        if (friendFeedback) {
          friendFeedback.textContent = "Richiesta inviata";
          friendFeedback.hidden = false;
        }
        await refreshLobby();
      } catch (error) {
        console.error("Impossibile inviare la richiesta", error);
        if (friendFeedback) {
          friendFeedback.textContent = "Impossibile inviare la richiesta";
          friendFeedback.hidden = false;
        }
      }
      window.setTimeout(() => {
        if (friendFeedback) friendFeedback.hidden = true;
      }, 2000);
    });
  }

  if (friendList) {
    friendList.addEventListener("click", async (event) => {
      const removeButton = event.target.closest("[data-action='remove']");
      if (!removeButton) return;
      const item = removeButton.closest("[data-username]");
      if (!item) return;
      const username = item.dataset.username;
      try {
        const response = await apiFetch(`/api/friends/${encodeURIComponent(username)}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error(`Remove friend failed: ${response.status}`);
        }
        await refreshLobby();
      } catch (error) {
        console.error("Impossibile rimuovere l'amico", error);
      }
    });
  }
}

function renderShop(storefront, preferredItemId) {
  renderShopSection(shopFeatured, storefront?.featured || []);
  renderShopSection(shopDaily, storefront?.daily || []);
  const allItems = [...(storefront?.featured || []), ...(storefront?.daily || [])];
  if (allItems.length === 0) {
    state.selectedShopItemId = null;
    updateShopPreview(null);
    return;
  }
  let targetId = preferredItemId && allItems.some((item) => item.id === preferredItemId) ? preferredItemId : null;
  if (!targetId) {
    const available = allItems.find((item) => !item.owned) || allItems[0];
    targetId = available.id;
  }
  selectShopItem(targetId);
}

function renderShopSection(container, items) {
  if (!container) return;
  container.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("li");
    card.className = `shop-card${item.owned ? " owned" : ""}`;
    card.dataset.itemId = item.id;

    const button = document.createElement("button");
    const figure = document.createElement("figure");
    figure.className = "card-thumb";
    const img = document.createElement("img");
    img.src = item.thumbnailUrl;
    img.alt = item.name;
    figure.appendChild(img);

    const body = document.createElement("div");
    body.className = "card-body";
    const title = document.createElement("strong");
    title.textContent = item.name;
    const rarity = document.createElement("span");
    rarity.className = "rarity";
    rarity.textContent = item.rarity;
    const price = document.createElement("span");
    price.className = "price";
    price.textContent = `${item.price} ${String(item.currency || "").toUpperCase()}`;
    const type = document.createElement("span");
    type.className = "type";
    type.textContent = formatShopReward(item);
    body.appendChild(title);
    body.appendChild(rarity);
    body.appendChild(price);
    body.appendChild(type);
    if (item.owned) {
      const status = document.createElement("span");
      status.className = "status";
      status.textContent = "Già acquistato";
      body.appendChild(status);
    }

    button.appendChild(figure);
    button.appendChild(body);
    card.appendChild(button);
    container.appendChild(card);
  });
}

function selectShopItem(itemId) {
  const items = [...(state.shop?.featured || []), ...(state.shop?.daily || [])];
  const selected = items.find((item) => item.id === itemId) || null;
  state.selectedShopItemId = selected ? itemId : null;
  [shopFeatured, shopDaily]
    .filter(Boolean)
    .forEach((list) => {
      Array.from(list.children).forEach((node) => {
        node.classList.toggle("selected", selected && node.dataset.itemId === selected.id);
      });
    });
  updateShopPreview(selected);
}

function updateShopPreview(item) {
  if (!shopBuyButton) return;
  if (!item) {
    shopBuyButton.disabled = true;
    shopBuyButton.dataset.itemId = "";
    if (shopPreviewName) shopPreviewName.textContent = "Seleziona un oggetto";
    if (shopPreviewDescription)
      shopPreviewDescription.textContent = "Seleziona un oggetto per visualizzarne la ricompensa e il costo.";
    if (shopPreviewRarity) shopPreviewRarity.textContent = "-";
    if (shopPreviewPrice) shopPreviewPrice.textContent = "-";
    if (shopPreviewType) shopPreviewType.textContent = "-";
    if (shopPreviewOwned) shopPreviewOwned.textContent = "-";
    if (shopPreviewImage && shopPreviewImage.tagName === "IMG") {
      shopPreviewImage.src = "";
      shopPreviewImage.alt = "Anteprima oggetto";
    }
    shopBuyButton.textContent = "Seleziona un oggetto";
    return;
  }

  if (shopPreviewName) shopPreviewName.textContent = item.name;
  if (shopPreviewDescription) shopPreviewDescription.textContent = item.description || "";
  if (shopPreviewRarity) shopPreviewRarity.textContent = item.rarity || "";
  if (shopPreviewPrice) shopPreviewPrice.textContent = `${item.price} ${String(item.currency || "").toUpperCase()}`;
  if (shopPreviewType) shopPreviewType.textContent = formatShopReward(item);
  if (shopPreviewOwned) shopPreviewOwned.textContent = item.owned ? "Sì" : "No";
  if (shopPreviewImage && shopPreviewImage.tagName === "IMG") {
    shopPreviewImage.src = item.thumbnailUrl;
    shopPreviewImage.alt = item.name;
  }
  shopBuyButton.dataset.itemId = item.id;
  shopBuyButton.disabled = Boolean(item.owned);
  shopBuyButton.textContent = item.owned ? "Già acquistato" : "Acquista ora";
}

function bindShop() {
  const handler = (event) => {
    const card = event.target.closest("li[data-item-id]");
    if (!card) return;
    selectShopItem(card.dataset.itemId);
  };
  if (shopFeatured) shopFeatured.addEventListener("click", handler);
  if (shopDaily) shopDaily.addEventListener("click", handler);
  if (shopBuyButton) {
    shopBuyButton.addEventListener("click", async () => {
      if (shopBuyButton.disabled) return;
      const itemId = shopBuyButton.dataset.itemId;
      if (!itemId) return;
      await purchaseShopItem(itemId);
    });
  }
}

async function purchaseShopItem(itemId) {
  try {
    const response = await apiFetch("/api/shop/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    if (!response.ok) {
      throw new Error(`Purchase failed ${response.status}`);
    }
    await response.json();
    await refreshLobby();
    if (state.shop && [...(state.shop.featured || []), ...(state.shop.daily || [])].some((item) => item.id === itemId)) {
      selectShopItem(itemId);
    }
  } catch (error) {
    console.error("Impossibile completare l'acquisto", error);
  }
}

function renderProfile(profile) {
  if (profileMatches) profileMatches.textContent = profile.matchesPlayed ?? 0;
  if (profileWins) profileWins.textContent = profile.wins ?? 0;
  if (profileWinrate) profileWinrate.textContent = profile.winRate != null ? `${profile.winRate}%` : "0%";
  if (profileKdr) profileKdr.textContent = profile.kdr ?? "0";
  if (profileTime) {
    const minutes = profile.timePlayedMinutes ?? 0;
    profileTime.textContent = `${Math.round((minutes / 60) * 10) / 10} h`;
  }
}

function renderFriends(friends) {
  if (!friendList) return;
  friendList.innerHTML = "";
  if (!friends.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Nessun amico registrato";
    friendList.appendChild(empty);
    return;
  }
  friends.forEach((friend) => {
    const item = document.createElement("li");
    item.dataset.username = friend.username;
    const name = document.createElement("span");
    name.className = "friend-name";
    name.textContent = friend.username;
    const status = document.createElement("span");
    status.className = "friend-status";
    status.textContent = friend.status;
    const remove = document.createElement("button");
    remove.className = "ghost";
    remove.dataset.action = "remove";
    remove.textContent = "Rimuovi";
    item.append(name, status, remove);
    friendList.appendChild(item);
  });
}

function renderSettings(settings) {
  if (settingsEmail) settingsEmail.textContent = settings.email || "-";
  if (settings2fa) settings2fa.textContent = settings.twoFactor ? "Attiva" : "Disattivata";
  if (settingsNews) settingsNews.textContent = settings.newsletters ? "Iscritto" : "Non iscritto";
}

initialise();
