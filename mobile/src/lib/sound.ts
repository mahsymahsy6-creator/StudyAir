/**
 * StudyAir Mobile — Sound FX Synthesizer (Zero-Asset Web Audio API)
 *
 * Warm, low-latency procedural audio feedback with soft attack envelopes
 * and low-pass filtering so UI taps and chimes feel natural, never harsh.
 */

import { MilestoneTier, MascotStageId } from "./studyStreakEngine";

class SoundFX {
  private ctx: any | null = null;
  private lastClickAt = 0;
  private lastChimeAt = 0;

  private getAudioContext(): any | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          (window as any).AudioContext ||
          (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Helper: plays a single warm, filtered note with a click-free attack envelope.
   */
  private playNote(
    ctx: any,
    opts: {
      freq: number;
      endFreq?: number;
      start: number;
      duration: number;
      peak?: number;
      type?: OscillatorType;
      cutoff?: number;
    }
  ): void {
    const {
      freq,
      endFreq,
      start,
      duration,
      peak = 0.08,
      type = "sine",
      cutoff = 2400,
    } = opts;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), start + duration);
    }

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, start);

    const attack = Math.min(0.008, duration * 0.2);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration + 0.01);
  }

  /**
   * Unlocks the AudioContext immediately on first user touch/click.
   */
  unlock(): void {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  /**
   * Punchy, crisp tactile micro-tap for buttons, tabs, chips, and controls.
   * Dual-layered: crisp transient pop + resonant warm body.
   * Debounced (20ms) so paired HapticFeedback + soundFX calls never double-fire.
   */
  playClick(): void {
    const nowMs = Date.now();
    if (nowMs - this.lastClickAt < 20) return;
    this.lastClickAt = nowMs;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const fire = () => {
      try {
        const now = ctx.currentTime;
        const jitter = 0.98 + Math.random() * 0.04;

        // 1. Crisp high transient pop
        this.playNote(ctx, {
          freq: 1250 * jitter,
          endFreq: 500 * jitter,
          start: now,
          duration: 0.028,
          peak: 0.22,
          type: "triangle",
          cutoff: 3200,
        });

        // 2. Warm resonant tactile body
        this.playNote(ctx, {
          freq: 460 * jitter,
          endFreq: 220 * jitter,
          start: now,
          duration: 0.045,
          peak: 0.18,
          type: "sine",
          cutoff: 1400,
        });
      } catch {
        // Fallback
      }
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(fire).catch(fire);
    } else {
      fire();
    }
  }

  /**
   * Crisp two-note marimba pop when toggling a task checkbox or checklist item.
   */
  playToggle(checked: boolean = true): void {
    const nowMs = Date.now();
    if (nowMs - this.lastClickAt < 20) return;
    this.lastClickAt = nowMs;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const fire = () => {
      try {
        const now = ctx.currentTime;
        const notes = checked ? [523.25, 783.99] : [440, 329.63];
        notes.forEach((freq, i) => {
          this.playNote(ctx, {
            freq,
            endFreq: freq * (checked ? 1.04 : 0.96),
            start: now + i * 0.045,
            duration: 0.09,
            peak: 0.18,
            type: "sine",
            cutoff: 2200,
          });
        });
      } catch {
        // Fallback
      }
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(fire).catch(fire);
    } else {
      fire();
    }
  }

  /**
   * Gentle warm major-triad chime for completing or saving an action.
   */
  playSuccess(): void {
    const nowMs = Date.now();
    if (nowMs - this.lastChimeAt < 80) return;
    this.lastChimeAt = nowMs;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        this.playNote(ctx, {
          freq,
          start: now + i * 0.055,
          duration: 0.26,
          peak: 0.06,
          type: "sine",
          cutoff: 2200,
        });
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Soft muted low thud for deletes, resets, or warnings.
   */
  playWarning(): void {
    const nowMs = Date.now();
    if (nowMs - this.lastClickAt < 40) return;
    this.lastClickAt = nowMs;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.playNote(ctx, {
        freq: 210,
        endFreq: 115,
        start: now,
        duration: 0.075,
        peak: 0.06,
        type: "triangle",
        cutoff: 650,
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Fanfare chime specific to the streak milestone tier
   */
  playStreakMilestone(tier: MilestoneTier = "bronze"): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (tier === "rainbow") {
        const freqs = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
        freqs.forEach((freq, i) => {
          this.playNote(ctx, {
            freq,
            start: now + i * 0.095,
            duration: 0.75,
            peak: 0.1,
            type: "sine",
            cutoff: 2800,
          });
        });
      } else if (tier === "gold") {
        const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51];
        chord.forEach((freq, idx) => {
          this.playNote(ctx, {
            freq,
            start: now + idx * 0.065,
            duration: 0.7,
            peak: 0.09,
            type: "triangle",
            cutoff: 2000,
          });
        });
      } else if (tier === "silver") {
        const notes = [587.33, 739.99, 880.0, 1174.66];
        notes.forEach((freq, idx) => {
          this.playNote(ctx, {
            freq,
            start: now + idx * 0.1,
            duration: 0.5,
            peak: 0.09,
            type: "sine",
            cutoff: 2400,
          });
        });
      } else {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          this.playNote(ctx, {
            freq,
            start: now + idx * 0.1,
            duration: 0.45,
            peak: 0.085,
            type: "sine",
            cutoff: 2200,
          });
        });
      }
    } catch {
      // AudioContext unavailable or blocked by browser policy
    }
  }

  /**
   * Suspenseful rising mystery tone when inspecting locked secrets
   */
  playMysteryClue(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.playNote(ctx, {
        freq: 330,
        endFreq: 587.33,
        start: now,
        duration: 0.18,
        peak: 0.07,
        type: "sine",
        cutoff: 1600,
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Triumphant unlock reveal sound when discovering a secret milestone
   */
  playMysteryUnlockReveal(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [392.0, 523.25, 659.25, 1046.5].forEach((freq, idx) => {
        this.playNote(ctx, {
          freq,
          start: now + idx * 0.07,
          duration: 0.5,
          peak: 0.09,
          type: "triangle",
          cutoff: 2200,
        });
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Warm whoosh / crackle tone when flame is ignited
   */
  playFlameIgnite(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.playNote(ctx, {
        freq: 220,
        endFreq: 523.25,
        start: now,
        duration: 0.16,
        peak: 0.075,
        type: "sine",
        cutoff: 1500,
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Interactive sounds when tapping on the evolving dragon mascot
   */
  playMascotInteraction(stageId: MascotStageId = "egg"): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (stageId === "deity") {
        [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, idx) => {
          this.playNote(ctx, {
            freq,
            start: now + idx * 0.07,
            duration: 0.55,
            peak: 0.085,
            type: "sine",
            cutoff: 2600,
          });
        });
      } else if (stageId === "winged") {
        this.playNote(ctx, {
          freq: 260,
          endFreq: 520,
          start: now,
          duration: 0.22,
          peak: 0.09,
          type: "triangle",
          cutoff: 1400,
        });
      } else if (stageId === "baby") {
        [587.33, 880].forEach((freq, idx) => {
          this.playNote(ctx, {
            freq,
            endFreq: freq * 1.18,
            start: now + idx * 0.075,
            duration: 0.11,
            peak: 0.08,
            type: "sine",
            cutoff: 2000,
          });
        });
      } else {
        this.playNote(ctx, {
          freq: 440,
          endFreq: 240,
          start: now,
          duration: 0.045,
          peak: 0.07,
          type: "triangle",
          cutoff: 1200,
        });
      }
    } catch {
      // Fallback
    }
  }

  /**
   * Warm munching crunch + happy chirp when feeding the dragon Bara Api
   */
  playDragonEat(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.12].forEach((offset) => {
        this.playNote(ctx, {
          freq: 220,
          endFreq: 130,
          start: now + offset,
          duration: 0.07,
          peak: 0.075,
          type: "triangle",
          cutoff: 900,
        });
      });
      this.playNote(ctx, {
        freq: 523.25,
        endFreq: 783.99,
        start: now + 0.26,
        duration: 0.18,
        peak: 0.08,
        type: "sine",
        cutoff: 2000,
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Gentle warm harmonic purr when petting the dragon
   */
  playDragonPurr(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [261.63, 329.63, 392.0].forEach((freq, idx) => {
        this.playNote(ctx, {
          freq,
          endFreq: freq * 1.02,
          start: now + idx * 0.055,
          duration: 0.35,
          peak: 0.06,
          type: "sine",
          cutoff: 1400,
        });
      });
    } catch {
      // Fallback
    }
  }
}

export const soundFX = new SoundFX();

if (typeof window !== "undefined") {
  const unlockAudio = () => {
    soundFX.unlock();
  };
  window.addEventListener("pointerdown", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
  window.addEventListener("click", unlockAudio, { passive: true });
}
