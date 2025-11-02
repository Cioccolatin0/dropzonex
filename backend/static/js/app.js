import {
  ACESFilmicToneMapping,
  AmbientLight,
  AnimationMixer,
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  Clock,
  SRGBColorSpace,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const initialDataElement = document.getElementById("initial-data");
const initialLobby = initialDataElement ? JSON.parse(initialDataElement.textContent) : null;

const playButton = document.getElementById("play-button");
const cancelButton = document.getElementById("cancel-button");
const queueStatus = document.getElementById("queue-status");
const squadContainer = document.getElementById("squad");
const heroName = document.getElementById("player-name");
const heroTitle = document.getElementById("hero-title");
const heroLevel = document.getElementById("player-level");
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
const playerAvatar = document.getElementById("player-avatar");
const passLevel = document.getElementById("pass-level");
const passProgress = document.getElementById("pass-progress");
const passProgressLabel = document.getElementById("pass-progress-label");
const passTrack = document.getElementById("pass-track");
const passPreviewCanvas = document.getElementById("pass-preview-canvas");
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
const shopPreviewCanvas = document.getElementById("shop-preview-canvas");
const shopPreviewImage = document.getElementById("shop-preview-image");
const shopPreviewName = document.getElementById("shop-preview-name");
const shopPreviewDescription = document.getElementById("shop-preview-description");
const shopPreviewRarity = document.getElementById("shop-preview-rarity");
const shopPreviewPrice = document.getElementById("shop-preview-price");
const shopPreviewType = document.getElementById("shop-preview-type");
const shopPreviewOwned = document.getElementById("shop-preview-owned");
const shopBuyButton = document.getElementById("shop-buy-button");
const shopGiftButton = document.getElementById("shop-gift-button");
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
const heroCanvas = document.getElementById("hero-canvas");
const modeCards = Array.from(document.querySelectorAll("[data-match-mode]"));
const settingAudioMaster = document.getElementById("setting-audio-master");
const settingAudioMusic = document.getElementById("setting-audio-music");
const settingAudioSfx = document.getElementById("setting-audio-sfx");
const settingGraphicsQuality = document.getElementById("setting-graphics-quality");
const settingGraphicsVsync = document.getElementById("setting-graphics-vsync");
const settingGraphicsPerformance = document.getElementById("setting-graphics-performance");
const settingControlsSens = document.getElementById("setting-controls-sens");
const settingControlsInvert = document.getElementById("setting-controls-invert");
const settingControlsRumble = document.getElementById("setting-controls-rumble");
const settingAccessibilityColor = document.getElementById("setting-accessibility-color");
const settingAccessibilitySubtitles = document.getElementById("setting-accessibility-subtitles");
const settingAccessibilityContrast = document.getElementById("setting-accessibility-contrast");
const authOverlay = document.getElementById("auth-overlay");
const authTabs = Array.from(document.querySelectorAll("[data-auth-tab]"));
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginError = document.getElementById("login-error");
const registerError = document.getElementById("register-error");

const MODE_CONFIG = {
  solo: { label: "Solo", teamSize: 1 },
  duo: { label: "Duo", teamSize: 2 },
  squad: { label: "Squad", teamSize: 4 },
};

const DEFAULT_PREFERENCES = {
  audio: { master: 80, music: 65, sfx: 90 },
  graphics: { quality: "ultra", vsync: true, performance: false },
  controls: { sensitivity: 50, invertY: false, rumble: true },
  accessibility: { colorMode: "nessuna", subtitles: true, contrast: false },
};

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
  selectedMode: null,
  preferences: {},
  heroViewer: null,
  passViewer: null,
  shopViewer: null,
  hero: initialLobby?.hero || null,
  practiceWingman: initialLobby?.practiceWingman || null,
};

class HeroViewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new Scene();
    this.scene.background = null;
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.camera = new PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 1.6, 3.6);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.55;
    this.controls.target.set(0, 1.35, 0);
    this.loader = new GLTFLoader();
    this.mixer = null;
    this.clock = new Clock();
    this.currentUrl = null;
    this.currentModel = null;
    this.animationSets = [];
    this._addLights();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  _addLights() {
    const hemi = new HemisphereLight(0x8fb8ff, 0x0b1120, 0.8);
    const key = new DirectionalLight(0xffffff, 1.05);
    key.position.set(3.5, 6, 5.5);
    const rim = new DirectionalLight(0x64ffda, 0.65);
    rim.position.set(-4.5, 5, -3.5);
    [hemi, key, rim].forEach((light) => this.scene.add(light));
  }

  setAnimationSets(animationSets) {
    this.animationSets = Array.isArray(animationSets) ? animationSets : [];
  }

  resize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const { clientWidth, clientHeight } = this.canvas.parentElement;
    if (!clientWidth || !clientHeight) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
  }

  loadOutfit(outfit) {
    if (!outfit || !outfit.modelUrl) return;
    const url = outfit.modelUrl;
    this.currentUrl = url;
    this.loader.load(
      url,
      (gltf) => {
        if (this.currentUrl !== url) return;
        this._applyModel(gltf, outfit);
      },
      undefined,
      (error) => {
        console.error("Impossibile caricare l'outfit", error);
      },
    );
  }

  _applyModel(gltf, outfit) {
    const model = gltf.scene;
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    const boundingBox = new Box3().setFromObject(model);
    const size = boundingBox.getSize(new Vector3());
    const center = boundingBox.getCenter(new Vector3());
    model.position.sub(center);
    const targetHeight = 2.6;
    const scale = size.y > 0 ? targetHeight / size.y : 1;
    model.scale.setScalar(scale);
    const postBox = new Box3().setFromObject(model);
    model.position.y -= postBox.min.y;
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
    }
    this.currentModel = model;
    this.scene.add(model);
    this.controls.target.set(0, 1.4, 0);

    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    if (gltf.animations && gltf.animations.length) {
      this.mixer = new AnimationMixer(model);
      const clip = this._resolveIdleClip(outfit, gltf.animations);
      if (clip) {
        const action = this.mixer.clipAction(clip);
        action.play();
      }
    }
  }

  _resolveIdleClip(outfit, animations) {
    if (!animations || animations.length === 0) return null;
    if (outfit?.animationSetId && this.animationSets.length) {
      const set = this.animationSets.find((entry) => entry.id === outfit.animationSetId);
      const idleName = set?.clips?.idle;
      if (idleName) {
        const match = animations.find((clip) => clip.name === idleName);
        if (match) return match;
      }
    }
    return animations[0];
  }

  animate() {
    const delta = this.clock.getDelta();
    if (this.mixer) {
      this.mixer.update(delta);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }
}

if (heroCanvas) {
  state.heroViewer = new HeroViewer(heroCanvas);
}

class ItemViewer {
  constructor(canvas) {
    this.canvas = canvas;
    if (!canvas) {
      this.renderer = null;
      return;
    }
    this.scene = new Scene();
    this.scene.background = null;
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.camera = new PerspectiveCamera(30, 1, 0.05, 50);
    this.camera.position.set(0, 0.45, 2.2);
    this.loader = new GLTFLoader();
    this.clock = new Clock();
    this.mixer = null;
    this.currentObject = null;
    this.currentToken = null;
    this.spinSpeed = 0.6;
    this.base = null;
    this._setupLights();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  _setupLights() {
    const ambient = new AmbientLight(0x1a2638, 1.15);
    const key = new DirectionalLight(0xffffff, 0.95);
    key.position.set(3, 4, 5);
    const rim = new DirectionalLight(0x68d7ff, 0.6);
    rim.position.set(-3.5, 3.5, -4);
    this.scene.add(ambient, key, rim);
  }

  resize() {
    if (!this.canvas || !this.canvas.parentElement || !this.renderer) return;
    const { clientWidth, clientHeight } = this.canvas.parentElement;
    if (!clientWidth || !clientHeight) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
  }

  clear({ hide = false } = {}) {
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
      this.currentObject = null;
    }
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    this.currentToken = null;
    if (hide && this.canvas) {
      this.canvas.hidden = true;
    }
  }

  load(preview) {
    if (!this.renderer) return;
    if (!preview) {
      this.clear({ hide: true });
      return;
    }
    this.clear();
    const token = Symbol("item-preview");
    this.currentToken = token;
    const blueprint = preview.previewBlueprint
      ? JSON.parse(JSON.stringify(preview.previewBlueprint))
      : null;
    const blueprintSpin = blueprint && typeof blueprint.spinSpeed === "number" ? blueprint.spinSpeed : null;
    this.spinSpeed = typeof preview.spinSpeed === "number" ? preview.spinSpeed : blueprintSpin || 0.6;
    const modelUrl = preview.modelUrl || null;
    if (this.canvas) this.canvas.hidden = false;
    if (blueprint && blueprint.parts && blueprint.parts.length) {
      const object = this._buildFromBlueprint(blueprint, preview);
      this._commitObject(object);
      return;
    }
    if (modelUrl) {
      this.loader.load(
        modelUrl,
        (gltf) => {
          if (this.currentToken !== token) return;
          this._applyModel(gltf, preview);
        },
        undefined,
        () => {
          if (this.currentToken === token) {
            this.clear({ hide: true });
          }
        },
      );
      return;
    }
    this.clear({ hide: true });
  }

