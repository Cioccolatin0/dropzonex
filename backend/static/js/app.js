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
const profileMatches = document.getElementById("profile-matches");
const profileWins = document.getElementById("profile-wins");
const profileWinrate = document.getElementById("profile-winrate");
const profileKdr = document.getElementById("profile-kdr");
const profileTime = document.getElementById("profile-time");
const navButtons = Array.from(document.querySelectorAll(".nav-btn"));
const viewSections = Array.from(document.querySelectorAll("[data-view-section]"));
const allowedViews = new Set(["play", "pass", "locker", "shop", "profile"]);

const state = {
  sessionId: null,
  pollHandle: null,
  latestSession: null,
  cosmetics: null,
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
  bindCosmetics();
  const url = new URL(window.location.href);
  const requestedView = url.searchParams.get("view") || document.body.dataset.activeView;
  toggleView(requestedView);
  window.setInterval(refreshLobby, 10000);
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
  state.cosmetics = lobby.cosmetics || null;
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
  renderPassTrack(lobby.battlePass.rewards || []);
  renderLocker(lobby.locker || {}, lobby.cosmetics || {}, lobby.hero || {});
  renderOutfitList(lobby.cosmetics?.outfits || [], lobby.hero?.outfit?.id);
  renderWeaponSkinList(lobby.cosmetics?.weaponSkins || [], lobby.hero?.weaponSkin?.id);
  populateAnimationSelect(lobby.cosmetics?.animationSets || [], lobby.hero?.outfit?.animationSetId);
  renderShopList(shopFeatured, lobby.shop?.featured || []);
  renderShopList(shopDaily, lobby.shop?.daily || []);
  renderProfile(lobby.profile || {});
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
    renderSquad(extractSquadMembers(session.match, session));
  } else if (session.status === "playing") {
    queueStatus.textContent = "Sessione avviata. Buona fortuna!";
    playButton.textContent = "Avvia Matchmaking";
    playButton.disabled = false;
    cancelButton.hidden = true;
    renderSquad(session.match ? extractSquadMembers(session.match, session) : null);
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
    const response = await fetch(`/api/session/${state.sessionId}/start`, {
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
  state.sessionId = null;
  state.latestSession = null;
  playButton.disabled = false;
  playButton.textContent = "Avvia Matchmaking";
  cancelButton.hidden = true;
  queueStatus.textContent = "Pronto a lanciarti.";
  renderSquadPlaceholder();
}

function renderPassTrack(rewards) {
  if (!passTrack) return;
  passTrack.innerHTML = "";
  rewards.forEach((reward) => {
    const item = document.createElement("li");
    const tier = document.createElement("span");
    tier.className = "label";
    tier.textContent = `Tier ${reward.tier}`;
    const rewardName = document.createElement("strong");
    rewardName.textContent = reward.reward;
    item.appendChild(tier);
    item.appendChild(rewardName);
    passTrack.appendChild(item);
  });
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
    item.className = `cosmetic-item${equippedId && equippedId === outfit.id ? " equipped" : ""}`;
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
    button.className = "equip-btn";
    button.dataset.equipOutfit = outfit.id;
    button.textContent = equippedId && equippedId === outfit.id ? "Equipaggiata" : "Equipaggia";

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
    item.className = `cosmetic-item${equippedId && equippedId === skin.id ? " equipped" : ""}`;
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
    button.textContent = equippedId && equippedId === skin.id ? "Equipaggiata" : "Equipaggia";

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
        const response = await fetch("/api/cosmetics/outfits", {
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
        const response = await fetch("/api/cosmetics/weapon-skins", {
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
    const response = await fetch("/api/locker/equip", {
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

function renderShopList(container, items) {
  if (!container) return;
  container.innerHTML = "";
  items.forEach((item) => {
    const row = document.createElement("li");
    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = item.name;
    const rarity = document.createElement("span");
    rarity.className = "rarity";
    rarity.textContent = item.rarity;
    info.appendChild(name);
    info.appendChild(rarity);
    const price = document.createElement("span");
    price.className = "price";
    price.textContent = `${item.price} ⛁`;
    row.appendChild(info);
    row.appendChild(price);
    container.appendChild(row);
  });
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

initialise();
