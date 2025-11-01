const matchDataElement = document.getElementById("match-data");
const payload = matchDataElement ? JSON.parse(matchDataElement.textContent) : null;

const statusLabel = document.getElementById("match-status");
const timerLabel = document.getElementById("match-timer");
const eventFeed = document.getElementById("event-feed");
const roster = document.getElementById("squad-roster");
const returnButton = document.getElementById("return-button");
const canvas = document.getElementById("match-canvas");

let timerHandle = null;
let eventHandle = null;
let phaseIndex = 0;

const MATCH_PHASES = [
  "Drop in corso",
  "Rilevamento nemici",
  "Contestazione obiettivi",
  "Spinta finale",
  "Debriefing",
];

function init() {
  if (!payload || !payload.match) {
    statusLabel.textContent = "Sessione non disponibile";
    return;
  }
  statusLabel.textContent = `In missione · ${MATCH_PHASES[0]}`;
  initialiseTimer();
  populateRoster(payload.match, payload.session);
  populateCanvas();
  eventHandle = window.setInterval(pushEvent, 3500);
  returnButton.addEventListener("click", () => {
    window.location.href = "/";
  });
}

function initialiseTimer() {
  const startedAt = payload.match.startedAt ? payload.match.startedAt * 1000 : Date.now();
  const offset = Date.now() - startedAt;
  updateTimer(offset);
  timerHandle = window.setInterval(() => {
    const delta = Date.now() - startedAt;
    updateTimer(delta);
  }, 1000);
}

function updateTimer(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  timerLabel.textContent = `${minutes}:${seconds}`;

  const phase = MATCH_PHASES[Math.min(MATCH_PHASES.length - 1, Math.floor(totalSeconds / 60))];
  if (phase !== MATCH_PHASES[phaseIndex]) {
    phaseIndex = MATCH_PHASES.indexOf(phase);
    statusLabel.textContent = `In missione · ${phase}`;
  }
}

function populateRoster(match, session) {
  if (!match || !roster) return;

  const activePlayerId = session?.playerId;
  Array.from(roster.children).forEach((entry) => {
    if (!activePlayerId) return;
    if (entry.dataset.player === activePlayerId) {
      entry.classList.add("active");
    }
  });
}

function populateCanvas() {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(95, 255, 232, 0.35)");
  gradient.addColorStop(1, "rgba(96, 105, 255, 0.25)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, Math.min(width, height) / 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const squad = payload.match?.squad || [];
  squad.forEach((member, index) => {
    const angle = (Math.PI * 2 * index) / squad.length;
    const radius = Math.min(width, height) / 3;
    const x = width / 2 + Math.cos(angle) * radius;
    const y = height / 2 + Math.sin(angle) * radius;

    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fillStyle = member.isBot ? "rgba(255, 125, 90, 0.9)" : "rgba(95, 255, 232, 0.9)";
    ctx.fill();

    ctx.fillStyle = "#0b1226";
    ctx.font = "600 14px Rajdhani";
    ctx.textAlign = "center";
    ctx.fillText(member.displayName.slice(0, 12), x, y + 40);
  });
}

function pushEvent() {
  const squad = payload.match?.squad || [];
  if (!squad.length) return;
  const actor = squad[Math.floor(Math.random() * squad.length)];
  const actions = actor.isBot
    ? ["analizza la zona", "aggira gli avversari", "fornisce supporto"]
    : ["conquista il punto", "abbatte un avversario", "attiva il faro di drop"];
  const action = actions[Math.floor(Math.random() * actions.length)];
  const li = document.createElement("li");
  li.textContent = `${actor.displayName} ${action}.`;
  eventFeed.prepend(li);

  while (eventFeed.children.length > 8) {
    eventFeed.removeChild(eventFeed.lastChild);
  }
}

window.addEventListener("pageshow", () => {
  if (!timerHandle && payload?.match) {
    initialiseTimer();
  }
});

window.addEventListener("beforeunload", () => {
  if (timerHandle) window.clearInterval(timerHandle);
  if (eventHandle) window.clearInterval(eventHandle);
});

init();
