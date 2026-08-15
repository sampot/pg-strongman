const SAMPLES = {
  wood: "./assets/sfx/impactWood_heavy_000.ogg",
  metal: "./assets/sfx/impactMetal_heavy_000.ogg",
  bell: "./assets/sfx/impactPlate_heavy_000.ogg",
};

export class StrongmanAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.buffers = new Map();
  }

  async unlock() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!this.ctx && AudioContext) this.ctx = new AudioContext();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (!this.buffers.size) {
      await Promise.all(Object.entries(SAMPLES).map(async ([name, url]) => {
        try {
          const response = await fetch(url);
          if (!response.ok) return;
          this.buffers.set(name, await this.ctx.decodeAudioData(await response.arrayBuffer()));
        } catch { /* 使用合成備援 */ }
      }));
    }
  }

  setEnabled(enabled) { this.enabled = enabled; }

  play(name, delay = 0, gainValue = 0.8) {
    if (!this.enabled || !this.ctx) return false;
    const buffer = this.buffers.get(name);
    if (!buffer) return false;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = gainValue;
    source.connect(gain).connect(this.ctx.destination);
    source.start(this.ctx.currentTime + delay);
    return true;
  }

  impact(bell) {
    if (!this.play("wood")) this.synth(92, 0.24, "square", 0);
    if (bell) {
      if (!this.play("bell", 0.75, 0.9)) this.synth(880, 1.1, "sine", 0.75);
      this.play("metal", 0.78, 0.45);
    }
  }

  synth(frequency, duration, type, delay) {
    if (!this.enabled || !this.ctx) return;
    const start = this.ctx.currentTime + delay;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }
}
