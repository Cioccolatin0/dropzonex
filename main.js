import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/loaders/GLTFLoader.js';

const API_BASE = '';

const canvas = document.getElementById('game-canvas');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const loadingStatus = document.getElementById('loading-status');
const queueStatus = document.getElementById('queue-status');
const queueStatusLabel = document.getElementById('queue-status-label');
const queueStatusList = document.getElementById('queue-status-list');
const queueStatusDetail = document.getElementById('queue-status-detail');
const homeNavButtons = Array.from(document.querySelectorAll('.home-nav button'));
const homePanels = new Map(
  Array.from(document.querySelectorAll('.home-panel')).map((panel) => [panel.dataset.section, panel])
);
const currencyDisplays = {
  credits: document.getElementById('currency-credits'),
  flux: document.getElementById('currency-flux'),
  tokens: document.getElementById('currency-tokens'),
  matchCredits: document.getElementById('match-credits'),
  matchTokens: document.getElementById('match-tokens'),
};
const passLevelDisplay = document.getElementById('pass-level');
const passProgressFill = document.getElementById('pass-progress-fill');
const matchModeDisplay = document.getElementById('match-mode');
const matchTimerDisplay = document.getElementById('match-timer');
const squadRosterList = document.getElementById('squad-roster-list');

let metaProgress = {
  credits: 0,
  flux: 0,
  tokens: 0,
  passLevel: 0,
  passProgress: 0,
  mode: 'Modalità in preparazione',
};
let assetsReady = false;
let lobbyReady = false;
let queueing = false;
let sessionId = null;
let queuePollHandle = null;
let currentMatch = null;

let activeHomeSection = 'play';

function formatMeta(value) {
  return value.toLocaleString('it-IT');
}

function updateMetaUI() {
  if (currencyDisplays.credits) {
    currencyDisplays.credits.textContent = formatMeta(metaProgress.credits ?? 0);
  }
  if (currencyDisplays.flux) {
    currencyDisplays.flux.textContent = formatMeta(metaProgress.flux ?? 0);
  }
  if (currencyDisplays.tokens) {
    currencyDisplays.tokens.textContent = formatMeta(metaProgress.tokens ?? 0);
  }
  if (currencyDisplays.matchCredits) {
    currencyDisplays.matchCredits.textContent = formatMeta(metaProgress.credits ?? 0);
  }
  if (currencyDisplays.matchTokens) {
    currencyDisplays.matchTokens.textContent = formatMeta(metaProgress.tokens ?? 0);
  }
  if (passLevelDisplay) {
    passLevelDisplay.textContent = Math.max(0, metaProgress.passLevel ?? 0).toString();
  }
  if (passProgressFill && passProgressFill.parentElement) {
    const percent = Math.round((metaProgress.passProgress ?? 0) * 100);
    passProgressFill.style.width = `${percent}%`;
    passProgressFill.parentElement.setAttribute('aria-valuenow', percent.toString());
  }
  if (matchModeDisplay) {
    matchModeDisplay.textContent = `Modalità: ${metaProgress.mode}`;
  }
}

function updateQueueStatus(message, listItems = [], detail = '') {
  if (queueStatusLabel) {
    queueStatusLabel.textContent = message;
  }
  if (queueStatusDetail) {
    queueStatusDetail.textContent = detail;
  }
  if (queueStatusList) {
    queueStatusList.innerHTML = '';
    listItems.forEach((item) => {
      const entry = document.createElement('li');
      entry.textContent = item;
      queueStatusList.appendChild(entry);
    });
  }
}

function renderRoster(squad = []) {
  if (!squadRosterList) {
    return;
  }
  squadRosterList.innerHTML = '';
  squad.forEach((member) => {
    const li = document.createElement('li');
    const nameSpan = document.createElement('span');
    nameSpan.textContent = member.displayName;
    const tag = document.createElement('span');
    tag.className = 'roster-tag';
    tag.textContent = member.isBot ? 'BOT' : 'PILOTA';
    li.appendChild(nameSpan);
    li.appendChild(tag);
    squadRosterList.appendChild(li);
  });
}

