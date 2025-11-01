import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

const matchDataElement = document.getElementById("match-data");
const payload = matchDataElement ? JSON.parse(matchDataElement.textContent) : null;

const statusLabel = document.getElementById("match-status");
const timerLabel = document.getElementById("match-timer");
const objectiveLabel = document.getElementById("objective-label");
const eventFeed = document.getElementById("event-feed");
const scoreboardList = document.getElementById("scoreboard");
const enemyRemainingLabel = document.getElementById("enemy-remaining");
const allyScoreLabel = document.getElementById("ally-score");
const enemyScoreLabel = document.getElementById("enemy-score");
const healthLabel = document.getElementById("health-label");
const healthBar = document.getElementById("health-bar");
const shieldBar = document.getElementById("shield-bar");
const weaponNameLabel = document.getElementById("weapon-name");
const weaponAmmoLabel = document.getElementById("weapon-ammo");
const hitMarker = document.getElementById("hit-marker");
const damageIndicator = document.getElementById("damage-indicator");
const introOverlay = document.getElementById("intro-overlay");
const missionReport = document.getElementById("mission-report");
const missionOutcome = document.getElementById("mission-outcome");
const missionExitButton = document.getElementById("mission-exit");
const returnButton = document.getElementById("return-button");
const canvas = document.getElementById("match-canvas");

const MATCH_PHASES = [
  "Briefing tattico",
  "Ingaggio iniziale",
  "Controllo siti",
  "Retake finale",
  "Debriefing",
];

const ENEMY_ARCHETYPES = [
  { codename: "Spectre Cell", behavior: "aggressive", damage: 9 },
  { codename: "Shadow Lance", behavior: "balanced", damage: 8 },
  { codename: "Nova Drift", behavior: "aggressive", damage: 10 },
  { codename: "Helix Ward", behavior: "defensive", damage: 7 },
  { codename: "Pulse Hydra", behavior: "balanced", damage: 8 },
  { codename: "Rift Phantom", behavior: "aggressive", damage: 9 },
  { codename: "Zero Shade", behavior: "balanced", damage: 8 },
  { codename: "Ion Seraph", behavior: "defensive", damage: 7 },
];

const scoreboardState = new Map();
let phaseIndex = 0;
let timerHandle = null;

function addFeedEntry(message) {
  if (!eventFeed) return;
  const item = document.createElement("li");
  item.textContent = message;
  eventFeed.prepend(item);
  while (eventFeed.children.length > 8) {
    eventFeed.removeChild(eventFeed.lastElementChild);
  }
}

function initialiseScoreboard() {
  if (!payload?.match || !scoreboardList) return;
  Array.from(scoreboardList.children).forEach((row) => {
    const playerId = row.dataset.player;
    if (!playerId) return;
    const statFields = {
      kills: row.querySelector('[data-field="kills"]'),
      deaths: row.querySelector('[data-field="deaths"]'),
      status: row.querySelector('[data-field="status"]'),
    };
    scoreboardState.set(playerId, {
      element: row,
      stats: { kills: 0, deaths: 0 },
      fields: statFields,
    });
  });
}

function updateScoreboard(playerId, { kills, deaths, status }) {
  const entry = scoreboardState.get(playerId);
  if (!entry) return;
  if (typeof kills === "number" && entry.fields.kills) {
    entry.fields.kills.textContent = String(kills);
    entry.stats.kills = kills;
  }
  if (typeof deaths === "number" && entry.fields.deaths) {
    entry.fields.deaths.textContent = String(deaths);
    entry.stats.deaths = deaths;
  }
  if (typeof status === "string" && entry.fields.status) {
    entry.fields.status.textContent = status;
  }
  if (status) {
    const lowered = status.toLowerCase();
    if (lowered.includes("down")) {
      entry.element.classList.add("down");
    } else {
      entry.element.classList.remove("down");
    }
  }
}

