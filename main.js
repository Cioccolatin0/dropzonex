import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';

const canvas = document.getElementById('game-canvas');
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

function createFaceTexture() {
  return createCanvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#0f1f3a';
    ctx.fillRect(0, 0, size, size);

    const visorGradient = ctx.createLinearGradient(0, 0, size, size);
    visorGradient.addColorStop(0, '#0ff6ff');
    visorGradient.addColorStop(1, '#053570');
    ctx.fillStyle = visorGradient;
    const cornerRadius = size * 0.18;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(size * 0.1, size * 0.2, size * 0.8, size * 0.6, cornerRadius);
      ctx.fill();
    } else {
      const x = size * 0.1;
      const y = size * 0.2;
      const width = size * 0.8;
      const height = size * 0.6;
      ctx.beginPath();
      ctx.moveTo(x + cornerRadius, y);
      ctx.lineTo(x + width - cornerRadius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
      ctx.lineTo(x + width, y + height - cornerRadius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
      ctx.lineTo(x + cornerRadius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
      ctx.lineTo(x, y + cornerRadius);
      ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.45);
    ctx.quadraticCurveTo(size * 0.5, size * 0.25, size * 0.8, size * 0.45);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.ellipse(size * 0.35, size * 0.35, size * 0.18, size * 0.08, 0.4, 0, Math.PI * 2);
    ctx.fill();
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

const bodyTexture = createCharacterTexture('#071b39', '#0ff6ff');
const faceTexture = createFaceTexture();
const weaponTexture = createWeaponTexture();

function createCharacter() {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.7), new THREE.MeshStandardMaterial({
    map: bodyTexture,
    metalness: 0.3,
    roughness: 0.5,
    emissive: new THREE.Color('#022240'),
    emissiveIntensity: 0.3,
  }));
  torso.position.y = 1.8;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({
    map: faceTexture,
    metalness: 0.2,
    roughness: 0.4,
    emissive: new THREE.Color('#052e6e'),
    emissiveIntensity: 0.6,
  }));
  head.position.y = 2.7;
  group.add(head);

  const limbMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0a2b4d'),
    metalness: 0.2,
    roughness: 0.6,
    emissive: new THREE.Color('#021627'),
    emissiveIntensity: 0.4,
  });

  const armGeometry = new THREE.BoxGeometry(0.35, 1.2, 0.35);
  const leftArm = new THREE.Mesh(armGeometry, limbMaterial);
  leftArm.position.set(-0.85, 1.85, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, limbMaterial);
  rightArm.position.set(0.85, 1.85, 0);
  group.add(rightArm);

  const legGeometry = new THREE.BoxGeometry(0.45, 1.4, 0.45);
  const leftLeg = new THREE.Mesh(legGeometry, limbMaterial);
  leftLeg.position.set(-0.35, 0.7, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeometry, limbMaterial);
  rightLeg.position.set(0.35, 0.7, 0);
  group.add(rightLeg);

  const visorGlow = new THREE.PointLight('#44f1ff', 1.8, 8);
  visorGlow.position.set(0, 2.7, 0.4);
  group.add(visorGlow);

  const weapon = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.4), new THREE.MeshStandardMaterial({
    map: weaponTexture,
    emissive: new THREE.Color('#ff2d95'),
    emissiveIntensity: 0.5,
    metalness: 0.6,
    roughness: 0.3,
  }));
  weapon.position.set(1.35, 1.6, 0);
  weapon.rotation.z = -Math.PI / 8;
  group.add(weapon);

  return {
    group,
    limbs: { leftArm, rightArm, leftLeg, rightLeg },
    weapon,
  };
}