async function fetchLobbyMeta() {
  try {
    const response = await fetch(`${API_BASE}/api/lobby`);
    if (!response.ok) {
      throw new Error('Impossibile recuperare i dati della lobby');
    }
    const data = await response.json();
    metaProgress = {
      credits: data.currencies?.credits ?? 0,
      flux: data.currencies?.flux ?? 0,
      tokens: data.currencies?.tokens ?? 0,
      passLevel: data.battlePass?.level ?? 0,
      passProgress: data.battlePass?.progress ?? 0,
      mode: data.dailyHighlight ? `${data.dailyHighlight.mode} — ${data.dailyHighlight.map}` : 'Match in preparazione',
      heroName: data.hero?.displayName,
    };
    updateMetaUI();
    lobbyReady = true;
    updateQueueStatus(
      'Sei pronto per la missione?',
      [
        `Piloti online: ${formatMeta(data.activity?.onlinePlayers ?? 0)}`,
        `In coda ora: ${formatMeta(data.activity?.searching ?? 0)}`,
      ],
      'Premi “Trova Match” per unirti alla squadra.'
    );
    maybeEnableStartButton();
  } catch (error) {
    updateQueueStatus(
      'Connessione al backend fallita',
      [],
      error instanceof Error ? error.message : 'Errore inatteso.'
    );
  }
}

function maybeEnableStartButton() {
  if (assetsReady && lobbyReady) {
    startButton.disabled = false;
    startButton.textContent = 'Trova Match';
  }
}

function clearQueuePolling() {
  if (queuePollHandle) {
    window.clearTimeout(queuePollHandle);
    queuePollHandle = null;
  }
}

async function requestMatch() {
  if (queueing) {
    return;
  }
  queueing = true;
  startButton.disabled = true;
  startButton.textContent = 'In coda...';
  updateQueueStatus('Ricerca partita in corso...', [], 'Sincronizzazione con il server.');
  try {
    const payload = { displayName: metaProgress.heroName ?? undefined };
    const response = await fetch(`${API_BASE}/api/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('Impossibile mettersi in coda');
    }
    const data = await response.json();
    sessionId = data.sessionId;
    updateQueueStatus(
      'In attesa di altri piloti...',
      [
        `Posizione in coda: ${data.queuePosition ?? 1}`,
        `Piloti in coda: ${formatMeta(data.playersSearching ?? 1)}`,
      ],
      'Ti avviseremo non appena il match sarà pronto.'
    );
    pollSessionStatus();
  } catch (error) {
    queueing = false;
    startButton.disabled = false;
    startButton.textContent = 'Trova Match';
    updateQueueStatus(
      'Errore nella ricerca partita',
      [],
      error instanceof Error ? error.message : 'Errore inatteso.'
    );
  }
}

async function pollSessionStatus() {
  if (!sessionId) {
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/api/session/${sessionId}`);
    if (!response.ok) {
      throw new Error('Sessione non trovata');
    }
    const data = await response.json();
    if (data.status === 'matched' && data.match) {
      await handleMatchReady(data.match);
      return;
    }
    updateQueueStatus(
      'Ricerca partita in corso...',
      [
        `Posizione in coda: ${data.queuePosition ?? 1}`,
        `Piloti in coda: ${formatMeta(data.playersSearching ?? 1)}`,
      ],
      'Stiamo organizzando la tua squadra.'
    );
  } catch (error) {
    updateQueueStatus(
      'Problema di connessione alla lobby',
      [],
      error instanceof Error ? error.message : 'Errore inatteso.'
    );
    queueing = false;
    sessionId = null;
    startButton.disabled = false;
    startButton.textContent = 'Trova Match';
    return;
  }

  clearQueuePolling();
  queuePollHandle = window.setTimeout(pollSessionStatus, 1000);
}

async function handleMatchReady(matchData) {
  clearQueuePolling();
  queueing = false;
  currentMatch = matchData;
  metaProgress.mode = `${matchData.mode} — ${matchData.map}`;
  updateMetaUI();
  updateQueueStatus(
    'Match trovato! Preparati al drop.',
    matchData.squad.map((member) => `${member.displayName}${member.isBot ? ' (BOT)' : ''}`),
    `Partita su ${matchData.map}.`
  );
  renderRoster(matchData.squad);
  startButton.textContent = 'Avvio partita...';

  try {
    await fetch(`${API_BASE}/api/session/${sessionId}/start`, { method: 'POST' });
  } catch (error) {
    console.warn("Impossibile notificare l'inizio del match:", error);
  }

  window.setTimeout(() => {
    startGame();
  }, 1200);
}

function setHomeSection(section) {
  if (!homePanels.has(section)) {
    return;
  }
  activeHomeSection = section;
  homeNavButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.section === section);
  });
  homePanels.forEach((panel, key) => {
    panel.classList.toggle('active', key === section);
  });
}

homeNavButtons.forEach((button) => {
  button.addEventListener('click', () => setHomeSection(button.dataset.section));
});

setHomeSection(activeHomeSection);
updateMetaUI();
updateMatchTimer();
renderRoster([]);
updateQueueStatus('Connessione al backend...', [], 'Recupero stato della lobby.');
fetchLobbyMeta();