function updateTimer(startedAt) {
  const startMillis = startedAt ? startedAt * 1000 : Date.now();
  const baseTime = startMillis;
  const tick = () => {
    const delta = Date.now() - baseTime;
    const totalSeconds = Math.floor(delta / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    if (timerLabel) timerLabel.textContent = `${minutes}:${seconds}`;
    const phase = MATCH_PHASES[Math.min(MATCH_PHASES.length - 1, Math.floor(totalSeconds / 60))];
    if (phase !== MATCH_PHASES[phaseIndex]) {
      phaseIndex = MATCH_PHASES.indexOf(phase);
      if (statusLabel) statusLabel.textContent = `Operazione attiva · ${phase}`;
      if (objectiveLabel) objectiveLabel.textContent = phase;
      addFeedEntry(`Nuova fase: ${phase}.`);
    }
  };
  tick();
  timerHandle = window.setInterval(tick, 1000);
}

function stopTimer() {
  if (timerHandle) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
}

class EnemyAgent {
  constructor(game, profile, rig) {
    this.game = game;
    this.profile = { ...profile };
    this.rig = rig;
    this.mesh = rig.mesh;
    this.mesh.userData.enemy = this;
    this.mesh.position.copy(profile.spawn.clone());
    this.mesh.position.y = 1.2;
    this.health = 150;
    this.cooldown = 1.6 + Math.random() * 0.6;
    this.reloadTimer = 0;
    this.strafeTimer = 1.2 + Math.random() * 1.4;
    this.strafeDirection = Math.random() > 0.5 ? 1 : -1;
    this.spawnPoint = profile.spawn.clone();
  }

  update(delta) {
    if (!this.game.missionActive) {
      this.rig.play("idle");
      return;
    }
    const playerPosition = this.game.controls.getObject().position;
    const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.mesh.position);
    const distance = toPlayer.length();
    const behavior = this.profile.behavior;
    const desiredDistance = behavior === "defensive" ? 22 : behavior === "balanced" ? 18 : 14;
    const approachSpeed = behavior === "aggressive" ? 7 : behavior === "balanced" ? 5.6 : 4.6;
    const retreatSpeed = 6.2;
    const strafeSpeed = 3.8;

    toPlayer.normalize();

    if (distance > desiredDistance + 2) {
      this.mesh.position.addScaledVector(toPlayer, approachSpeed * delta);
      this.rig.play("run");
    } else if (distance < desiredDistance - 3) {
      this.mesh.position.addScaledVector(toPlayer, -retreatSpeed * delta);
      this.rig.play("run");
    } else {
      this.strafeTimer -= delta;
      if (this.strafeTimer <= 0) {
        this.strafeDirection = Math.random() > 0.5 ? 1 : -1;
        this.strafeTimer = 1.2 + Math.random() * 1.8;
      }
      const up = new THREE.Vector3(0, 1, 0);
      const strafe = new THREE.Vector3().crossVectors(up, toPlayer).normalize().multiplyScalar(this.strafeDirection);
      this.mesh.position.addScaledVector(strafe, strafeSpeed * delta);
      this.rig.play("aim");
    }

    this.mesh.position.y = 1.2;
    this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, -36, 36);
    this.mesh.position.z = THREE.MathUtils.clamp(this.mesh.position.z, -36, 36);
    this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);

    this.cooldown -= delta;
    if (distance < desiredDistance + 8 && this.cooldown <= 0) {
      this.cooldown =
        behavior === "aggressive"
          ? 1.1 + Math.random() * 0.5
          : behavior === "defensive"
          ? 1.9 + Math.random() * 0.6
          : 1.4 + Math.random() * 0.5;
      const burst = behavior === "aggressive" ? 2.4 : behavior === "balanced" ? 2 : 1.6;
      this.game.inflictPlayerDamage(this.profile.damage * burst);
      this.game.showDamage(`${this.profile.codename} ti colpisce.`);
      addFeedEntry(`${this.profile.codename} ingaggia il combattimento.`);
    }
  }

  takeDamage(amount, attackerId) {
    this.health -= amount;
    if (this.health <= 0) {
      this.die(attackerId);
    }
  }

  die(attackerId) {
    this.game.scene.remove(this.mesh);
    this.mesh.geometry?.dispose?.();
    this.mesh.material?.dispose?.();
    this.game.unregisterRig(this.rig);
    this.game.onEnemyDown(this, attackerId);
  }
}

class ShooterGame {
  constructor(canvas, payload) {
    this.canvas = canvas;
    this.payload = payload;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050813);
    this.scene.fog = new THREE.FogExp2(0x050813, 0.03);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const initialWidth = window.innerWidth || canvas.clientWidth || 1280;
    const initialHeight = window.innerHeight || canvas.clientHeight || 720;
    this.renderer.setSize(initialWidth, initialHeight, false);

    this.camera = new THREE.PerspectiveCamera(74, initialWidth / initialHeight, 0.1, 200);
    this.camera.position.set(0, 1.6, 6);

    this.controls = new PointerLockControls(this.camera, canvas);
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isSprinting = false;
    this.canJump = false;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    const squadMembers =
      (payload?.match?.playerSquad?.members || payload?.match?.squads?.[0]?.members || []).slice();
    const activeMember =
      squadMembers.find((member) => member.playerId === payload?.session?.playerId) ||
      squadMembers.find((member) => !member.isBot) ||
      squadMembers[0] ||
      null;

    this.player = {
      id: payload?.session?.playerId || activeMember?.playerId || "player-local",
      name: payload?.session?.displayName || activeMember?.displayName || "Operatore",
      health: 100,
      shield: 50,
      maxHealth: 100,
      maxShield: 50,
      deaths: 0,
      kills: 0,
      cosmetics: activeMember?.cosmetics || payload?.session?.cosmetics || null,
    };