  _buildFromBlueprint(blueprint, preview) {
    const group = new Group();
    const parts = Array.isArray(blueprint.parts) ? blueprint.parts : [];
    parts.forEach((part) => {
      let mesh = null;
      if (part.type === "box") {
        const size = part.size || [1, 1, 1];
        mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]), this._createMaterial(part, preview));
      } else if (part.type === "cylinder") {
        const radiusTop = part.radiusTop ?? part.radius ?? 0.05;
        const radiusBottom = part.radiusBottom ?? part.radius ?? radiusTop;
        const height = part.height ?? 0.2;
        const radial = part.radialSegments ?? 36;
        mesh = new Mesh(new CylinderGeometry(radiusTop, radiusBottom, height, radial), this._createMaterial(part, preview));
      } else {
        return;
      }
      const position = part.position || [0, 0, 0];
      mesh.position.set(position[0] || 0, position[1] || 0, position[2] || 0);
      const rotation = part.rotation || [0, 0, 0];
      mesh.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
      group.add(mesh);
    });
    if (blueprint.scale) {
      group.scale.setScalar(blueprint.scale);
    }
    if (blueprint.rotation) {
      group.rotation.set(
        blueprint.rotation[0] || 0,
        blueprint.rotation[1] || 0,
        blueprint.rotation[2] || 0,
      );
    }
    group.userData.targetHeight = blueprint.targetHeight || 0.85;
    return group;
  }

  _createMaterial(part, preview) {
    const baseColor = part.color || preview.accentColor || "#f2f5ff";
    const material = new MeshStandardMaterial({
      color: new Color(baseColor),
      roughness: part.roughness ?? 0.32,
      metalness: part.metalness ?? 0.48,
    });
    const emissiveColor = part.emissive || preview.emissive || null;
    if (emissiveColor) {
      material.emissive = new Color(emissiveColor);
      material.emissiveIntensity = part.emissiveIntensity ?? preview.emissiveIntensity ?? 0.65;
    }
    return material;
  }

  _ensureBase() {
    if (this.base) return;
    const geometry = new CylinderGeometry(0.82, 0.82, 0.04, 48);
    const material = new MeshStandardMaterial({
      color: new Color("#060d18"),
      roughness: 0.6,
      metalness: 0.18,
    });
    this.base = new Mesh(geometry, material);
    this.base.position.y = 0;
    this.scene.add(this.base);
  }

  _commitObject(object) {
    if (!object) return;
    const bounding = new Box3().setFromObject(object);
    const size = bounding.getSize(new Vector3());
    const center = bounding.getCenter(new Vector3());
    object.position.sub(center);
    const targetHeight = object.userData?.targetHeight || 0.85;
    const scale = size.y > 0 ? targetHeight / size.y : 1;
    object.scale.multiplyScalar(scale);
    const postBox = new Box3().setFromObject(object);
    object.position.y -= postBox.min.y;
    this._ensureBase();
    this.scene.add(object);
    this.currentObject = object;
  }

  _applyModel(gltf, preview) {
    const model = gltf.scene;
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        if (preview?.accentColor && child.material) {
          child.material = child.material.clone();
          const tint = new Color(preview.accentColor);
          if (child.material.color) {
            child.material.color.lerp(tint, 0.6);
          } else {
            child.material.color = tint;
          }
        }
        if (preview?.emissive && child.material) {
          child.material.emissive = new Color(preview.emissive);
          child.material.emissiveIntensity = 0.6;
        }
      }
    });
    if (gltf.animations && gltf.animations.length) {
      this.mixer = new AnimationMixer(model);
      const clip = gltf.animations[0];
      this.mixer.clipAction(clip).play();
    }
    this._commitObject(model);
  }

  animate() {
    if (!this.renderer) return;
    const delta = this.clock.getDelta();
    if (this.mixer) {
      this.mixer.update(delta);
    }
    if (this.currentObject) {
      this.currentObject.rotation.y += delta * this.spinSpeed;
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }
}

if (passPreviewCanvas) {
  state.passViewer = new ItemViewer(passPreviewCanvas);
}

if (shopPreviewCanvas) {
  state.shopViewer = new ItemViewer(shopPreviewCanvas);
}

function cloneDefaultPreferences() {
  return JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
}

function loadPreferences() {
  try {
    const raw = window.localStorage.getItem("dropzonex-preferences");
    if (!raw) return cloneDefaultPreferences();
    const parsed = JSON.parse(raw);
    return mergePreferences(parsed);
  } catch (error) {
    console.warn("Impossibile caricare le preferenze, uso i default", error);
    return cloneDefaultPreferences();
  }
}

function mergePreferences(partial) {
  const base = cloneDefaultPreferences();
  if (!partial || typeof partial !== "object") return base;
  for (const [section, values] of Object.entries(partial)) {
    if (typeof base[section] !== "object" || typeof values !== "object") continue;
    Object.assign(base[section], values);
  }
  return base;
}

function persistPreferences() {
  try {
    window.localStorage.setItem("dropzonex-preferences", JSON.stringify(state.preferences));
  } catch (error) {
    console.warn("Impossibile salvare le preferenze", error);
  }
}

function setPreference(path, value) {
  if (!path) return;
  const [section, key] = path.split(".");
  if (!section || !key) return;
  if (!state.preferences[section]) {
    state.preferences[section] = {};
  }
  state.preferences[section][key] = value;
  persistPreferences();
}

function getPreference(path, fallback) {
  if (!path) return fallback;
  const [section, key] = path.split(".");
  if (!section || !key) return fallback;
  return state.preferences?.[section]?.[key] ?? fallback;
}