startButton.disabled = true;
startButton.textContent = 'Inizializzazione...';
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', 'Campo di gioco Dropzone X');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030712);
scene.fog = new THREE.Fog(0x030712, 20, 160);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 4, 10);

const hemiLight = new THREE.HemisphereLight(0x62d6ff, 0x1b2749, 0.8);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xb0faff, 1.2);
keyLight.position.set(20, 40, 10);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xff2d95, 0.4);
rimLight.position.set(-14, 18, -12);
scene.add(rimLight);

const world = new THREE.Group();
scene.add(world);

const clock = new THREE.Clock();

let gameStarted = false;
let matchElapsed = 0;

function updateMatchTimer() {
  if (!matchTimerDisplay) {
    return;
  }
  const totalSeconds = Math.floor(matchElapsed);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  matchTimerDisplay.textContent = `${minutes}:${seconds}`;
}

const loadingManager = new THREE.LoadingManager(
  () => {
    assetsReady = true;
    loadingStatus.textContent = 'Risorse 3D pronte.';
    maybeEnableStartButton();
  },
  (url, itemsLoaded, itemsTotal) => {
    const percent = itemsTotal ? Math.round((itemsLoaded / itemsTotal) * 100) : 0;
    loadingStatus.textContent = `Caricamento risorse 3D... ${percent}%`;
  },
  (url) => {
    loadingStatus.textContent = `Errore nel caricamento di ${url}`;
    startButton.disabled = false;
    startButton.textContent = 'Trova Match';
  }
);

function startGame() {
  if (!assetsReady || gameStarted || !currentMatch) {
    return;
  }
  gameStarted = true;
  startButton.disabled = true;
  startButton.textContent = 'Partita in corso';
  sessionId = null;
  matchElapsed = 0;
  updateMatchTimer();
  if (matchModeDisplay) {
    matchModeDisplay.textContent = `Modalità: ${currentMatch.mode} — ${currentMatch.map}`;
  }
  startScreen.classList.remove('visible');
  Object.keys(movement).forEach((key) => {
    movement[key] = false;
  });
  isShooting = false;
  heroVelocity.set(0, 0, 0);
  heroVerticalSpeed = 0;
  joystickActive = false;
  joystickVector.set(0, 0);
  if (joystickThumb) {
    joystickThumb.style.transform = 'translate(-50%, -50%)';
  }
  canvas.focus({ preventScroll: true });
}

startButton.addEventListener('click', () => {
  if (assetsReady && lobbyReady && !queueing) {
    requestMatch();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.code === 'Enter' && assetsReady && lobbyReady && !gameStarted && !queueing) {
    requestMatch();
  }
});

const cameraState = {
  azimuth: Math.PI,
  polar: THREE.MathUtils.degToRad(40),
  distance: 12,
  minPolar: THREE.MathUtils.degToRad(18),
  maxPolar: THREE.MathUtils.degToRad(75),
  minDistance: 7,
  maxDistance: 24,
};

const cameraOffset = new THREE.Vector3();
const desiredCameraPosition = new THREE.Vector3();
const cameraVectors = {
  forward: new THREE.Vector3(0, 0, -1),
  right: new THREE.Vector3(1, 0, 0),
};
const cameraLookTarget = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);

function refreshCameraBasis() {
  const sinPolar = Math.sin(cameraState.polar);
  const cosPolar = Math.cos(cameraState.polar);
  const sinAzimuth = Math.sin(cameraState.azimuth);
  const cosAzimuth = Math.cos(cameraState.azimuth);

  cameraOffset
    .set(sinAzimuth * cosPolar, sinPolar, cosAzimuth * cosPolar)
    .multiplyScalar(cameraState.distance);

  cameraVectors.forward.copy(cameraOffset).multiplyScalar(-1).setY(0);
  if (cameraVectors.forward.lengthSq() < 1e-6) {
    cameraVectors.forward.set(0, 0, -1);
  } else {
    cameraVectors.forward.normalize();
  }

  cameraVectors.right.copy(worldUp).cross(cameraVectors.forward);
  if (cameraVectors.right.lengthSq() < 1e-6) {
    cameraVectors.right.set(1, 0, 0);
  } else {
    cameraVectors.right.normalize();
  }
}

function adjustCameraAngles(deltaX, deltaY) {
  cameraState.azimuth -= deltaX * 0.005;
  cameraState.polar = THREE.MathUtils.clamp(
    cameraState.polar - deltaY * 0.003,
    cameraState.minPolar,
    cameraState.maxPolar
  );
  cameraState.azimuth = THREE.MathUtils.euclideanModulo(
    cameraState.azimuth,
    Math.PI * 2
  );
}

