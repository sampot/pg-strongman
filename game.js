export const CHARGE_MS = 1500;
export const COOLDOWN_MS = 1500;
export const BELL_THRESHOLD = 0.92;
export const BELL_BONUS = 250;

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export function newGame() {
  return {
    phase: "ready",
    score: 0,
    sessionBest: 0,
    attempts: 0,
    height: 0,
    bell: false,
    label: "輕",
    cooldownMs: 0,
  };
}

export function chargeAt(elapsedMs) {
  return clamp01(elapsedMs / CHARGE_MS);
}

export function swingTiming(position) {
  const distance = Math.abs(clamp01(position) - 0.82) / 0.82;
  return 0.25 + 0.75 * (1 - clamp01(distance));
}

export function labelForHeight(height) {
  if (height >= BELL_THRESHOLD) return "響鈴";
  if (height >= 0.62) return "重";
  if (height >= 0.32) return "中";
  return "輕";
}

export function hit(state, charge, timing) {
  if (state.phase === "cooldown") return state;
  const height = clamp01(Math.sqrt(clamp01(charge)) * clamp01(timing));
  const bell = height >= BELL_THRESHOLD;
  const score = Math.floor(height * 749) + (bell ? BELL_BONUS : 0);
  return {
    ...state,
    phase: "cooldown",
    score,
    sessionBest: Math.max(state.sessionBest, score),
    attempts: state.attempts + 1,
    height,
    bell,
    label: labelForHeight(height),
    cooldownMs: COOLDOWN_MS,
  };
}

export function ready(state) {
  return { ...state, phase: "ready", cooldownMs: 0 };
}