function applyPreferenceControls() {
  if (settingAudioMaster) settingAudioMaster.value = getPreference("audio.master", DEFAULT_PREFERENCES.audio.master);
  if (settingAudioMusic) settingAudioMusic.value = getPreference("audio.music", DEFAULT_PREFERENCES.audio.music);
  if (settingAudioSfx) settingAudioSfx.value = getPreference("audio.sfx", DEFAULT_PREFERENCES.audio.sfx);
  if (settingGraphicsQuality) settingGraphicsQuality.value = getPreference("graphics.quality", DEFAULT_PREFERENCES.graphics.quality);
  if (settingGraphicsVsync) settingGraphicsVsync.checked = getPreference("graphics.vsync", DEFAULT_PREFERENCES.graphics.vsync);
  if (settingGraphicsPerformance) settingGraphicsPerformance.checked = getPreference("graphics.performance", DEFAULT_PREFERENCES.graphics.performance);
  if (settingControlsSens) settingControlsSens.value = getPreference("controls.sensitivity", DEFAULT_PREFERENCES.controls.sensitivity);
  if (settingControlsInvert) settingControlsInvert.checked = getPreference("controls.invertY", DEFAULT_PREFERENCES.controls.invertY);
  if (settingControlsRumble) settingControlsRumble.checked = getPreference("controls.rumble", DEFAULT_PREFERENCES.controls.rumble);
  if (settingAccessibilityColor) settingAccessibilityColor.value = getPreference("accessibility.colorMode", DEFAULT_PREFERENCES.accessibility.colorMode);
  if (settingAccessibilitySubtitles) settingAccessibilitySubtitles.checked = getPreference("accessibility.subtitles", DEFAULT_PREFERENCES.accessibility.subtitles);
  if (settingAccessibilityContrast) settingAccessibilityContrast.checked = getPreference("accessibility.contrast", DEFAULT_PREFERENCES.accessibility.contrast);
}

function bindPreferenceControl(element, path, options = {}) {
  if (!element) return;
  const events = options.events || ["input", "change"];
  const transform = options.transform;
  const handler = () => {
    const raw = element.type === "checkbox" ? element.checked : element.value;
    const value = transform ? transform(raw, element) : raw;
    setPreference(path, value);
  };
  events.forEach((eventName) => element.addEventListener(eventName, handler));
}

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

function buildPreviewPayload({ preview, reward, fallbackThumbnail }) {
  const payload = preview ? JSON.parse(JSON.stringify(preview)) : {};
  if (reward) {
    if (reward.previewBlueprint && !payload.previewBlueprint) {
      payload.previewBlueprint = reward.previewBlueprint;
    }
    if (reward.accentColor && !payload.accentColor) {
      payload.accentColor = reward.accentColor;
    }
    if (reward.modelUrl && !payload.modelUrl) {
      payload.modelUrl = reward.modelUrl;
    }
    if (reward.emissive && !payload.emissive) {
      payload.emissive = reward.emissive;
    }
    if (reward.spinSpeed && !payload.spinSpeed) {
      payload.spinSpeed = reward.spinSpeed;
    }
    if (reward.thumbnailUrl && !payload.thumbnailUrl) {
      payload.thumbnailUrl = reward.thumbnailUrl;
    }
  }
  if (fallbackThumbnail && !payload.thumbnailUrl) {
    payload.thumbnailUrl = fallbackThumbnail;
  }
  return payload;
}

function renderPreviewMedia({ viewer, canvas, image, preview, fallbackUrl, alt }) {
  const hasViewer = Boolean(viewer && typeof viewer.load === "function");
  const hasMedia = Boolean(hasViewer && preview && (preview.previewBlueprint || preview.modelUrl));
  const resolvedFallback = fallbackUrl || preview?.thumbnailUrl || "";
  if (hasMedia && hasViewer) {
    viewer.load(preview);
    if (canvas) canvas.hidden = false;
    if (image) {
      if (resolvedFallback) image.src = resolvedFallback;
      image.alt = alt || "Anteprima";
      image.hidden = true;
    }
  } else {
    if (viewer) viewer.clear({ hide: true });
    if (canvas) canvas.hidden = true;
    if (image) {
      if (resolvedFallback) image.src = resolvedFallback;
      image.alt = alt || "Anteprima";
      image.hidden = false;
    }
  }
}

function selectMatchMode(mode, options = {}) {
  const valid = MODE_CONFIG[mode] ? mode : null;
  state.selectedMode = valid;
  modeCards.forEach((card) => {
    const active = card.dataset.matchMode === state.selectedMode;
    card.classList.toggle("selected", active);
    card.setAttribute("aria-pressed", active ? "true" : "false");
  });
  if (!options.silent) {
    if (state.selectedMode && !state.sessionId && queueStatus) {
      queueStatus.textContent = `Pronto a lanciarti in ${MODE_CONFIG[state.selectedMode].label}.`;
    } else if (!state.sessionId && queueStatus) {
      queueStatus.textContent = "Seleziona una modalità per iniziare.";
    }
  }
  updatePlayButtonIdle();
}