function adjustCameraDistance(delta) {
  cameraState.distance = THREE.MathUtils.clamp(
    cameraState.distance + delta,
    cameraState.minDistance,
    cameraState.maxDistance
  );
}

const cameraDragState = {
  active: false,
  lastX: 0,
  lastY: 0,
  touchId: null,
};

function beginCameraDrag(x, y, touchId = null) {
  cameraDragState.active = true;
  cameraDragState.lastX = x;
  cameraDragState.lastY = y;
  cameraDragState.touchId = touchId;
}

function updateCameraDrag(x, y) {
  if (!cameraDragState.active) return;
  adjustCameraAngles(x - cameraDragState.lastX, y - cameraDragState.lastY);
  cameraDragState.lastX = x;
  cameraDragState.lastY = y;
}

function endCameraDrag(touchId = null) {
  if (touchId !== null && cameraDragState.touchId !== touchId) {
    return;
  }
  cameraDragState.active = false;
  cameraDragState.touchId = null;
}

function createCanvasTexture(size, painter) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  painter(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createGridTexture() {
  return createCanvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#0a1325';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(0,255,214,0.12)';
    ctx.lineWidth = 2;
    const step = size / 16;
    for (let i = 0; i <= 16; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(size, i * step);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,255,214,0.3)';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, size, size);
  });
}

function createCharacterTexture(primary, accent) {
  return createCanvasTexture(512, (ctx, size) => {
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = accent;
    ctx.fillRect(size * 0.1, size * 0.15, size * 0.8, size * 0.2);
    ctx.fillRect(size * 0.1, size * 0.65, size * 0.8, size * 0.15);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(size * 0.15 + i * size * 0.12, size * 0.35, size * 0.06, size * 0.15);
    }

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  });
}

function createWeaponTexture() {
  return createCanvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#14191f';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#ff2d95';
    ctx.fillRect(size * 0.1, size * 0.4, size * 0.8, size * 0.2);

    ctx.fillStyle = '#0ff6ff';
    ctx.fillRect(size * 0.2, size * 0.3, size * 0.2, size * 0.4);
    ctx.fillRect(size * 0.6, size * 0.3, size * 0.2, size * 0.4);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 8;
    ctx.strokeRect(size * 0.05, size * 0.3, size * 0.9, size * 0.4);
  });
}

const groundTexture = createGridTexture();
groundTexture.repeat.set(32, 32);
const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  metalness: 0.1,
  roughness: 0.9,
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMaterial);
ground.rotation.x = -Math.PI / 2;
world.add(ground);

const weaponTexture = createWeaponTexture();

const hero = new THREE.Group();
world.add(hero);

const heroVisualRoot = new THREE.Group();
hero.add(heroVisualRoot);

function createHeroWeapon() {
  const weaponGroup = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    map: weaponTexture,
    metalness: 0.65,
    roughness: 0.35,
    emissive: new THREE.Color('#11d7ff'),
    emissiveIntensity: 0.4,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 0.4), bodyMaterial);
  body.position.x = 0.45;
  body.userData.tintable = true;
  weaponGroup.add(body);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 0.32), bodyMaterial);
  stock.position.set(-0.4, -0.05, 0);
  stock.userData.tintable = true;
  weaponGroup.add(stock);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.18), bodyMaterial);
  grip.position.set(0.05, -0.35, 0);
  grip.userData.tintable = true;
  weaponGroup.add(grip);

  const emitterMaterial = new THREE.MeshStandardMaterial({
    color: 0xff2d95,
    emissive: 0xff2d95,
    emissiveIntensity: 0.8,
    metalness: 0.2,
    roughness: 0.1,
  });
  const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.8, 24), emitterMaterial);
  emitter.rotation.z = Math.PI / 2;
  emitter.position.set(0.85, 0, 0);
  weaponGroup.add(emitter);

  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.position.set(1.1, 0, 0);
  weaponGroup.add(muzzleAnchor);

  weaponGroup.userData.muzzleAnchor = muzzleAnchor;

  return weaponGroup;
}

const heroWeapon = createHeroWeapon();
heroWeapon.position.set(0.8, 1.6, -0.2);
heroWeapon.rotation.set(THREE.MathUtils.degToRad(-5), THREE.MathUtils.degToRad(8), THREE.MathUtils.degToRad(88));
hero.add(heroWeapon);

const weaponRestQuaternion = new THREE.Quaternion().copy(heroWeapon.quaternion);

const heroData = {
  group: hero,
  weapon: heroWeapon,
  mixer: null,
  actions: {},
  animation: {
    current: null,
    idle: null,
    move: null,
  },
  ready: false,
};