    const spawnVector = this.playerSpawnPoint ? this.scaleToVector3(this.playerSpawnPoint.position) : null;
    if (spawnVector) {
      const origin = this.controls.getObject();
      origin.position.set(spawnVector.x, 1.6, spawnVector.z);
      if (this.playerSpawnPoint?.rotation) {
        origin.rotation.y = this.playerSpawnPoint.rotation[1] || 0;
      }
    }

    this.agentConfig = payload?.match?.playerAgent || this.player.cosmetics || activeMember?.cosmetics || null;
    this.animationBindings = (this.agentConfig && this.agentConfig.animationBindings) || {};

    this.mapLayout = payload?.match?.mapLayout || payload?.mapLayout || null;
    const firstPhaseRadius = this.mapLayout?.safePhases?.[0]?.radius || 60;
    this.mapScale = this.mapLayout ? Math.max(0.02, 35 / firstPhaseRadius) : 1;
    this.safePhases = (this.mapLayout?.safePhases || []).map((phase) => ({
      ...phase,
      scaledRadius: (phase.radius || 40) * this.mapScale,
      scaledCenter: phase.center ? [phase.center[0] * this.mapScale, phase.center[2] * this.mapScale] : [0, 0],
    }));
    this.safeZoneMesh = null;
    this.safeZoneFill = null;
    this.safePhaseIndex = 0;
    this.safePhaseTimer = 0;
    this.totalSquads = this.payload?.match?.squads?.length || 1;
    this.playerSquadIndex =
      this.payload?.match?.squads?.findIndex((squad) => squad.squadId === this.payload?.match?.playerSquadId) ?? 0;
    if (this.playerSquadIndex < 0) this.playerSquadIndex = 0;
    this.availableSpawnPoints = (this.mapLayout?.spawnPoints || []).map((point) => ({ ...point, used: false }));
    this.playerSpawnPoint = this.consumeSpawnPoint(this.playerSquadIndex);

    this.weapon = {
      name: "Photon Vandal",
      clipSize: 30,
      ammo: 30,
      reserve: 120,
      fireRate: 0.14,
      damage: 36,
      lastShot: 0,
      reloadTime: 1.6,
      reloading: false,
      reloadTimer: 0,
      triggerHeld: false,
    };

    this.assets = {
      agentPrototype: null,
      animations: [],
    };

    this.enemyBlueprints = ENEMY_ARCHETYPES.map((profile, index) => ({ ...profile, spawnIndex: index }));
    if (this.enemyBlueprints.length === 0) {
      this.enemyBlueprints = Array.from({ length: 6 }, (_, index) => ({
        codename: `Unità Spectre ${index + 1}`,
        behavior: index % 3 === 0 ? "aggressive" : index % 3 === 1 ? "balanced" : "defensive",
        damage: 8 + (index % 2),
        spawnIndex: index,
      }));
    }
    this.pendingEnemies = [];
    this.enemies = [];
    this.totalEnemies = this.enemyBlueprints.length;
    this.remainingEnemies = this.totalEnemies;
    this.maxConcurrentEnemies = Math.min(4, this.totalEnemies);
    this.reinforcementTimer = 4;
    this.missionEnded = false;
    this.missionActive = false;
    this.hasLaunched = false;
    this.hitMarkerTimeout = null;
    this.damageTimeout = null;
    this.rigs = [];
    this.shieldRegenCooldown = 0;
    this.healthRegenCooldown = 3;