const heroData = createCharacter();
const hero = heroData.group;
world.add(hero);

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
  { id: 'build_module', label: 'Modulo Costruzione', type: 'build' },
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
  const emissiveColor = colorMap[activeWeapon.rarity] || '#ffffff';
  weapon.material.emissive = new THREE.Color(emissiveColor);
  weapon.material.needsUpdate = true;
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
    • Usa i pulsanti per saltare, sparare e costruire.<br/>
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
    • Tasti 1-3 per cambiare arma, F per costruire struttura selezionata.
  `;
}

const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

function updateCursor() {
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
    onKeyChange(event, true);
    if (event.code === 'Digit1' || event.code === 'Digit2' || event.code === 'Digit3') {
      const index = parseInt(event.code.replace('Digit', ''), 10) - 1;
      if (weapons[index]) {
        activeWeaponIndex.current = index;
        populateUI();
        updateWeaponAppearance();
      }
    }
    if (event.code === 'KeyF') {
      buildStructure('wall');
    }
  });
  document.addEventListener('keyup', (event) => onKeyChange(event, false));
  canvas.addEventListener('mousedown', (event) => {
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
    if (event.button === 0) {
      isShooting = false;
    }
    if (event.button === 2) {
      endCameraDrag();
    }
  });
  document.addEventListener('mousemove', (event) => {
    if (cameraDragState.active) {
      updateCameraDrag(event.clientX, event.clientY);
    }
  });
}

function buildStructure(type) {
  const geometryMap = {
    wall: new THREE.BoxGeometry(3, 3, 0.3),
    ramp: new THREE.BoxGeometry(3, 0.3, 3),
    turret: new THREE.CylinderGeometry(0.7, 1.2, 2.4, 12),
  };

  const material = new THREE.MeshStandardMaterial({
    color: 0x0ff6ff,
    emissive: 0x0ff6ff,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.7,
    metalness: 0.4,
    roughness: 0.3,
  });

  const geometry = geometryMap[type] || geometryMap.wall;
  const structure = new THREE.Mesh(geometry, material);

  const placement = cursor.visible
    ? scratchVector.copy(cursor.position)
    : scratchVector
        .copy(cameraVectors.forward)
        .multiplyScalar(4)
        .add(hero.position);

  const baseHeights = {
    wall: 1.5,
    ramp: 0.2,
    turret: 1.2,
  };

  structure.position.copy(placement);
  structure.position.y = placement.y + (baseHeights[type] ?? 1.2);

  structure.rotation.y = Math.atan2(cameraVectors.forward.x, cameraVectors.forward.z);
  if (type === 'ramp') {
    structure.rotation.x = -Math.PI / 6;
  }
  world.add(structure);

  setTimeout(() => {
    material.opacity = 1;
    material.emissiveIntensity = 0.05;
  }, 1000);
}

const buildButtons = document.querySelectorAll('#build-menu button');
buildButtons.forEach((btn) => {
  btn.addEventListener('click', () => buildStructure(btn.dataset.structure));
});

const jumpButton = document.getElementById('jump-btn');
const fireButton = document.getElementById('fire-btn');
const buildButton = document.getElementById('build-btn');

if (device.isMobile) {
  jumpButton.addEventListener('touchstart', (event) => {
    event.preventDefault();
    movement.jumping = true;
  });
  jumpButton.addEventListener('touchend', (event) => {
    event.preventDefault();
    movement.jumping = false;
  });
  fireButton.addEventListener('touchstart', (event) => {
    event.preventDefault();
    isShooting = true;
  });
  fireButton.addEventListener('touchend', (event) => {
    event.preventDefault();
    isShooting = false;
  });
  buildButton.addEventListener('touchstart', (event) => {
    event.preventDefault();
    buildStructure('ramp');
  });
}

const joystick = document.getElementById('joystick');
const joystickThumb = document.getElementById('joystick-thumb');
let joystickActive = false;
const joystickVector = new THREE.Vector2();

function updateJoystick(event) {
  if (!event.touches || event.touches.length === 0) return;

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
    joystickActive = true;
    updateJoystick(event);
  });

  joystick.addEventListener('touchmove', (event) => {
    event.preventDefault();
    if (!joystickActive) return;
    updateJoystick(event);
  });

  joystick.addEventListener('touchend', resetJoystick);
  joystick.addEventListener('touchcancel', resetJoystick);
}

function updateMovement(delta) {
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

  const isMoving = heroVelocity.lengthSq() > 0;

  heroDisplacement.copy(heroVelocity).multiplyScalar(delta);
  hero.position.add(heroDisplacement);
  hero.position.x = THREE.MathUtils.clamp(hero.position.x, -60, 60);
  hero.position.z = THREE.MathUtils.clamp(hero.position.z, -60, 60);

  const amplitude = isMoving ? 0.3 : 0;
  const legSwingSpeed = isMoving ? 12 : 0;
  const legSwing = Math.sin(clock.elapsedTime * legSwingSpeed) * amplitude;
  heroData.limbs.leftLeg.rotation.x = legSwing;
  heroData.limbs.rightLeg.rotation.x = -legSwing;
  heroData.limbs.leftArm.rotation.x = -legSwing * 0.8;
  heroData.limbs.rightArm.rotation.x = legSwing * 0.8;

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
}

const muzzleFlash = new THREE.PointLight('#ff6f61', 4, 6);
muzzleFlash.visible = false;
hero.add(muzzleFlash);

function updateShooting(delta) {
  if (!isShooting) {
    muzzleFlash.visible = false;
    return;
  }

  muzzleFlash.visible = true;
  muzzleFlash.position.set(1.6, 1.6, -0.1);

  const pulse = (Math.sin(clock.elapsedTime * 40) + 1) / 2;
  muzzleFlash.intensity = 2 + pulse * 4;

  const recoil = Math.sin(clock.elapsedTime * 20) * 0.05;
  heroData.weapon.rotation.x = recoil;
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
  updateMovement(delta);
  updateShooting(delta);
  updateCamera(delta);
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