const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.load(
  'https://threejs.org/examples/models/gltf/Soldier.glb',
  (gltf) => {
    const model = gltf.scene;
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material && child.material.color) {
          child.material.color.multiplyScalar(1.08);
        }
      }
    });
    model.scale.set(1.45, 1.45, 1.45);
    model.position.y = 0;
    model.rotation.y = Math.PI;
    heroVisualRoot.add(model);

    heroData.mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => {
      const key = clip.name.toLowerCase();
      const action = heroData.mixer.clipAction(clip);
      heroData.actions[key] = action;
    });

    heroData.animation.idle =
      heroData.actions['idle'] ||
      heroData.actions['idle_armed'] ||
      heroData.actions['idle_aim'] ||
      null;
    heroData.animation.move =
      heroData.actions['run'] ||
      heroData.actions['run_forward'] ||
      heroData.actions['walk'] ||
      null;

    if (heroData.animation.idle) {
      heroData.animation.idle.reset().fadeIn(0).play();
      heroData.animation.current = heroData.animation.idle;
    } else if (heroData.animation.move) {
      heroData.animation.move.reset().fadeIn(0).play();
      heroData.animation.current = heroData.animation.move;
    }

    const rightHand =
      model.getObjectByName('mixamorigRightHand') ||
      model.getObjectByName('RightHand') ||
      model;
    rightHand.add(heroWeapon);
    heroWeapon.position.set(0.16, -0.02, -0.08);
    heroWeapon.rotation.set(
      THREE.MathUtils.degToRad(-10),
      THREE.MathUtils.degToRad(8),
      THREE.MathUtils.degToRad(98)
    );
    heroWeapon.scale.setScalar(0.75);
    heroWeapon.updateMatrixWorld(true);
    weaponRestQuaternion.copy(heroWeapon.quaternion);

    heroData.ready = true;
  },
  undefined,
  (error) => {
    console.error('Impossibile caricare il modello 3D del soldato', error);
    assetsReady = true;
    startButton.disabled = false;
    startButton.textContent = 'Gioca ora';
    loadingStatus.textContent = 'Asset 3D non disponibile. Premi Gioca per continuare.';
  }
);

const HERO_SPEED = 6;
const HERO_JUMP_STRENGTH = 8;
const HERO_GRAVITY = 20;

const heroVelocity = new THREE.Vector3();
const heroDisplacement = new THREE.Vector3();
const heroDirection = new THREE.Vector3();
let heroVerticalSpeed = 0;

const scratchVector = new THREE.Vector3();

const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0x0ff6ff, wireframe: true });
const cursor = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), highlightMaterial);
cursor.visible = false;
world.add(cursor);

function createCrate(size, position) {
  const crateTexture = createCharacterTexture('#101f3a', '#0ff6ff');
  crateTexture.wrapS = crateTexture.wrapT = THREE.RepeatWrapping;
  crateTexture.repeat.set(1, 1);
  const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({
    map: crateTexture,
    metalness: 0.2,
    roughness: 0.7,
  }));
  crate.castShadow = crate.receiveShadow = true;
  crate.position.copy(position);
  world.add(crate);
  return crate;
}

for (let i = 0; i < 12; i++) {
  const size = 1.2 + Math.random() * 1.3;
  const position = new THREE.Vector3((Math.random() - 0.5) * 30, size / 2, (Math.random() - 0.5) * 30);
  createCrate(size, position);
}

const inventoryItems = [
  { id: 'plasma_rifle', label: 'Fucile al Plasma', type: 'weapon' },
  { id: 'ion_grenade', label: 'Granata Ionica', type: 'explosive' },
  { id: 'nano_kit', label: 'Kit Nanoritardante', type: 'heal' },
  { id: 'shield_core', label: 'Nucleo Scudo', type: 'utility' },
  { id: 'pulse_beacon', label: 'Radiofaro Pulse', type: 'utility' },
  { id: 'drone', label: 'Drone Scout', type: 'utility' },
];

const weapons = [
  { id: 'plasma_rifle', label: 'Fucile al Plasma', damage: 36, rarity: 'raro' },
  { id: 'arc_blade', label: 'Lama d\'Arco', damage: 48, rarity: 'epico' },
  { id: 'nova_launcher', label: 'Lanciatore Nova', damage: 72, rarity: 'leggendario' },
];

const activeWeaponIndex = { current: 0 };