function updatePlayButtonIdle() {
  if (!playButton || state.sessionId) return;
  if (state.selectedMode) {
    playButton.disabled = false;
    playButton.textContent = "Avvia";
    if (queueStatus) {
      queueStatus.textContent = `Pronto a lanciarti in ${MODE_CONFIG[state.selectedMode].label}.`;
    }
  } else {
    playButton.disabled = true;
    playButton.textContent = "Gioca";
    if (queueStatus) {
      queueStatus.textContent = "Seleziona una modalità per iniziare.";
    }
  }
}

function setQueueSearching() {
  if (queueStatus) queueStatus.textContent = "Ricerca giocatori in corso...";
  if (playButton) {
    playButton.disabled = true;
    playButton.textContent = "Ricerca in corso...";
  }
  if (cancelButton) {
    cancelButton.hidden = false;
    cancelButton.disabled = false;
  }
  renderSquadStatus();
}

function initialise() {
  initialiseAuth();
  bindNavigation();
  bindMatchmaking();
  bindCosmetics();
  bindBattlePass();
  bindShop();
  bindFriends();
  bindSettings();
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
  if (playButton) {
    playButton.addEventListener("click", async () => {
      if (state.sessionId && state.latestSession && state.latestSession.match) {
        await startMatch();
        return;
      }
      await startQueue();
    });
  }

  if (cancelButton) {
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

  modeCards.forEach((card) => {
    card.addEventListener("click", () => {
      selectMatchMode(card.dataset.matchMode || "");
    });
  });

  updatePlayButtonIdle();
}

function hydrateLobby(lobby) {
  if (!lobby) return;
  state.cosmetics = lobby.cosmetics || null;
  state.battlePass = lobby.battlePass || null;
  state.shop = lobby.shop || null;
  state.hero = lobby.hero || state.hero;
  state.practiceWingman = lobby.practiceWingman || state.practiceWingman;
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
  if (playerAvatar && lobby.hero?.cosmetics?.equippedOutfit?.thumbnailUrl) {
    playerAvatar.src = lobby.hero.cosmetics.equippedOutfit.thumbnailUrl;
    playerAvatar.alt = `Profilo di ${lobby.hero.displayName}`;
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
  if (state.heroViewer) {
    state.heroViewer.setAnimationSets(lobby.cosmetics?.animationSets || []);
    const viewerOutfit = lobby.hero?.outfit || lobby.hero?.cosmetics?.equippedOutfit || lobby.cosmetics?.equippedOutfit;
    if (viewerOutfit) {
      state.heroViewer.loadOutfit(viewerOutfit);
    }
  }
  if (!state.sessionId && (!state.latestSession || state.latestSession.status === "idle")) {
    renderSquadStatus();
  }
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
  if (!state.selectedMode) {
    if (queueStatus) {
      queueStatus.textContent = "Seleziona una modalità prima di avviare.";
    }
    updatePlayButtonIdle();
    return;
  }
  setQueueSearching();
  try {
    const response = await apiFetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: heroName ? heroName.textContent : "Operatore", mode: state.selectedMode }),
    });
    if (!response.ok) {
      throw new Error(`Queue failed with status ${response.status}`);
    }
    const session = await response.json();
    state.sessionId = session.sessionId;
    state.latestSession = session;
    if (session.mode) {
      selectMatchMode(session.mode, { silent: true });
    }
    renderSession(session);
    connectMatchmakingSocket(session.sessionId);
    beginPolling();
  } catch (error) {
    console.error("Errore durante il matchmaking", error);
    queueStatus.textContent = "Errore di matchmaking. Riprova.";
    if (cancelButton) cancelButton.hidden = true;
    updatePlayButtonIdle();
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
  if (session.mode) {
    selectMatchMode(session.mode, { silent: true });
  }
  if (session.status === "waiting") {
    const position = session.queuePosition ?? 1;
    const label = session.modeLabel || (session.mode && MODE_CONFIG[session.mode]?.label);
    const queueSize = Math.max(session.queueSize || 0, session.playersSearching || 0, position);
    if (queueStatus) {
      queueStatus.textContent = label
        ? `Coda ${label} · posizione ${position} su ${queueSize}`
        : `In coda · posizione ${position} su ${queueSize}`;
    }
    if (playButton) {
      playButton.textContent = "Ricerca in corso...";
      playButton.disabled = true;
    }
    if (cancelButton) {
      cancelButton.hidden = false;
      cancelButton.disabled = false;
    }
    renderSquadStatus(session);
  } else if (session.status === "matched" && session.match) {
    const practice = Boolean(session.match.practiceMatch);
    if (queueStatus) {
      queueStatus.textContent = practice
        ? `Sessione di prova pronta: ${session.match.map}`
        : `Match trovato: ${session.match.mode} · ${session.match.map}`;
    }
    if (playButton) {
      playButton.textContent = practice ? "Avvia simulazione" : "Entra nel match";
      playButton.disabled = false;
    }
    if (cancelButton) {
      cancelButton.hidden = false;
      cancelButton.disabled = false;
    }
    renderSquad(extractSquadMembers(session.match, session));
  } else if (session.status === "playing") {
    const practice = Boolean(session.match?.practiceMatch);
    if (queueStatus)
      queueStatus.textContent = practice
        ? "Simulazione in corso. Buona fortuna!"
        : "Sessione avviata. Buona fortuna!";
    if (playButton) {
      playButton.disabled = false;
      playButton.textContent = practice ? "Continua simulazione" : "Avvia";
    }
    if (cancelButton) cancelButton.hidden = true;
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

function createSquadMemberElement(member = {}, options = {}) {
  const item = document.createElement("div");
  const isBot = options.forceBot ?? member.isBot ?? false;
  item.className = "squad-member";
  if (isBot) {
    item.classList.add("bot");
  }

  const avatar = document.createElement("div");
  avatar.className = "squad-avatar";
  const thumb =
    options.thumbnail || member.cosmetics?.thumbnailUrl || member.cosmetics?.thumbnail || member.cosmetics?.iconUrl;
  if (thumb) {
    avatar.style.backgroundImage = `url(${thumb})`;
  } else {
    avatar.classList.add("no-thumb");
  }

  const info = document.createElement("div");
  info.className = "squad-info";
  const name = document.createElement("span");
  name.textContent = options.displayName || member.displayName || "Operatore";
  info.appendChild(name);

  const cosmeticName = options.cosmeticName || member.cosmetics?.name;
  if (cosmeticName) {
    const detail = document.createElement("span");
    detail.className = "cosmetic-tag";
    detail.textContent = cosmeticName;
    info.appendChild(detail);
  }

  if (options.subLabel) {
    const sub = document.createElement("span");
    sub.className = "cosmetic-sub";
    sub.textContent = options.subLabel;
    info.appendChild(sub);
  }

  const badge = document.createElement("span");
  badge.className = "squad-role";
  badge.textContent = options.role || member.role || (isBot ? "BOT" : "GIOCATORE");

  item.appendChild(avatar);
  item.appendChild(info);
  item.appendChild(badge);

  const statusText = options.statusText || member.statusText;
  if (statusText) {
    const status = document.createElement("span");
    status.className = "squad-member-status";
    status.textContent = statusText;
    item.appendChild(status);
  }

  return item;
}

function renderSquad(squad) {
  squadContainer.innerHTML = "";
  if (!squad || squad.length === 0) {
    renderSquadStatus();
    return;
  }

  squad.forEach((member) => {
    const behavior = member.behavior
      ? member.behavior.charAt(0).toUpperCase() + member.behavior.slice(1)
      : null;
    const statusText = behavior ? `Stile ${behavior}` : undefined;
    const element = createSquadMemberElement(member, { statusText });
    squadContainer.appendChild(element);
  });
}

function renderSquadStatus(session) {
  squadContainer.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "squad-status";

  const membersRow = document.createElement("div");
  membersRow.className = "squad-status-members";

  const heroData = state.hero || initialLobby?.hero;
  if (heroData) {
    const heroOutfit = heroData.cosmetics?.equippedOutfit || heroData.outfit || {};
    const heroMember = createSquadMemberElement(
      {
        displayName: heroData.displayName,
        cosmetics: heroOutfit,
        isBot: false,
      },
      {
        role: "TU",
        cosmeticName: heroOutfit.name,
        statusText: session?.status === "waiting" ? "Pronto al lancio" : "Disponibile",
        subLabel: heroData.loadout?.primary ? `Equipaggiamento: ${heroData.loadout.primary}` : undefined,
      }
    );
    membersRow.appendChild(heroMember);
  }

  if (state.practiceWingman) {
    const wingman = state.practiceWingman;
    const wingmanCosmetics = wingman.cosmetics || {};
    const wingmanMember = createSquadMemberElement(
      {
        displayName: wingman.displayName,
        cosmetics: wingmanCosmetics,
        isBot: true,
      },
      {
        role: wingman.role || "SUPPORTO IA",
        cosmeticName: wingmanCosmetics.name,
        statusText: wingman.status,
        subLabel: wingmanCosmetics.weaponSkin ? `Arma: ${wingmanCosmetics.weaponSkin.name}` : undefined,
      }
    );
    membersRow.appendChild(wingmanMember);
  }

  wrapper.appendChild(membersRow);

  const message = document.createElement("p");
  message.className = "squad-status-message";
  if (session && session.status === "waiting") {
    const position = session.queuePosition || 1;
    const queueSize = Math.max(session.queueSize || 0, position);
    const label = session.modeLabel || (session.mode && MODE_CONFIG[session.mode]?.label) || "Dropzone";
    message.textContent = `Ricerca ${label} · posizione ${position} su ${queueSize}.`;
  } else if (state.selectedMode) {
    const modeLabel = MODE_CONFIG[state.selectedMode]?.label || "Dropzone";
    message.textContent = `Premi "Gioca" per avviare una partita ${modeLabel}.`;
  } else {
    message.textContent = "Seleziona una modalità per formare la squadra.";
  }
  wrapper.appendChild(message);

  if (session?.playersSearching && session.playersSearching > 1) {
    const queueMeta = document.createElement("p");
    queueMeta.className = "squad-status-meta";
    queueMeta.textContent = `${session.playersSearching} operatori sono attualmente in coda.`;
    wrapper.appendChild(queueMeta);
  }

  if (state.practiceWingman) {
    const practiceMeta = document.createElement("p");
    practiceMeta.className = "squad-status-meta";
    practiceMeta.textContent = `${state.practiceWingman.displayName} si unirà come ${
      state.practiceWingman.role?.toLowerCase() || "supporto IA"
    } se la squadra necessita di rinforzi.`;
    wrapper.appendChild(practiceMeta);
  }

  squadContainer.appendChild(wrapper);
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
  if (cancelButton) {
    cancelButton.hidden = true;
    cancelButton.disabled = false;
  }
  renderSquadStatus();
  updatePlayButtonIdle();
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
    passClaimButton.textContent = "Nessuna ricompensa";
    if (passPreviewName) passPreviewName.textContent = "Nessuna ricompensa selezionata";
    if (passPreviewDescription)
      passPreviewDescription.textContent = "Apri un tier del Battle Pass per scoprire dettagli e requisiti.";
    if (passPreviewRarity) passPreviewRarity.textContent = "-";
    if (passPreviewStatus) passPreviewStatus.textContent = "-";
    if (passPreviewReward) passPreviewReward.textContent = "-";
    if (passPreviewPremium) passPreviewPremium.textContent = "-";
    renderPreviewMedia({
      viewer: state.passViewer,
      canvas: passPreviewCanvas,
      image: passPreviewImage,
      preview: null,
      fallbackUrl: "",
      alt: "Anteprima ricompensa",
    });
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
  const previewData = buildPreviewPayload({
    preview: tier.preview,
    reward: tier.reward,
    fallbackThumbnail: tier.thumbnailUrl,
  });
  renderPreviewMedia({
    viewer: state.passViewer,
    canvas: passPreviewCanvas,
    image: passPreviewImage,
    preview: previewData,
    fallbackUrl: previewData.thumbnailUrl || tier.thumbnailUrl,
    alt: tier.name,
  });

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
  if (state.heroViewer) {
    state.heroViewer.setAnimationSets(cosmetics?.animationSets || []);
    const viewerOutfit = hero?.outfit || cosmetics?.equippedOutfit;
    if (viewerOutfit) {
      state.heroViewer.loadOutfit(viewerOutfit);
    }
  }
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
      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) return;
      const item = actionButton.closest("[data-username]");
      if (!item) return;
      const username = item.dataset.username;
      const action = actionButton.dataset.action;
      try {
        if (action === "remove") {
          const response = await apiFetch(`/api/friends/${encodeURIComponent(username)}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            throw new Error(`Remove friend failed: ${response.status}`);
          }
          await refreshLobby();
        } else if (action === "invite") {
          if (friendFeedback) {
            friendFeedback.textContent = `Invito inviato a ${username}`;
            friendFeedback.hidden = false;
            window.setTimeout(() => {
              friendFeedback.hidden = true;
            }, 2000);
          }
        } else if (action === "gift") {
          if (!state.selectedShopItemId) {
            if (friendFeedback) {
              friendFeedback.textContent = "Seleziona prima un oggetto nel negozio da regalare.";
              friendFeedback.hidden = false;
              window.setTimeout(() => {
                friendFeedback.hidden = true;
              }, 2500);
            }
            return;
          }
          await sendShopGift(state.selectedShopItemId, username, "Regalo dalla tua lista amici");
          if (friendFeedback) {
            friendFeedback.textContent = `Regalo inviato a ${username}`;
            friendFeedback.hidden = false;
            window.setTimeout(() => {
              friendFeedback.hidden = true;
            }, 2500);
          }
        }
      } catch (error) {
        console.error("Azione amici non riuscita", error);
      }
    });
  }
}

function bindSettings() {
  state.preferences = loadPreferences();
  applyPreferenceControls();
  bindPreferenceControl(settingAudioMaster, "audio.master", { transform: (value) => Number(value) });
  bindPreferenceControl(settingAudioMusic, "audio.music", { transform: (value) => Number(value) });
  bindPreferenceControl(settingAudioSfx, "audio.sfx", { transform: (value) => Number(value) });
  bindPreferenceControl(settingGraphicsQuality, "graphics.quality");
  bindPreferenceControl(settingGraphicsVsync, "graphics.vsync");
  bindPreferenceControl(settingGraphicsPerformance, "graphics.performance");
  bindPreferenceControl(settingControlsSens, "controls.sensitivity", { transform: (value) => Number(value) });
  bindPreferenceControl(settingControlsInvert, "controls.invertY");
  bindPreferenceControl(settingControlsRumble, "controls.rumble");
  bindPreferenceControl(settingAccessibilityColor, "accessibility.colorMode");
  bindPreferenceControl(settingAccessibilitySubtitles, "accessibility.subtitles");
  bindPreferenceControl(settingAccessibilityContrast, "accessibility.contrast");
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
    if (shopGiftButton) {
      shopGiftButton.disabled = true;
      shopGiftButton.dataset.itemId = "";
    }
    if (shopPreviewName) shopPreviewName.textContent = "Nessuna offerta disponibile";
    if (shopPreviewDescription)
      shopPreviewDescription.textContent = "Torna più tardi per scoprire nuove offerte nello store Dropzone.";
    if (shopPreviewRarity) shopPreviewRarity.textContent = "-";
    if (shopPreviewPrice) shopPreviewPrice.textContent = "-";
    if (shopPreviewType) shopPreviewType.textContent = "-";
    if (shopPreviewOwned) shopPreviewOwned.textContent = "-";
    renderPreviewMedia({
      viewer: state.shopViewer,
      canvas: shopPreviewCanvas,
      image: shopPreviewImage,
      preview: null,
      fallbackUrl: "",
      alt: "Anteprima oggetto",
    });
    shopBuyButton.textContent = "Nessun oggetto";
    return;
  }

  if (shopPreviewName) shopPreviewName.textContent = item.name;
  if (shopPreviewDescription) shopPreviewDescription.textContent = item.description || "";
  if (shopPreviewRarity) shopPreviewRarity.textContent = item.rarity || "";
  if (shopPreviewPrice) shopPreviewPrice.textContent = `${item.price} ${String(item.currency || "").toUpperCase()}`;
  if (shopPreviewType) shopPreviewType.textContent = formatShopReward(item);
  if (shopPreviewOwned) shopPreviewOwned.textContent = item.owned ? "Sì" : "No";
  const previewData = buildPreviewPayload({
    preview: item.preview,
    reward: null,
    fallbackThumbnail: item.thumbnailUrl,
  });
  renderPreviewMedia({
    viewer: state.shopViewer,
    canvas: shopPreviewCanvas,
    image: shopPreviewImage,
    preview: previewData,
    fallbackUrl: previewData.thumbnailUrl || item.thumbnailUrl,
    alt: item.name,
  });
  shopBuyButton.dataset.itemId = item.id;
  shopBuyButton.disabled = Boolean(item.owned);
  shopBuyButton.textContent = item.owned ? "Già acquistato" : "Acquista";
  if (shopGiftButton) {
    shopGiftButton.dataset.itemId = item.id;
    shopGiftButton.disabled = !state.token;
  }
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
  if (shopGiftButton) {
    shopGiftButton.addEventListener("click", async () => {
      if (shopGiftButton.disabled) return;
      const itemId = shopGiftButton.dataset.itemId;
      if (!itemId) return;
      const recipient = window.prompt("Inserisci l'username del destinatario");
      if (!recipient) return;
      const message = window.prompt("Messaggio (opzionale)") || "";
      await sendShopGift(itemId, recipient, message);
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

async function sendShopGift(itemId, recipient, message) {
  if (!state.token) {
    showAuthOverlay("login");
    return;
  }
  try {
    const response = await apiFetch("/api/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, itemType: "shop", recipient, message }),
    });
    if (!response.ok) {
      throw new Error(`Gift failed ${response.status}`);
    }
    await response.json();
    await refreshLobby();
  } catch (error) {
    console.error("Impossibile inviare il regalo", error);
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
    const identity = document.createElement("div");
    identity.className = "friend-identity";
    const dot = document.createElement("span");
    dot.className = "status-dot";
    const presence = friend.online ? friend.presence || "online" : friend.presence || friend.status || "offline";
    dot.dataset.status = presence;
    const name = document.createElement("span");
    name.className = "friend-name";
    name.textContent = friend.username;
    const status = document.createElement("span");
    status.className = "friend-status";
    status.textContent = friendStatusLabel(friend);
    identity.append(dot, name, status);

    const actions = document.createElement("div");
    actions.className = "friend-actions";
    const invite = document.createElement("button");
    invite.className = "ghost";
    invite.dataset.action = "invite";
    invite.textContent = "Invita";
    const gift = document.createElement("button");
    gift.className = "ghost";
    gift.dataset.action = "gift";
    gift.textContent = "Regala";
    const remove = document.createElement("button");
    remove.className = "ghost";
    remove.dataset.action = "remove";
    remove.textContent = "Rimuovi";
    actions.append(invite, gift, remove);

    item.append(identity, actions);
    friendList.appendChild(item);
  });
}

function friendStatusLabel(friend) {
  if (!friend) return "Offline";
  if (friend.online) {
    switch (friend.presence) {
      case "waiting":
        return "In coda";
      case "matched":
        return "Match trovato";
      case "playing":
        return "In partita";
      default:
        return "Online";
    }
  }
  switch (friend.status) {
    case "pending":
      return "In attesa";
    case "blocked":
      return "Bloccato";
    case "accepted":
      return "Offline";
    default:
      return friend.status ? friend.status.charAt(0).toUpperCase() + friend.status.slice(1) : "Offline";
  }
}

function renderSettings(settings) {
  if (settingsEmail) settingsEmail.textContent = settings.email || "-";
  if (settings2fa) settings2fa.textContent = settings.twoFactor ? "Attiva" : "Disattivata";
  if (settingsNews) settingsNews.textContent = settings.newsletters ? "Iscritto" : "Non iscritto";
}

initialise();
