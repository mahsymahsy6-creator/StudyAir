/**
 * StudyAir 9:16 Trailer — Neural Indonesian Voice-Over Generator & Audio Mixer
 * Uses Gemini 2.5 Flash Preview TTS (voice: Aoede) with macOS `say -v Damayanti` fallback.
 * Produces:
 *   - public/trailer/voiceover.wav          (30.0s voiceover-only stereo 44.1kHz WAV)
 *   - public/trailer/voiceover.m4a          (30.0s AAC audio for web trailer playback)
 *   - public/trailer/soundtrack_with_vo.wav (30.0s mixed VO + ducked BGM/SFX stereo WAV)
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const TRAILER_DIR = path.join(ROOT_DIR, "public/trailer");

const SAMPLE_RATE = 44100;
const DURATION = 30.0;
const TOTAL_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

export const VOICEOVER_SCRIPT = [
  {
    sceneId: 0,
    start: 0.12,
    maxEnd: 3.38,
    text: "Tugas sekolah numpuk, bingung mau mulai dari mana?",
  },
  {
    sceneId: 1,
    start: 3.60,
    maxEnd: 6.88,
    text: "Di StudyAir, ketik tugas dan tenggat otomatis terbaca!",
  },
  {
    sceneId: 2,
    start: 7.10,
    maxEnd: 10.85,
    text: "Atau cukup foto papan tulis dan tempel chat grup WhatsApp kelasmu.",
  },
  {
    sceneId: 3,
    start: 11.10,
    maxEnd: 14.85,
    text: "Satu ketuk Buat Jadwal, otomatis menyusun blok belajar tanpa bentrok sekolah.",
  },
  {
    sceneId: 4,
    start: 15.10,
    maxEnd: 18.38,
    text: "Mulai fokus seketika dengan timer Pomodoro anti-distraksi.",
  },
  {
    sceneId: 5,
    start: 18.60,
    maxEnd: 22.38,
    text: "Rawat maskot nagamu hingga Kaisar Kosmik dan pantau statistik harian!",
  },
  {
    sceneId: 6,
    start: 22.60,
    maxEnd: 26.38,
    text: "Lengkap dengan navigasi gestur cepat dan tujuh tema estetik instan.",
  },
  {
    sceneId: 7,
    start: 26.60,
    maxEnd: 29.88,
    text: "StudyAir: Belajar tenang, prestasi terbang! Unduh gratis sekarang.",
  },
];

function readGeminiKey() {
  const envPath = path.join(ROOT_DIR, ".env.local");
  if (!fs.existsSync(envPath)) return "";
  const content = fs.readFileSync(envPath, "utf8");
  const m = content.match(/GEMINI_API_KEY=([^\s\r\n]+)/);
  return m ? m[1].replace(/^["']|["']$/g, "") : "";
}

// Convert raw signed 16-bit LE PCM buffer at srcRate into Float32Array at 44100Hz
function pcm16ToFloat44k(pcmBuf, srcRate) {
  const sampleCount = Math.floor(pcmBuf.length / 2);
  const src = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    src[i] = pcmBuf.readInt16LE(i * 2) / 32768.0;
  }

  // Trim leading and trailing silence (< 0.008 amplitude)
  let start = 0;
  let end = sampleCount - 1;
  while (start < sampleCount && Math.abs(src[start]) < 0.008) start++;
  while (end > start && Math.abs(src[end]) < 0.008) end--;
  start = Math.max(0, start - Math.floor(srcRate * 0.03));
  end = Math.min(sampleCount - 1, end + Math.floor(srcRate * 0.05));
  const trimmedLen = Math.max(1, end - start + 1);

  const outLen = Math.floor((trimmedLen * SAMPLE_RATE) / srcRate);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = start + (i * srcRate) / SAMPLE_RATE;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = src[Math.min(end, idx)] || 0;
    const s1 = src[Math.min(end, idx + 1)] || 0;
    out[i] = s0 + (s1 - s0) * frac;
  }

  // Normalize peak to 0.88
  let peak = 0.01;
  for (let i = 0; i < out.length; i++) {
    const a = Math.abs(out[i]);
    if (a > peak) peak = a;
  }
  const scale = 0.88 / peak;
  for (let i = 0; i < out.length; i++) {
    out[i] *= scale;
  }

  return out;
}

// Fit audio array into maxDurationSeconds by resampling if needed, plus 25ms fade in/out
function fitToWindow(samples, maxSeconds) {
  const maxSamples = Math.floor(maxSeconds * SAMPLE_RATE);
  let result = samples;
  if (samples.length > maxSamples) {
    const ratio = samples.length / maxSamples;
    result = new Float32Array(maxSamples);
    for (let i = 0; i < maxSamples; i++) {
      const srcPos = i * ratio;
      const idx = Math.floor(srcPos);
      const frac = srcPos - idx;
      const a = samples[Math.min(samples.length - 1, idx)] || 0;
      const b = samples[Math.min(samples.length - 1, idx + 1)] || 0;
      result[i] = a + (b - a) * frac;
    }
  }
  const fadeLen = Math.min(Math.floor(SAMPLE_RATE * 0.025), Math.floor(result.length / 4));
  for (let i = 0; i < fadeLen; i++) {
    const g = i / fadeLen;
    result[i] *= g;
    result[result.length - 1 - i] *= g;
  }
  return result;
}

const TTS_MODELS = [
  "gemini-3.8-flash-tts",
  "gemini-3.8-flash-lite-tts",
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
];

async function synthesizeLineGemini(text, apiKey, sceneId) {
  const cacheDir = path.join(TRAILER_DIR, "assets");
  fs.mkdirSync(cacheDir, { recursive: true });
  const cacheFile = path.join(cacheDir, `vo_neural_s${sceneId}.pcm`);
  if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 1000) {
    const pcmBuf = fs.readFileSync(cacheFile);
    return pcm16ToFloat44k(pcmBuf, 24000);
  }
  if (!apiKey) return null;
  for (let i = 0; i < TTS_MODELS.length; i++) {
    const model = TTS_MODELS[(sceneId + i) % TTS_MODELS.length];
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Bacakan naskah iklan aplikasi pelajar ini dalam Bahasa Indonesia dengan nada antusias, cepat, ramah, dan jelas: "${text}"`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
              },
            },
          }),
        }
      );
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      const data = await res.json();
      const inline = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inline?.data) {
        const pcmBuf = Buffer.from(inline.data, "base64");
        fs.writeFileSync(cacheFile, pcmBuf);
        return pcm16ToFloat44k(pcmBuf, 24000);
      }
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}

function synthesizeLineMacFallback(text) {
  const tmpWav = path.join(os.tmpdir(), `vo_fallback_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`);
  spawnSync("say", ["-v", "Damayanti", "-r", "205", "-o", tmpWav, "--data-format=LEI16@44100", text]);
  const wavBuf = fs.readFileSync(tmpWav);
  fs.rmSync(tmpWav, { force: true });
  // Skip 44-byte WAV header
  const pcmBuf = wavBuf.subarray(44);
  return pcm16ToFloat44k(pcmBuf, 44100);
}

function writeStereoWav(filePath, left, right) {
  const dataBytes = left.length * 4;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataBytes, 40);

  let offset = 44;
  for (let i = 0; i < left.length; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    buf.writeInt16LE(Math.round(l * 32767), offset);
    buf.writeInt16LE(Math.round(r * 32767), offset + 2);
    offset += 4;
  }
  fs.writeFileSync(filePath, buf);
}

async function main() {
  fs.mkdirSync(TRAILER_DIR, { recursive: true });
  const apiKey = readGeminiKey();

  const voLeft = new Float32Array(TOTAL_SAMPLES);
  const voRight = new Float32Array(TOTAL_SAMPLES);
  const voEnvelope = new Float32Array(TOTAL_SAMPLES);

  console.log("🎙️ Generating 8-scene Indonesian Voice-Over track...");
  for (const item of VOICEOVER_SCRIPT) {
    const windowSec = item.maxEnd - item.start;
    let clip = await synthesizeLineGemini(item.text, apiKey, item.sceneId);
    let engineLabel = "Gemini Neural TTS (Aoede)";
    if (!clip) {
      clip = synthesizeLineMacFallback(item.text);
      engineLabel = "macOS Damayanti TTS";
    }
    const fitted = fitToWindow(clip, windowSec);
    const startSample = Math.floor(item.start * SAMPLE_RATE);

    for (let i = 0; i < fitted.length && startSample + i < TOTAL_SAMPLES; i++) {
      voLeft[startSample + i] += fitted[i];
      voRight[startSample + i] += fitted[i];
      voEnvelope[startSample + i] = 1.0;
    }

    console.log(
      `   ✓ Scene ${item.sceneId + 1} (${item.start.toFixed(2)}s–${(item.start + fitted.length / SAMPLE_RATE).toFixed(2)}s) [${engineLabel}]: "${item.text}"`
    );
  }

  // Synthesize background music & scene transitions with automatic voiceover ducking
  const mixLeft = new Float32Array(TOTAL_SAMPLES);
  const mixRight = new Float32Array(TOTAL_SAMPLES);

  const sceneStarts = [0.0, 3.5, 7.0, 11.0, 15.0, 18.5, 22.5, 26.5];
  const chords = [
    [220.0, 261.63, 329.63],
    [261.63, 329.63, 392.0, 523.25],
    [293.66, 369.99, 440.0, 587.33],
    [329.63, 415.3, 493.88, 659.25],
    [349.23, 440.0, 523.25, 698.46],
    [392.0, 493.88, 587.33, 783.99],
    [440.0, 554.37, 659.25, 880.0],
    [523.25, 659.25, 783.99, 1046.5],
  ];

  // Upbeat pulse (128 BPM)
  const beatInterval = 60 / 128;
  for (let beat = 0; beat * beatInterval < DURATION; beat++) {
    const t0 = beat * beatInterval;
    const startIdx = Math.floor(t0 * SAMPLE_RATE);
    const len = Math.floor(0.18 * SAMPLE_RATE);
    const bassFreq = beat % 4 === 0 ? 65.41 : 98.0;
    for (let i = 0; i < len && startIdx + i < TOTAL_SAMPLES; i++) {
      const dt = i / SAMPLE_RATE;
      const env = Math.exp(-dt * 18);
      const val = Math.sin(2 * Math.PI * bassFreq * dt) * env * 0.14;
      mixLeft[startIdx + i] += val;
      mixRight[startIdx + i] += val;
    }
  }

  // Scene transitions
  sceneStarts.forEach((scStart, sIdx) => {
    const subStart = Math.floor(scStart * SAMPLE_RATE);
    const subLen = Math.floor(0.55 * SAMPLE_RATE);
    for (let i = 0; i < subLen && subStart + i < TOTAL_SAMPLES; i++) {
      const dt = i / SAMPLE_RATE;
      const freq = 115 * Math.exp(-dt * 2.8) + 36;
      const env = Math.exp(-dt * 6.5);
      const v = Math.sin(2 * Math.PI * freq * dt) * env * 0.28;
      mixLeft[subStart + i] += v;
      mixRight[subStart + i] += v;
    }

    const notes = chords[sIdx % chords.length];
    notes.forEach((freq, nIdx) => {
      const noteStart = Math.floor((scStart + nIdx * 0.06) * SAMPLE_RATE);
      const noteLen = Math.floor(0.55 * SAMPLE_RATE);
      const pan = 0.3 + 0.4 * (nIdx / Math.max(1, notes.length - 1));
      for (let i = 0; i < noteLen && noteStart + i < TOTAL_SAMPLES; i++) {
        const dt = i / SAMPLE_RATE;
        const attack = Math.min(1, dt / 0.015);
        const decay = Math.exp(-dt * 5.2);
        const sig =
          (Math.sin(2 * Math.PI * freq * dt) * 0.75 +
            Math.sin(2 * Math.PI * freq * 2 * dt) * 0.25) *
          attack *
          decay *
          0.14;
        mixLeft[noteStart + i] += sig * (1 - pan * 0.4);
        mixRight[noteStart + i] += sig * (0.6 + pan * 0.4);
      }
    });
  });

  // Duck BGM when VO is active and sum with VO
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const duck = voEnvelope[i] > 0 ? 0.36 : 0.85;
    mixLeft[i] = mixLeft[i] * duck + voLeft[i] * 0.95;
    mixRight[i] = mixRight[i] * duck + voRight[i] * 0.95;
  }

  const voWavPath = path.join(TRAILER_DIR, "voiceover.wav");
  const voM4aPath = path.join(TRAILER_DIR, "voiceover.m4a");
  const mixWavPath = path.join(TRAILER_DIR, "soundtrack_with_vo.wav");

  writeStereoWav(voWavPath, voLeft, voRight);
  writeStereoWav(mixWavPath, mixLeft, mixRight);

  // Convert voiceover.wav -> voiceover.m4a via macOS afconvert for fast browser loading
  spawnSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "128000", voWavPath, voM4aPath]);

  console.log("✅ Voice-Over audio files generated:");
  console.log("   •", voWavPath);
  console.log("   •", voM4aPath);
  console.log("   •", mixWavPath);
}

main().catch((err) => {
  console.error("❌ Failed to generate voiceover:", err);
  process.exit(1);
});