function populateUI() {
  const inventoryList = document.getElementById('inventory-list');
  inventoryList.innerHTML = '';
  inventoryItems.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item.label;
    li.dataset.type = item.type;
    inventoryList.appendChild(li);
  });

  const weaponSlots = document.getElementById('weapon-slots');
  weaponSlots.innerHTML = '';
  weapons.forEach((weapon, index) => {
    const slot = document.createElement('div');
    slot.className = 'weapon-slot' + (index === activeWeaponIndex.current ? ' active' : '');
    slot.innerHTML = `<strong>${weapon.label}</strong><br/><span>${weapon.rarity}</span>`;
    slot.addEventListener('click', () => {
      activeWeaponIndex.current = index;
      populateUI();
      updateWeaponAppearance();
    });
    weaponSlots.appendChild(slot);
  });
}

function updateWeaponAppearance() {
  const weapon = heroData.weapon;
  const activeWeapon = weapons[activeWeaponIndex.current];
  const colorMap = {
    comune: '#7a8897',
    raro: '#44f1ff',
    epico: '#b96bff',
    leggendario: '#ffad0d',
  };
  const emissiveHex = colorMap[activeWeapon.rarity] || '#ffffff';
  const emissiveColor = new THREE.Color(emissiveHex);
  const baseColor = emissiveColor.clone().lerp(new THREE.Color('#0b1120'), 0.55);

  if (!weapon) {
    return;
  }

  weapon.traverse((child) => {
    if (child.isMesh && child.userData.tintable && child.material) {
      if (child.material.emissive) {
        child.material.emissive.copy(emissiveColor);
      }
      if (child.material.color) {
        child.material.color.copy(baseColor);
      }
      child.material.needsUpdate = true;
    }
  });
}

populateUI();
updateWeaponAppearance();

const device = {
  isMobile: /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile|BlackBerry/i.test(navigator.userAgent),
};

const controlsHelp = document.getElementById('controls-help');
const mobileControls = document.getElementById('mobile-controls');
const mobileCameraControls = document.getElementById('mobile-camera-controls');
const zoomInButton = document.getElementById('zoom-in-btn');
const zoomOutButton = document.getElementById('zoom-out-btn');

if (device.isMobile) {
  controlsHelp.innerHTML = `
    <strong>Touch Controls</strong><br/>
    • Muovi il joystick virtuale per camminare.<br/>
    • Usa i pulsanti per saltare e sparare.<br/>
    • Trascina il lato destro per ruotare la camera.<br/>
    • Pulsanti +/- per regolare lo zoom.
  `;
  mobileControls.classList.remove('hidden');
  mobileCameraControls.classList.remove('hidden');

  const bindZoomButton = (button, delta) => {
    if (!button) return;
    button.addEventListener(
      'touchstart',
      (event) => {
        event.preventDefault();
        adjustCameraDistance(delta);
      },
      { passive: false }
    );
    button.addEventListener('click', (event) => {
      event.preventDefault();
      adjustCameraDistance(delta);
    });
  };

  bindZoomButton(zoomInButton, -1.2);
  bindZoomButton(zoomOutButton, 1.2);

  const touchRotationThreshold = () => window.innerWidth * 0.45;

  const handleTouchStart = (event) => {
    for (const touch of Array.from(event.changedTouches)) {
      if (touch.clientX > touchRotationThreshold() && !cameraDragState.active) {
        beginCameraDrag(touch.clientX, touch.clientY, touch.identifier);
        event.preventDefault();
        break;
      }
    }
  };

  const handleTouchMove = (event) => {
    if (!cameraDragState.active) return;
    for (const touch of Array.from(event.touches)) {
      if (touch.identifier === cameraDragState.touchId) {
        updateCameraDrag(touch.clientX, touch.clientY);
        event.preventDefault();
        break;
      }
    }
  };

  const handleTouchEnd = (event) => {
    for (const touch of Array.from(event.changedTouches)) {
      if (touch.identifier === cameraDragState.touchId) {
        endCameraDrag(touch.identifier);
      }
    }
  };

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);
  canvas.addEventListener('touchcancel', handleTouchEnd);
} else {
  controlsHelp.innerHTML = `
    <strong>Comandi Desktop</strong><br/>
    • WASD o frecce per muoversi.<br/>
    • Spazio per saltare, tasto sinistro per sparare.<br/>
    • Tasto destro + trascinamento per ruotare la camera, rotellina per lo zoom.<br/>
    • Tasti 1-3 per cambiare arma attiva.
  `;
}

const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

function updateCursor() {
  if (!gameStarted) {
    cursor.visible = false;
    return;
  }
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(ground);
  if (intersects.length) {
    cursor.visible = true;
    cursor.position.copy(intersects[0].point);
  } else {
    cursor.visible = false;
  }
}

