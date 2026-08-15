import { chargeAt, hit, newGame, ready, swingTiming } from "./game.js";
import { StrongmanAudio } from "./audio.js";

const BEST_KEY = "pg-strongman-best";
const audio = new StrongmanAudio();
const $ = (id) => document.getElementById(id);
const els = {
  score: $("score"), sessionBest: $("session-best"), best: $("best"), status: $("status"),
  charge: $("charge-fill"), cursor: $("timing-cursor"), climber: $("climber"),
  bell: $("bell"), mallet: $("mallet"), pad: $("pad"),
  swing: $("swing-button"), reset: $("reset-button"), mute: $("mute-button"),
};

let state = newGame();
let storedBest = 0;
let charging = false;
let startedAt = 0;
let cursorPosition = 0;
let frame = 0;
let muted = false;
let round = 0;

const digits = (value) => String(value).padStart(3, "0");

function render() {
  els.score.textContent = digits(state.score);
  els.sessionBest.textContent = digits(state.sessionBest);
  els.best.textContent = digits(storedBest);
  els.swing.disabled = state.phase === "cooldown";
}

async function loadBest() {
  try {
    const response = await fetch(`/api/kv/${BEST_KEY}`);
    const value = Number((await response.text()).trim());
    if (response.ok && Number.isInteger(value) && value >= 0) storedBest = value;
  } catch { /* 單機模式 */ }
  render();
}

async function saveBest(value) {
  storedBest = value;
  render();
  try {
    await fetch(`/api/kv/${BEST_KEY}`, { method: "PUT", body: String(value) });
  } catch { /* 單機模式 */ }
}

function animateCharge(now) {
  if (!charging) return;
  const elapsed = now - startedAt;
  const cycle = (elapsed / 620) % 2;
  cursorPosition = cycle <= 1 ? cycle : 2 - cycle;
  els.cursor.style.left = `${cursorPosition * 100}%`;
  els.charge.style.width = `${chargeAt(elapsed) * 100}%`;
  frame = requestAnimationFrame(animateCharge);
}

async function beginSwing(event) {
  if (charging || state.phase !== "ready") return;
  event.preventDefault();
  await audio.unlock();
  charging = true;
  startedAt = performance.now();
  els.mallet.className = "mallet charging";
  els.swing.classList.add("charging");
  els.swing.textContent = "放開落槌！";
  els.status.textContent = "穩住力量，等游標進入落槌區！";
  if (typeof event.pointerId === "number") els.swing.setPointerCapture?.(event.pointerId);
  frame = requestAnimationFrame(animateCharge);
}

function releaseSwing(event) {
  if (!charging) return;
  event?.preventDefault();
  charging = false;
  cancelAnimationFrame(frame);
  state = hit(state, chargeAt(performance.now() - startedAt), swingTiming(cursorPosition));
  const thisRound = ++round;
  els.swing.classList.remove("charging");
  els.swing.textContent = "落槌中…";
  els.mallet.className = "mallet swing";
  els.pad.classList.remove("hit");
  els.bell.classList.remove("ring");
  els.climber.style.transform = "translate(-50%, 0)";
  render();

  window.setTimeout(() => {
    if (round !== thisRound) return;
    els.pad.classList.add("hit");
    els.climber.style.transform = `translate(-50%, -${state.height * 234}px)`;
    audio.impact(state.bell);
    els.status.textContent = state.bell
      ? `${state.score} 分！敲響金鐘，獎勵 +250！`
      : `${state.score} 分，力量：${state.label}`;
    if (state.bell) els.bell.classList.add("ring");
    if (state.score > storedBest) void saveBest(state.score);
  }, 390);

  window.setTimeout(() => {
    if (round !== thisRound) return;
    state = ready(state);
    els.mallet.className = "mallet";
    els.swing.textContent = "按住蓄力揮錘";
    els.status.textContent = "木槌歸位，再挑戰一次！";
    els.charge.style.width = "0%";
    render();
  }, state.cooldownMs);
}

function resetGame() {
  round += 1;
  charging = false;
  cancelAnimationFrame(frame);
  state = newGame();
  els.mallet.className = "mallet";
  els.bell.classList.remove("ring");
  els.pad.classList.remove("hit");
  els.climber.style.transform = "translate(-50%, 0)";
  els.charge.style.width = "0%";
  els.cursor.style.left = "0%";
  els.swing.classList.remove("charging");
  els.swing.textContent = "按住蓄力揮錘";
  els.status.textContent = "新局開始，準備揮錘！";
  render();
}

els.swing.addEventListener("pointerdown", beginSwing);
els.swing.addEventListener("pointerup", releaseSwing);
els.swing.addEventListener("pointercancel", releaseSwing);
els.reset.addEventListener("click", resetGame);
els.mute.addEventListener("click", () => {
  muted = !muted;
  audio.setEnabled(!muted);
  els.mute.textContent = muted ? "音效關" : "音效開";
  els.mute.setAttribute("aria-pressed", String(muted));
});
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !event.repeat) void beginSwing(event);
});
window.addEventListener("keyup", (event) => {
  if (event.code === "Space") releaseSwing(event);
});

render();
void loadBest();