    this.animate = this.animate.bind(this);
    this.onResize = this.onResize.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
    this.beginMission = this.beginMission.bind(this);
  }

  async boot() {
    this.configureLights();
    this.buildArena();
    await this.prepareAssets();
    this.spawnFriendlies();
    this.spawnEnemies();
    this.bindInput();
    this.animate();
    window.addEventListener("resize", this.onResize);
    document.addEventListener("pointerlockchange", this.handlePointerLockChange);
    addFeedEntry("Connessione alla simulazione tattica completata.");
    if (statusLabel) statusLabel.textContent = "Operazione attiva · Briefing tattico";
    if (objectiveLabel) objectiveLabel.textContent = "Briefing tattico";
    if (enemyRemainingLabel) enemyRemainingLabel.textContent = String(this.remainingEnemies);
    if (allyScoreLabel) allyScoreLabel.textContent = String(this.player.kills);
    if (enemyScoreLabel) enemyScoreLabel.textContent = String(this.totalEnemies - this.remainingEnemies);
    this.updateWeaponUI();
    this.updateVitals();
    updateScoreboard(this.player.id, { status: "Operativo", kills: this.player.kills, deaths: this.player.deaths });
  }

  configureLights() {
    const ambient = new THREE.AmbientLight(0x4b5a7a, 0.6);
    this.scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0x9adfff, 0.7);
    keyLight.position.set(10, 18, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    this.scene.add(keyLight);
    const rim = new THREE.SpotLight(0xff5f87, 0.35, 80, Math.PI / 6, 0.4, 1);
    rim.position.set(-18, 24, -6);
    this.scene.add(rim);
  }

  buildArena() {
    const baseRadius = this.safePhases.length ? this.safePhases[0].scaledRadius + 6 : 40;
    const floorGeometry = new THREE.CircleGeometry(baseRadius, 72);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f162c,
      metalness: 0.12,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(baseRadius * 2, Math.max(32, Math.floor(baseRadius)), 0x4bbad5, 0x274a69);
    grid.position.y = 0.02;
    this.scene.add(grid);

    const perimeterMaterial = new THREE.MeshStandardMaterial({
      color: 0x111b33,
      metalness: 0.2,
      roughness: 0.65,
    });
    const perimeter = new THREE.Mesh(new THREE.CylinderGeometry(baseRadius + 4, baseRadius + 4, 6, 64, 1, true), perimeterMaterial);
    perimeter.material.side = THREE.DoubleSide;
    perimeter.position.y = 3;
    this.scene.add(perimeter);

    if (this.mapLayout?.lootZones) {
      this.mapLayout.lootZones.forEach((zone) => {
        const radius = (zone.radius || 80) * this.mapScale;
        const ringGeometry = new THREE.RingGeometry(Math.max(0.1, radius - 0.8), radius, 48);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: zone.rarity === "legendary" ? 0xffc15a : zone.rarity === "epic" ? 0x7b8bff : 0x5ffff1,
          transparent: true,
          opacity: 0.28,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(zone.position[0] * this.mapScale, 0.06, zone.position[2] * this.mapScale);
        this.scene.add(ring);
      });
    }

    if (this.availableSpawnPoints.length > 0) {
      const markerGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.18, 18);
      const friendlyMaterial = new THREE.MeshStandardMaterial({ color: 0x5ffff1, emissive: 0x1d6571, emissiveIntensity: 0.4 });
      const enemyMaterial = new THREE.MeshStandardMaterial({ color: 0xff6ad5, emissive: 0x662544, emissiveIntensity: 0.45 });
      this.availableSpawnPoints.forEach((point) => {
        const material = point.squad === this.playerSquadIndex ? friendlyMaterial : enemyMaterial;
        const marker = new THREE.Mesh(markerGeometry, material.clone());
        const scaled = this.scaleToVector3(point.position);
        marker.position.set(scaled.x, 0.1, scaled.z);
        this.scene.add(marker);
      });
    }

    this.createSafeZone();
  }

  async prepareAssets() {
    const loader = new GLTFLoader();
    try {
      const modelUrl =
        this.agentConfig?.modelUrl ||
        "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Soldier/glTF/Soldier.glb";
      const gltf = await loader.loadAsync(modelUrl);
      const root = gltf.scene;
      root.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = child.material.clone();
          child.material.metalness = 0.25;
          child.material.roughness = 0.55;
        }
      });
      root.scale.setScalar(1.6);
      this.assets.agentPrototype = root;
      this.assets.animations = gltf.animations || [];
    } catch (error) {
      console.warn("Impossibile caricare il modello GLTF", error);
      this.assets.agentPrototype = this.createFallbackAgent();
      this.assets.animations = [];
    }
  }

  createFallbackAgent() {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x61f0ff, metalness: 0.4, roughness: 0.4 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.6, 6, 12), bodyMaterial);
    torso.castShadow = true;
    torso.receiveShadow = true;
    group.add(torso);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), bodyMaterial.clone());
    helmet.position.y = 1.3;
    group.add(helmet);
    return group;
  }

  spawnFriendlies() {
    const squadMembers = this.payload?.match?.playerSquad?.members || [];
    squadMembers.forEach((member, index) => {
      if (member.playerId === this.player.id) return;
      const rig = this.createAgentRig({ isEnemy: false, cosmetic: member.cosmetics });
      const mesh = rig.mesh;
      const spawnPoint = this.consumeSpawnPoint(this.playerSquadIndex) || this.playerSpawnPoint;
      if (spawnPoint) {
        const spawnPosition = this.scaleToVector3(spawnPoint.position);
        mesh.position.copy(spawnPosition);
        mesh.position.y = 1.2;
        if (spawnPoint.rotation) {
          mesh.rotation.y = spawnPoint.rotation[1] || Math.PI;
        }
      } else {
        mesh.position.set(-6 + index * 3, 1.2, -10 - index * 2);
        mesh.rotation.y = Math.PI;
      }
      this.scene.add(mesh);
      rig.play("idle");
      this.registerRig(rig);
      updateScoreboard(member.playerId, { status: "Operativo", kills: 0, deaths: 0 });
    });
  }

  spawnEnemies() {
    this.pendingEnemies = this.enemyBlueprints.map((profile) => ({ ...profile }));
    this.enemies = [];
    this.remainingEnemies = this.totalEnemies;
    const initialBatch = Math.min(this.maxConcurrentEnemies, this.pendingEnemies.length);
    for (let i = 0; i < initialBatch; i += 1) {
      const blueprint = this.pendingEnemies.shift();
      this.spawnEnemy(blueprint);
    }
    if (enemyRemainingLabel) enemyRemainingLabel.textContent = String(this.remainingEnemies);
    enemyScoreLabel.textContent = "0";
    addFeedEntry("Cellule nemiche individuate nella zona d'estrazione.");
  }

  spawnEnemy(blueprint) {
    if (!blueprint) return null;
    const enemySquadIndex = (this.playerSquadIndex + 1 + (blueprint.spawnIndex || 0)) % Math.max(1, this.totalSquads);
    const spawnPoint = this.consumeSpawnPoint(enemySquadIndex);
    const angle = (blueprint.spawnIndex / Math.max(1, this.totalEnemies)) * Math.PI * 2;
    const fallbackRadius = 26 + Math.random() * 6;
    const fallback = new THREE.Vector3(
      Math.cos(angle) * fallbackRadius,
      0,
      Math.sin(angle) * fallbackRadius,
    );
    const spawn = spawnPoint ? this.scaleToVector3(spawnPoint.position) : fallback;
    const rig = this.createAgentRig({ isEnemy: true });
    const mesh = rig.mesh;
    mesh.position.copy(spawn);
    if (spawnPoint?.rotation) {
      mesh.rotation.y = spawnPoint.rotation[1] || angle + Math.PI;
    } else {
      mesh.rotation.y = angle + Math.PI;
    }
    mesh.scale.multiplyScalar(1.05);
    this.scene.add(mesh);
    rig.play("idle");
    this.registerRig(rig);
    const enemy = new EnemyAgent(this, { ...blueprint, spawn }, rig);
    this.enemies.push(enemy);
    return enemy;
  }

  createAgentRig({ isEnemy, cosmetic }) {
    const base = this.assets.agentPrototype ? cloneSkinned(this.assets.agentPrototype) : this.createFallbackAgent();
    base.position.y = 1.2;
    const rig = {
      mesh: base,
      mixer: null,
      actions: {},
      current: null,
      play: (name) => {
        if (!rig.mixer || !rig.actions[name]) return;
        if (rig.current === name) return;
        Object.entries(rig.actions).forEach(([key, action]) => {
          if (key === name) {
            action.reset().fadeIn(0.2).play();
          } else {
            action.fadeOut(0.2);
          }
        });
        rig.current = name;
      },
      update: (delta) => {
        if (rig.mixer) rig.mixer.update(delta);
      },
    };

    if (this.assets.animations && this.assets.animations.length > 0) {
      rig.mixer = new THREE.AnimationMixer(base);
      Object.entries(this.animationBindings || {}).forEach(([state, clipName]) => {
        const clip = THREE.AnimationClip.findByName(this.assets.animations, clipName);
        if (!clip) return;
        const action = rig.mixer.clipAction(clip);
        action.clampWhenFinished = true;
        action.enable = true;
        rig.actions[state] = action;
      });
    }

    base.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        const tint = new THREE.Color(isEnemy ? 0xff5f87 : 0x5fffe8);
        child.material.color.lerp(tint, 0.5);
        child.material.metalness = 0.25;
        child.material.roughness = 0.55;
      }
    });

    if (cosmetic?.thumbnailUrl) {
      base.userData.cosmetic = cosmetic;
    }

    return rig;
  }

  scaleToVector3(position = []) {
    const [x = 0, y = 0, z = 0] = position;
    return new THREE.Vector3(x * this.mapScale, y * this.mapScale, z * this.mapScale);
  }

  consumeSpawnPoint(preferredSquad) {
    if (!this.availableSpawnPoints || this.availableSpawnPoints.length === 0) return null;
    let candidate = this.availableSpawnPoints.find(
      (point) => !point.used && (preferredSquad == null || point.squad === preferredSquad),
    );
    if (!candidate) {
      candidate = this.availableSpawnPoints.find((point) => !point.used);
    }
    if (!candidate) {
      candidate = this.availableSpawnPoints[0];
    }
    candidate.used = true;
    return candidate;
  }

  createSafeZone() {
    if (!this.safePhases.length) return;
    const phase = this.safePhases[0];
    const ringGeometry = new THREE.RingGeometry(Math.max(0.1, phase.scaledRadius - 1.5), phase.scaledRadius, 96);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x5ffff1, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    this.safeZoneMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    this.safeZoneMesh.rotation.x = -Math.PI / 2;
    this.safeZoneMesh.position.set(phase.scaledCenter[0], 0.05, phase.scaledCenter[1]);
    this.scene.add(this.safeZoneMesh);

    const fillGeometry = new THREE.CircleGeometry(Math.max(0.1, phase.scaledRadius - 1.5), 96);
    const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x0f243f, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
    this.safeZoneFill = new THREE.Mesh(fillGeometry, fillMaterial);
    this.safeZoneFill.rotation.x = -Math.PI / 2;
    this.safeZoneFill.position.copy(this.safeZoneMesh.position);
    this.scene.add(this.safeZoneFill);
  }

  updateSafeZone(delta) {
    if (!this.safePhases.length || !this.safeZoneMesh || !this.missionActive) return;
    const currentPhase = this.safePhases[this.safePhaseIndex];
    const nextPhase = this.safePhases[Math.min(this.safePhaseIndex + 1, this.safePhases.length - 1)];
    if (!currentPhase) return;
    this.safePhaseTimer += delta;
    const duration = currentPhase.duration || 120;
    const progress = Math.min(1, this.safePhaseTimer / duration);
    const targetRadius = nextPhase ? nextPhase.scaledRadius : currentPhase.scaledRadius * 0.35;
    const interpolatedRadius = THREE.MathUtils.lerp(currentPhase.scaledRadius, targetRadius, progress);
    const center = nextPhase ? nextPhase.scaledCenter : currentPhase.scaledCenter;
    const innerRadius = Math.max(0.1, interpolatedRadius - 1.4);

    this.safeZoneMesh.geometry.dispose();
    this.safeZoneMesh.geometry = new THREE.RingGeometry(innerRadius, interpolatedRadius, 96);
    this.safeZoneMesh.position.set(center[0], 0.05, center[1]);

    if (this.safeZoneFill) {
      this.safeZoneFill.geometry.dispose();
      this.safeZoneFill.geometry = new THREE.CircleGeometry(innerRadius, 96);
      this.safeZoneFill.position.copy(this.safeZoneMesh.position);
    }

    if (progress >= 1 && this.safePhaseIndex < this.safePhases.length - 1) {
      this.safePhaseIndex += 1;
      this.safePhaseTimer = 0;
      addFeedEntry(`La zona sicura si restringe · fase ${this.safePhaseIndex + 1}`);
    }
  }

  bindInput() {
    document.addEventListener("keydown", (event) => this.onKeyDown(event));
    document.addEventListener("keyup", (event) => this.onKeyUp(event));
    document.addEventListener("mousedown", (event) => {
      if (!this.controls.isLocked) return;
      if (event.button === 0) this.shoot();
    });
    document.addEventListener("mouseup", () => {
      this.weapon.triggerHeld = false;
    });
    this.canvas.addEventListener("click", this.handleClick);
    if (missionExitButton) {
      missionExitButton.addEventListener("click", () => {
        window.location.href = "/";
      });
    }
    if (returnButton) {
      returnButton.addEventListener("click", () => {
        window.location.href = "/";
      });
    }
  }

  handleClick() {
    if (!this.controls.isLocked) {
      this.controls.lock();
    }
  }

  handlePointerLockChange() {
    if (document.pointerLockElement === this.canvas) {
      this.beginMission();
      if (introOverlay) introOverlay.hidden = true;
      this.weapon.triggerHeld = false;
    } else if (!this.missionEnded) {
      this.missionActive = false;
      if (introOverlay) introOverlay.hidden = false;
    }
  }

  beginMission() {
    if (this.missionActive) return;
    this.missionActive = true;
    if (!this.hasLaunched) {
      addFeedEntry("Operazione avviata.");
      this.hasLaunched = true;
      this.safePhaseTimer = 0;
    }
    const phaseName = MATCH_PHASES[Math.min(MATCH_PHASES.length - 1, Math.max(1, phaseIndex))];
    if (statusLabel) statusLabel.textContent = `Operazione attiva · ${phaseName}`;
    if (objectiveLabel) objectiveLabel.textContent = phaseName;
  }

  onKeyDown(event) {
    switch (event.code) {
      case "KeyW":
        this.moveForward = true;
        break;
      case "KeyS":
        this.moveBackward = true;
        break;
      case "KeyA":
        this.moveLeft = true;
        break;
      case "KeyD":
        this.moveRight = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.isSprinting = true;
        break;
      case "Space":
        if (this.canJump) {
          this.velocity.y += 8;
          this.canJump = false;
        }
        break;
      case "KeyR":
        this.reload();
        break;
      default:
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case "KeyW":
        this.moveForward = false;
        break;
      case "KeyS":
        this.moveBackward = false;
        break;
      case "KeyA":
        this.moveLeft = false;
        break;
      case "KeyD":
        this.moveRight = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.isSprinting = false;
        break;
      default:
        break;
    }
  }

  reload() {
    if (this.weapon.reloading || this.weapon.ammo >= this.weapon.clipSize || this.weapon.reserve <= 0) {
      return;
    }
    this.weapon.reloading = true;
    this.weapon.reloadTimer = this.weapon.reloadTime;
    addFeedEntry("Ricarica in corso...");
  }

  shoot() {
    const now = this.clock.elapsedTime;
    if (this.weapon.reloading) return;
    if (this.weapon.ammo <= 0) {
      this.reload();
      return;
    }
    if (now - this.weapon.lastShot < this.weapon.fireRate) {
      return;
    }
    this.weapon.lastShot = now;
    this.weapon.ammo -= 1;
    this.updateWeaponUI();

    const origin = this.controls.getObject().position.clone();
    origin.y -= 0.05;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.raycaster.set(origin, direction);
    const intersections = this.raycaster.intersectObjects(
      this.enemies.map((enemy) => enemy.mesh),
      false
    );
    if (intersections.length > 0) {
      const [{ object }] = intersections;
      const enemy = object.parent?.userData?.enemy || object.userData?.enemy;
      if (enemy) {
        enemy.takeDamage(this.weapon.damage + Math.random() * 12, this.player.id);
        this.showHitMarker("COLPO");
        addFeedEntry(`${this.player.name} colpisce ${enemy.profile.codename}.`);
      }
    }
  }

  showHitMarker(message) {
    if (!hitMarker) return;
    hitMarker.textContent = message;
    hitMarker.hidden = false;
    if (this.hitMarkerTimeout) window.clearTimeout(this.hitMarkerTimeout);
    this.hitMarkerTimeout = window.setTimeout(() => {
      hitMarker.hidden = true;
    }, 320);
  }

  showDamage(message) {
    if (!damageIndicator) return;
    damageIndicator.textContent = message;
    damageIndicator.hidden = false;
    if (this.damageTimeout) window.clearTimeout(this.damageTimeout);
    this.damageTimeout = window.setTimeout(() => {
      damageIndicator.hidden = true;
    }, 420);
  }

  inflictPlayerDamage(amount) {
    if (this.missionEnded) return;
    const shieldDamage = Math.min(this.player.shield, amount);
    this.player.shield -= shieldDamage;
    const healthDamage = amount - shieldDamage;
    if (healthDamage > 0) {
      this.player.health = Math.max(0, this.player.health - healthDamage);
    }
    this.shieldRegenCooldown = 4.2;
    this.healthRegenCooldown = 6.5;
    this.updateVitals();
    if (this.player.health <= 0) {
      this.player.deaths += 1;
      updateScoreboard(this.player.id, {
        deaths: this.player.deaths,
        status: "Down",
      });
      this.endMission(false);
    }
  }

  onEnemyDown(enemy, attackerId) {
    this.enemies = this.enemies.filter((e) => e !== enemy);
    this.remainingEnemies = Math.max(0, this.remainingEnemies - 1);
    if (enemyRemainingLabel) enemyRemainingLabel.textContent = String(this.remainingEnemies);
    if (attackerId === this.player.id) {
      this.player.kills += 1;
      allyScoreLabel.textContent = String(this.player.kills);
      updateScoreboard(this.player.id, {
        kills: this.player.kills,
      });
    }
    const defeated = this.totalEnemies - this.remainingEnemies;
    enemyScoreLabel.textContent = String(defeated);
    addFeedEntry(`${enemy.profile.codename} neutralizzato.`);
    if (
      this.remainingEnemies <= 0 &&
      this.enemies.length === 0 &&
      this.pendingEnemies.length === 0 &&
      this.hasLaunched
    ) {
      this.endMission(true);
    } else {
      this.triggerReinforcement();
    }
  }

  updateWeaponUI() {
    if (weaponNameLabel) weaponNameLabel.textContent = this.weapon.name.toUpperCase();
    if (weaponAmmoLabel) weaponAmmoLabel.textContent = `${this.weapon.ammo} / ${this.weapon.reserve}`;
  }

  updateVitals() {
    if (healthLabel) healthLabel.textContent = `${Math.round(this.player.health)}+${Math.round(this.player.shield)}`;
    if (healthBar) {
      const ratio = Math.max(0, Math.min(1, this.player.health / this.player.maxHealth));
      healthBar.style.width = `${ratio * 100}%`;
    }
    if (shieldBar) {
      const ratio = Math.max(0, Math.min(1, this.player.shield / this.player.maxShield));
      shieldBar.style.width = `${ratio * 100}%`;
    }
  }

  handleReload(delta) {
    if (!this.weapon.reloading) return;
    this.weapon.reloadTimer -= delta;
    if (this.weapon.reloadTimer <= 0) {
      const needed = this.weapon.clipSize - this.weapon.ammo;
      const toLoad = Math.min(needed, this.weapon.reserve);
      this.weapon.ammo += toLoad;
      this.weapon.reserve -= toLoad;
      this.weapon.reloading = false;
      this.updateWeaponUI();
      addFeedEntry("Ricarica completata.");
    }
  }

  updateMovement(delta) {
    const damping = 12.0;
    const speed = this.isSprinting ? 12 : 8;
    this.velocity.x -= this.velocity.x * damping * delta;
    this.velocity.z -= this.velocity.z * damping * delta;
    this.velocity.y -= 30 * delta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * speed * delta;
    if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * speed * delta;

    this.controls.moveRight(-this.velocity.x * delta);
    this.controls.moveForward(-this.velocity.z * delta);

    const position = this.controls.getObject().position;
    position.y += this.velocity.y * delta;
    if (position.y < 1.6) {
      this.velocity.y = 0;
      position.y = 1.6;
      this.canJump = true;
    }
  }

  tickRegeneration(delta) {
    if (this.missionEnded) return;
    if (this.shieldRegenCooldown > 0) {
      this.shieldRegenCooldown = Math.max(0, this.shieldRegenCooldown - delta);
    } else if (this.player.shield < this.player.maxShield) {
      const previous = this.player.shield;
      this.player.shield = Math.min(this.player.maxShield, this.player.shield + 12 * delta);
      if (this.player.shield !== previous) {
        this.updateVitals();
      }
    }

    if (this.player.shield >= this.player.maxShield) {
      if (this.healthRegenCooldown > 0) {
        this.healthRegenCooldown = Math.max(0, this.healthRegenCooldown - delta);
      } else if (this.player.health < this.player.maxHealth) {
        const before = this.player.health;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 5 * delta);
        if (this.player.health !== before) {
          this.updateVitals();
        }
      }
    } else {
      this.healthRegenCooldown = Math.max(this.healthRegenCooldown, 2.5);
    }
  }

  maybeSpawnReinforcements(delta) {
    if (this.pendingEnemies.length === 0) return;
    const desiredActive = Math.min(this.maxConcurrentEnemies, this.remainingEnemies);
    if (this.enemies.length >= desiredActive) return;
    this.reinforcementTimer -= delta;
    if (this.reinforcementTimer > 0) return;
    const blueprint = this.pendingEnemies.shift();
    const spawned = this.spawnEnemy(blueprint);
    this.reinforcementTimer = 5 + Math.random() * 2;
    if (spawned && this.missionActive) {
      addFeedEntry(`${spawned.profile.codename} si unisce allo scontro.`);
    }
    if (enemyRemainingLabel) {
      enemyRemainingLabel.textContent = String(this.remainingEnemies);
    }
  }

  triggerReinforcement() {
    if (this.pendingEnemies.length === 0) return;
    this.reinforcementTimer = Math.min(this.reinforcementTimer, this.missionActive ? 2.2 : 0.8);
  }

  animate() {
    if (this.missionEnded) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    this.handleReload(delta);
    this.updateMovement(delta);
    this.enemies.forEach((enemy) => enemy.update(delta));
    this.rigs.forEach((rig) => rig.update(delta));
    this.tickRegeneration(delta);
    this.maybeSpawnReinforcements(delta);
    this.updateSafeZone(delta);
    this.renderer.render(this.scene, this.camera);
  }

  registerRig(rig) {
    if (!rig) return;
    if (!this.rigs.includes(rig)) {
      this.rigs.push(rig);
    }
  }

  unregisterRig(rig) {
    this.rigs = this.rigs.filter((entry) => entry !== rig);
  }

  onResize() {
    const width = window.innerWidth || this.canvas.clientWidth || 1280;
    const height = window.innerHeight || this.canvas.clientHeight || 720;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  endMission(victory) {
    if (this.missionEnded) return;
    this.missionEnded = true;
    this.missionActive = false;
    stopTimer();
    this.controls.unlock();
    if (missionReport) missionReport.hidden = false;
    if (introOverlay) introOverlay.hidden = true;
    if (missionOutcome) {
      missionOutcome.textContent = victory
        ? `Missione completata · ${this.player.kills} eliminazioni`
        : "Missione fallita · Operatore a terra";
    }
    addFeedEntry(victory ? "Tutte le minacce neutralizzate." : "L'operatore è stato neutralizzato.");
  }
}

function initialiseMission() {
  if (!payload?.match || !canvas) {
    if (statusLabel) statusLabel.textContent = "Sessione non disponibile";
    return;
  }
  initialiseScoreboard();
  updateTimer(payload.match.startedAt);
  const game = new ShooterGame(canvas, payload);
  game
    .boot()
    .then(() => {
      introOverlay?.addEventListener("click", () => {
        if (!game.controls.isLocked) game.controls.lock();
      });
    })
    .catch((error) => {
      console.error("Impossibile avviare la simulazione", error);
      statusLabel.textContent = "Errore simulazione";
      addFeedEntry("Errore nell'inizializzazione del match. Riprova.");
    });
}

window.addEventListener("beforeunload", () => {
  stopTimer();
});

initialiseMission();