document.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  updateCursor();
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener(
  'wheel',
  (event) => {
    if (!gameStarted) {
      return;
    }
    adjustCameraDistance(event.deltaY * 0.01);
    event.preventDefault();
  },
  { passive: false }
);

const movement = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jumping: false,
};

let isShooting = false;

function onKeyChange(event, value) {
  if (!gameStarted) {
    return;
  }
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      movement.forward = value;
      break;
    case 'KeyS':
    case 'ArrowDown':
      movement.backward = value;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      movement.left = value;
      break;
    case 'KeyD':
    case 'ArrowRight':
      movement.right = value;
      break;
    case 'Space':
      movement.jumping = value;
      break;
  }
}

if (!device.isMobile) {
  document.addEventListener('keydown', (event) => {
    if (!gameStarted) {
      return;
    }
    onKeyChange(event, true);
    if (event.code === 'Digit1' || event.code === 'Digit2' || event.code === 'Digit3') {
      const index = parseInt(event.code.replace('Digit', ''), 10) - 1;
      if (weapons[index]) {
        activeWeaponIndex.current = index;
        populateUI();
        updateWeaponAppearance();
      }
    }
  });
  document.addEventListener('keyup', (event) => {
    if (!gameStarted) {
      return;
    }
    onKeyChange(event, false);
  });
  canvas.addEventListener('mousedown', (event) => {
    if (!gameStarted) {
      return;
    }
    if (event.button === 2) {
      event.preventDefault();
      beginCameraDrag(event.clientX, event.clientY);
      return;
    }
    if (event.button === 0) {
      isShooting = true;
    }
  });
  document.addEventListener('mouseup', (event) => {
    if (!gameStarted) {
      return;
    }
    if (event.button === 0) {
      isShooting = false;
    }
    if (event.button === 2) {
      endCameraDrag();
    }
  });
  document.addEventListener('mousemove', (event) => {
    if (!gameStarted) {
      return;
    }
    if (cameraDragState.active) {
      updateCameraDrag(event.clientX, event.clientY);
    }
  });
}
const jumpButton = document.getElementById('jump-btn');
const fireButton = document.getElementById('fire-btn');

if (device.isMobile) {
  jumpButton.addEventListener('touchstart', (event) => {
    event.preventDefault();
    if (!gameStarted) return;
    movement.jumping = true;
  });
  jumpButton.addEventListener('touchend', (event) => {
    event.preventDefault();
    if (!gameStarted) return;
    movement.jumping = false;
  });
  fireButton.addEventListener('touchstart', (event) => {
    event.preventDefault();
    if (!gameStarted) return;
    isShooting = true;
  });
  fireButton.addEventListener('touchend', (event) => {
    event.preventDefault();
    if (!gameStarted) return;
    isShooting = false;
  });
}

const joystick = document.getElementById('joystick');
const joystickThumb = document.getElementById('joystick-thumb');
let joystickActive = false;
const joystickVector = new THREE.Vector2();

function updateJoystick(event) {
  if (!gameStarted || !event.touches || event.touches.length === 0) return;

  const rect = joystick.getBoundingClientRect();
  const x = event.touches[0].clientX - rect.left;
  const y = event.touches[0].clientY - rect.top;
  const center = { x: rect.width / 2, y: rect.height / 2 };
  const dx = x - center.x;
  const dy = y - center.y;
  const maxDistance = rect.width / 2;
  const distance = Math.min(Math.hypot(dx, dy), maxDistance);
  const angle = Math.atan2(dy, dx);

  const offsetX = Math.cos(angle) * distance;
  const offsetY = Math.sin(angle) * distance;
  joystickThumb.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;

  joystickVector.set(Math.cos(angle) * (distance / maxDistance), Math.sin(angle) * (distance / maxDistance));
}

if (device.isMobile) {
  const resetJoystick = (event) => {
    if (event) event.preventDefault();
    joystickActive = false;
    joystickVector.set(0, 0);
    joystickThumb.style.transform = 'translate(-50%, -50%)';
  };

  joystick.addEventListener('touchstart', (event) => {
    event.preventDefault();
    if (!gameStarted) return;
    joystickActive = true;
    updateJoystick(event);
  });

  joystick.addEventListener('touchmove', (event) => {
    event.preventDefault();
    if (!gameStarted) return;
    if (!joystickActive) return;
    updateJoystick(event);
  });

  joystick.addEventListener('touchend', resetJoystick);
  joystick.addEventListener('touchcancel', resetJoystick);
}

