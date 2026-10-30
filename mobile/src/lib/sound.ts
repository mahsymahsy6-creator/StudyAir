/**
 * StudyAir Mobile — Sound FX Synthesizer (Zero-Asset Web Audio API)
 * 
 * Provides responsive, zero-latency audio feedback without external MP3 files:
 * - Milestone achievements (Bronze, Silver, Gold, Rainbow fanfare chords)
 * - Secret milestone clues and unlock reveals
 * - Warm flame ignition effects
 * - UI tap sounds
 */

import { MilestoneTier } from "./studyStreakEngine";

class SoundFX {
  private ctx: any | null = null;

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
   * Fanfare chime specific to the streak milestone tier
   */
  playStreakMilestone(tier: MilestoneTier = "bronze"): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (tier === "rainbow") {
        // Prismatic cosmic harp glissando: C5 -> E5 -> G5 -> B5 -> D6 -> G6
        const freqs = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.11);

          gain.gain.setValueAtTime(0, now + i * 0.11);
          gain.gain.linearRampToValueAtTime(0.18, now + i * 0.11 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.11 + 0.9);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + i * 0.11);
          osc.stop(now + i * 0.11 + 0.95);
        });
      } else if (tier === "gold") {
        // Triumphant brass-like synth chord: E5, G#5, B5, E6
        const chord = [659.25, 830.61, 987.77, 1318.51];
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          gain.gain.setValueAtTime(0, now + idx * 0.06);
          gain.gain.linearRampToValueAtTime(0.16, now + idx * 0.06 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.85);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.9);
        });
      } else if (tier === "silver") {
        // Electric chime fanfare: D5 -> F#5 -> A5 -> D6
        const notes = [587.33, 739.99, 880.0, 1174.66];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          gain.gain.setValueAtTime(0, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.12 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.6);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.65);
        });
      } else {
        // Bronze: Warm campfire upbeat arpeggio: C5 -> E5 -> G5 -> C6
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.13);

          gain.gain.setValueAtTime(0, now + idx * 0.13);
          gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.13 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.13 + 0.55);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.13);
          osc.stop(now + idx * 0.13 + 0.6);
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
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.18);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
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
      // Low sweep into brilliant sparkle
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.22);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.75);
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
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Fallback
    }
  }

  /**
   * Crisp micro-tap click
   */
  playClick(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.035);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Fallback
    }
  }
}

export const soundFX = new SoundFX();
