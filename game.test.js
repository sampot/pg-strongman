import { describe, expect, it } from "vitest";
import {
  BELL_BONUS,
  BELL_THRESHOLD,
  COOLDOWN_MS,
  chargeAt,
  hit,
  labelForHeight,
  newGame,
  ready,
  swingTiming,
} from "./game.js";

describe("力氣錘新局", () => {
  it("建立可蓄力、零分的新局", () => {
    expect(newGame()).toEqual({
      phase: "ready",
      score: 0,
      sessionBest: 0,
      attempts: 0,
      height: 0,
      bell: false,
      label: "輕",
      cooldownMs: 0,
    });
  });
});

describe("蓄力與揮錘節奏", () => {
  it("1.5 秒蓄滿且限制在 0..1", () => {
    expect(chargeAt(-1)).toBe(0);
    expect(chargeAt(750)).toBeCloseTo(0.5);
    expect(chargeAt(2000)).toBe(1);
  });

  it("節奏游標接近打擊區右端時最準", () => {
    expect(swingTiming(0.82)).toBe(1);
    expect(swingTiming(0)).toBeCloseTo(0.25);
    expect(swingTiming(1)).toBeGreaterThan(0.25);
    expect(swingTiming(1)).toBeLessThan(1);
  });
});

describe("擊打與響鈴", () => {
  it("高度由蓄力與節奏共同決定並進入冷卻", () => {
    const result = hit(newGame(), 0.64, 0.5);
    expect(result.height).toBeCloseTo(Math.sqrt(0.64) * 0.5);
    expect(result.score).toBe(Math.floor(result.height * 749));
    expect(result.phase).toBe("cooldown");
    expect(result.cooldownMs).toBe(COOLDOWN_MS);
    expect(result.attempts).toBe(1);
  });

  it("越過門檻會敲鐘並加分", () => {
    const result = hit(newGame(), 1, 1);
    expect(result.height).toBe(1);
    expect(result.height).toBeGreaterThanOrEqual(BELL_THRESHOLD);
    expect(result.bell).toBe(true);
    expect(result.score).toBe(749 + BELL_BONUS);
    expect(result.label).toBe("響鈴");
  });

  it("冷卻中不重複計分，回到 ready 時保留紀錄", () => {
    const first = hit(newGame(), 0.8, 0.8);
    expect(hit(first, 1, 1)).toBe(first);
    const reset = ready(first);
    expect(reset.phase).toBe("ready");
    expect(reset.score).toBe(first.score);
    expect(reset.sessionBest).toBe(first.score);
  });
});

describe("高度標籤", () => {
  it.each([
    [0.1, "輕"],
    [0.4, "中"],
    [0.7, "重"],
    [BELL_THRESHOLD, "響鈴"],
  ])("%f 高度顯示 %s", (height, label) => {
    expect(labelForHeight(height)).toBe(label);
  });
});