function updateMovement(delta) {
  if (!gameStarted) {
    heroVelocity.set(0, 0, 0);
    heroVerticalSpeed = 0;
    return false;
  }

  heroDirection.set(0, 0, 0);
  let moveForward = 0;
  let moveRight = 0;

  if (device.isMobile && joystickActive) {
    moveForward = -joystickVector.y;
    moveRight = joystickVector.x;
  } else {
    if (movement.forward) moveForward += 1;
    if (movement.backward) moveForward -= 1;
    if (movement.right) moveRight += 1;
    if (movement.left) moveRight -= 1;
  }

  if (moveForward !== 0 || moveRight !== 0) {
    heroDirection
      .copy(cameraVectors.forward)
      .multiplyScalar(moveForward)
      .addScaledVector(cameraVectors.right, moveRight);

    if (heroDirection.lengthSq() > 0) {
      heroDirection.normalize();
      const angle = Math.atan2(heroDirection.x, heroDirection.z);
      hero.rotation.y = angle;
      heroVelocity.x = heroDirection.x * HERO_SPEED;
      heroVelocity.z = heroDirection.z * HERO_SPEED;
    } else {
      heroVelocity.set(0, 0, 0);
    }
  } else {
    heroVelocity.set(0, 0, 0);
  }

  const isMoving = heroVelocity.lengthSq() > 0.01;

  heroDisplacement.copy(heroVelocity).multiplyScalar(delta);
  hero.position.add(heroDisplacement);
  hero.position.x = THREE.MathUtils.clamp(hero.position.x, -60, 60);
  hero.position.z = THREE.MathUtils.clamp(hero.position.z, -60, 60);

  if (movement.jumping && hero.position.y <= 0.05) {
    heroVerticalSpeed = HERO_JUMP_STRENGTH;
    movement.jumping = false;
  }

  heroVerticalSpeed -= HERO_GRAVITY * delta;
  hero.position.y += heroVerticalSpeed * delta;

  if (hero.position.y < 0) {
    hero.position.y = 0;
    heroVerticalSpeed = 0;
  }

  return isMoving;
}

function updateHeroAnimation(delta, isMoving) {
  if (!heroData.mixer) {
    return;
  }

  heroData.mixer.update(delta);

  const targetAction = isMoving
    ? heroData.animation.move || heroData.animation.idle
    : heroData.animation.idle || heroData.animation.move;

  if (!targetAction || heroData.animation.current === targetAction) {
    return;
  }

  if (heroData.animation.current) {
    heroData.animation.current.fadeOut(0.25);
  }

  targetAction.reset().fadeIn(0.25).play();
  heroData.animation.current = targetAction;
}

const muzzleFlash = new THREE.PointLight('#ff6f61', 4, 6);
muzzleFlash.visible = false;
scene.add(muzzleFlash);

const muzzleWorldPosition = new THREE.Vector3();
const recoilAxis = new THREE.Vector3(0, 0, 1);
const recoilQuaternion = new THREE.Quaternion();

function updateShooting(delta) {
  if (!heroData.weapon) {
    return;
  }

  if (!isShooting || !gameStarted) {
    muzzleFlash.visible = false;
    heroData.weapon.quaternion.slerp(weaponRestQuaternion, 1 - Math.pow(0.02, delta));
    return;
  }

  const muzzleAnchor = heroData.weapon.userData.muzzleAnchor;
  if (!muzzleAnchor) {
    return;
  }

  muzzleFlash.visible = true;
  muzzleAnchor.getWorldPosition(muzzleWorldPosition);
  muzzleFlash.position.copy(muzzleWorldPosition);

  const pulse = (Math.sin(clock.elapsedTime * 40) + 1) / 2;
  muzzleFlash.intensity = 2 + pulse * 4;

  const recoil = Math.sin(clock.elapsedTime * 30) * 0.07;
  recoilQuaternion.setFromAxisAngle(recoilAxis, recoil);
  heroData.weapon.quaternion.copy(weaponRestQuaternion).multiply(recoilQuaternion);
}

function updateCamera(delta) {
  desiredCameraPosition.copy(hero.position).add(cameraOffset);
  camera.position.lerp(desiredCameraPosition, 1 - Math.pow(0.001, delta));
  cameraLookTarget.copy(hero.position);
  cameraLookTarget.y += 2;
  camera.lookAt(cameraLookTarget);
}

function animate() {
  const delta = clock.getDelta();
  refreshCameraBasis();
  const moving = updateMovement(delta);
  updateHeroAnimation(delta, moving);
  updateShooting(delta);
  updateCamera(delta);
  if (gameStarted) {
    matchElapsed += delta;
    updateMatchTimer();
  }
  updateCursor();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

refreshCameraBasis();
updateCursor();
