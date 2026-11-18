/**
 * Deterministic 9:16 Vertical (1080x1920) Trailer Video & Audio Renderer
 * Outputs:
 *   - public/trailer/StudyAir-Trailer-9x16.mp4  (H.264 + AAC audio, 1080x1920, 30fps, 30.0s)
 *   - public/trailer/StudyAir-Trailer-9x16.webm (VP9, 1080x1920, 30fps, 30.0s)
 *   - public/trailer/assets/still_s1.png .. still_s8.png (8 scene milestone stills)
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync, spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

async function loadChromium() {
  try {
    const pw = await import("playwright");
    return pw.chromium;
  } catch {
    const npxRoot = path.join(os.homedir(), ".npm/_npx");
    if (fs.existsSync(npxRoot)) {
      for (const dir of fs.readdirSync(npxRoot)) {
        const cand = path.join(npxRoot, dir, "node_modules/playwright/index.mjs");
        if (fs.existsSync(cand)) {
          const pw = await import(pathToFileURL(cand).href);
          return pw.chromium;
        }
      }
    }
    throw new Error("Playwright not found");
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const TRAILER_DIR = path.join(ROOT_DIR, "public/trailer");
const ASSETS_DIR = path.join(TRAILER_DIR, "assets");
const HTML_PATH = path.join(TRAILER_DIR, "index.html");
const OUT_MP4 = path.join(TRAILER_DIR, "StudyAir-Trailer-9x16.mp4");
const OUT_WEBM = path.join(TRAILER_DIR, "StudyAir-Trailer-9x16.webm");

const FPS = 30;
const DURATION = 30.0;
const TOTAL_FRAMES = FPS * DURATION; // 900 frames

function findPlaywrightBrowserExecutable() {
  const cacheRoot = path.join(os.homedir(), "Library/Caches/ms-playwright");
  if (fs.existsSync(cacheRoot)) {
    for (const entry of fs.readdirSync(cacheRoot)) {
      if (entry.startsWith("chromium_headless_shell")) {
        const cand = path.join(
          cacheRoot,
          entry,
          "chrome-headless-shell-mac-arm64/chrome-headless-shell"
        );
        if (fs.existsSync(cand)) return cand;
      }
    }
  }
  return undefined;
}
function findSystemFfmpeg() {
  const candidates = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  const whichRes = spawnSync("which", ["ffmpeg"], { encoding: "utf8" });
  if (whichRes.status === 0 && whichRes.stdout.trim()) {
    return whichRes.stdout.trim();
  }
  return null;
}

function findPlaywrightFfmpeg() {
  const cacheRoot = path.join(os.homedir(), "Library/Caches/ms-playwright");
  if (fs.existsSync(cacheRoot)) {
    for (const entry of fs.readdirSync(cacheRoot)) {
      if (entry.startsWith("ffmpeg")) {
        const cand = path.join(cacheRoot, entry, "ffmpeg-mac");
        if (fs.existsSync(cand)) return cand;
      }
    }
  }
  return "ffmpeg";
}

// 1. Synthesize 30.0s Stereo 44.1kHz 16-bit PCM WAV Soundtrack
function generateSoundtrackWav(wavPath) {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * DURATION);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

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

  // Add subtle upbeat rhythmic pulse (128 BPM -> beat every 0.46875s)
  const beatInterval = 60 / 128;
  for (let beat = 0; beat * beatInterval < DURATION; beat++) {
    const t0 = beat * beatInterval;
    const startIdx = Math.floor(t0 * sampleRate);
    const len = Math.floor(0.18 * sampleRate);
    const bassFreq = beat % 4 === 0 ? 65.41 : 98.0;
    for (let i = 0; i < len && startIdx + i < numSamples; i++) {
      const dt = i / sampleRate;
      const env = Math.exp(-dt * 18);
      const val = Math.sin(2 * Math.PI * bassFreq * dt) * env * 0.16;
      left[startIdx + i] += val;
      right[startIdx + i] += val;
    }
  }

  // Add scene transition sub-drops + arpeggio chimes
  sceneStarts.forEach((scStart, sIdx) => {
    const subStart = Math.floor(scStart * sampleRate);
    const subLen = Math.floor(0.55 * sampleRate);
    for (let i = 0; i < subLen && subStart + i < numSamples; i++) {
      const dt = i / sampleRate;
      const freq = 115 * Math.exp(-dt * 2.8) + 36;
      const env = Math.exp(-dt * 6.5);
      const v = Math.sin(2 * Math.PI * freq * dt) * env * 0.34;
      left[subStart + i] += v;
      right[subStart + i] += v;
    }

    const notes = chords[sIdx % chords.length];
    notes.forEach((freq, nIdx) => {
      const noteStart = Math.floor((scStart + nIdx * 0.06) * sampleRate);
      const noteLen = Math.floor(0.55 * sampleRate);
      const pan = 0.3 + 0.4 * (nIdx / Math.max(1, notes.length - 1));
      for (let i = 0; i < noteLen && noteStart + i < numSamples; i++) {
        const dt = i / sampleRate;
        const attack = Math.min(1, dt / 0.015);
        const decay = Math.exp(-dt * 5.2);
        const sig =
          (Math.sin(2 * Math.PI * freq * dt) * 0.75 +
            Math.sin(2 * Math.PI * freq * 2 * dt) * 0.25) *
          attack *
          decay *
          0.18;
        left[noteStart + i] += sig * (1 - pan * 0.4);
        right[noteStart + i] += sig * (0.6 + pan * 0.4);
      }
    });
  });

  // Encode 16-bit stereo WAV header + PCM data
  const dataBytes = numSamples * 4;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(2, 22); // Stereo
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataBytes, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    buf.writeInt16LE(Math.round(l * 32767), offset);
    buf.writeInt16LE(Math.round(r * 32767), offset + 2);
    offset += 4;
  }

  fs.writeFileSync(wavPath, buf);
}

// 2. Swift AVFoundation H.264 + AAC MP4 Encoder Script
const SWIFT_MP4_ENCODER = `
import Foundation
import AVFoundation
import CoreGraphics
import ImageIO

let args = CommandLine.arguments
guard args.count >= 5 else {
    fputs("Usage: encode_mp4 <framesDir> <totalFrames> <wavPath> <outMp4>\\n", stderr)
    exit(1)
}

let framesDir = args[1]
let totalFrames = Int(args[2]) ?? 900
let wavPath = args[3]
let outMp4Path = args[4]
let width = 1080
let height = 1920
let fps: Int32 = 30

let tempVideoUrl = URL(fileURLWithPath: outMp4Path + ".video_only.mp4")
let finalUrl = URL(fileURLWithPath: outMp4Path)
try? FileManager.default.removeItem(at: tempVideoUrl)
try? FileManager.default.removeItem(at: finalUrl)

let writer = try AVAssetWriter(outputURL: tempVideoUrl, fileType: .mp4)
let videoSettings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 6_500_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
    ]
]

let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
writerInput.expectsMediaDataInRealTime = false

let sourceBufferAttributes: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height
]

let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: writerInput,
    sourcePixelBufferAttributes: sourceBufferAttributes
)

writer.add(writerInput)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

func makePixelBuffer(from imagePath: String, pool: CVPixelBufferPool?) -> CVPixelBuffer? {
    let url = URL(fileURLWithPath: imagePath) as CFURL
    guard let src = CGImageSourceCreateWithURL(url, nil),
          let cgImage = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
        return nil
    }
    var pxBuffer: CVPixelBuffer?
    if let pool = pool {
        CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &pxBuffer)
    } else {
        CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32ARGB, nil, &pxBuffer)
    }
    guard let buffer = pxBuffer else { return nil }
    CVPixelBufferLockBaseAddress(buffer, [])
    let data = CVPixelBufferGetBaseAddress(buffer)
    let rgbColorSpace = CGColorSpaceCreateDeviceRGB()
    if let context = CGContext(
        data: data,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: rgbColorSpace,
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
    ) {
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    }
    CVPixelBufferUnlockBaseAddress(buffer, [])
    return buffer
}

for frameIdx in 0..<totalFrames {
    while !writerInput.isReadyForMoreMediaData {
        Thread.sleep(forTimeInterval: 0.002)
    }
    let fileName = String(format: "frame_%04d.jpg", frameIdx)
    let framePath = (framesDir as NSString).appendingPathComponent(fileName)
    if let pb = makePixelBuffer(from: framePath, pool: adaptor.pixelBufferPool) {
        let time = CMTimeMake(value: Int64(frameIdx), timescale: fps)
        adaptor.append(pb, withPresentationTime: time)
    }
}

writerInput.markAsFinished()
let sema = DispatchSemaphore(value: 0)
writer.finishWriting {
    sema.signal()
}
sema.wait()

// Mux video + WAV audio into final MP4 with AAC audio
let composition = AVMutableComposition()
let videoAsset = AVURLAsset(url: tempVideoUrl)
let audioAsset = AVURLAsset(url: URL(fileURLWithPath: wavPath))

if let compVideoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
   let srcVideoTrack = videoAsset.tracks(withMediaType: .video).first {
    try? compVideoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: videoAsset.duration), of: srcVideoTrack, at: .zero)
}

if let compAudioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid),
   let srcAudioTrack = audioAsset.tracks(withMediaType: .audio).first {
    try? compAudioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: videoAsset.duration), of: srcAudioTrack, at: .zero)
}

if let exportSession = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) {
    exportSession.outputURL = finalUrl
    exportSession.outputFileType = .mp4
    exportSession.shouldOptimizeForNetworkUse = true
    let exportSema = DispatchSemaphore(value: 0)
    exportSession.exportAsynchronously {
        exportSema.signal()
    }
    exportSema.wait()
}

try? FileManager.default.removeItem(at: tempVideoUrl)
`;

async function main() {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "studyair-trailer-"));
  const wavPath = path.join(tmpDir, "soundtrack.wav");
  const swiftPath = path.join(tmpDir, "encode_mp4.swift");

  const prebuiltVoMix = path.join(TRAILER_DIR, "soundtrack_with_vo.wav");
  if (fs.existsSync(prebuiltVoMix)) {
    console.log("🎵 [1/4] Using pre-mixed Stereo Soundtrack + Indonesian Voice-Over WAV...");
    fs.copyFileSync(prebuiltVoMix, wavPath);
  } else {
    console.log("🎵 [1/4] Synthesizing 30.0s stereo soundtrack WAV...");
    generateSoundtrackWav(wavPath);
  }

  console.log("🌐 [2/4] Launching headless Chromium at 1080x1920 (9:16 Vertical)...");
  const chromium = await loadChromium();
  const executablePath = findPlaywrightBrowserExecutable();
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`file://${HTML_PATH}?render=1`, { waitUntil: "load" });
  await page.evaluate(() => window.enterRenderMode());

  // Export 8 milestone PNG stills for each scene
  const sceneSampleTimes = [
    { name: "still_s1.png", t: 1.6 },
    { name: "still_s2.png", t: 5.8 },
    { name: "still_s3.png", t: 9.4 },
    { name: "still_s4.png", t: 13.2 },
    { name: "still_s5.png", t: 17.5 },
    { name: "still_s6.png", t: 21.2 },
    { name: "still_s7.png", t: 24.8 },
    { name: "still_s8.png", t: 28.4 },
  ];

  console.log("📸 [2b/4] Capturing 8 high-resolution 1080x1920 scene stills...");
  for (const sample of sceneSampleTimes) {
    await page.evaluate((sec) => window.seekToTime(sec), sample.t);
    await page.screenshot({
      path: path.join(ASSETS_DIR, sample.name),
      type: "png",
    });
  }

  // Spawn Playwright's ffmpeg-mac to encode WebM (VP9) in parallel while capturing frames
  const ffmpegBin = findPlaywrightFfmpeg();
  console.log(`🎬 [3/4] Rendering ${TOTAL_FRAMES} frames (30.0s @ 30fps) & encoding WebM via ${ffmpegBin}...`);

  const ffmpegProc = spawn(
    ffmpegBin,
    [
      "-y",
      "-f", "image2pipe",
      "-vcodec", "mjpeg",
      "-r", String(FPS),
      "-i", "pipe:0",
      "-c:v", "libvpx-vp9",
      "-deadline", "realtime",
      "-cpu-used", "8",
      "-row-mt", "1",
      "-b:v", "4M",
      "-pix_fmt", "yuv420p",
      OUT_WEBM,
    ],
    { stdio: ["pipe", "ignore", "pipe"] }
  );

  // Drain stderr continuously so the 64KB OS pipe buffer never deadlocks ffmpeg
  let ffmpegStderrTail = "";
  ffmpegProc.stderr.on("data", (chunk) => {
    ffmpegStderrTail = (ffmpegStderrTail + chunk.toString()).slice(-1500);
  });

  // Register exit promise immediately at spawn time so early exit is never missed
  const ffmpegExitPromise = new Promise((resolve, reject) => {
    ffmpegProc.on("error", reject);
    ffmpegProc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg WebM exited with code ${code}: ${ffmpegStderrTail}`));
    });
  });

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / FPS;
    await page.evaluate((sec) => window.seekToTime(sec), t);
    const buf = await page.screenshot({ type: "jpeg", quality: 92 });
    const frameFile = path.join(tmpDir, `frame_${String(f).padStart(4, "0")}.jpg`);
    fs.writeFileSync(frameFile, buf);

    if (ffmpegProc.exitCode === null && !ffmpegProc.stdin.destroyed) {
      const canContinue = ffmpegProc.stdin.write(buf);
      if (!canContinue) {
        await new Promise((r) => ffmpegProc.stdin.once("drain", r));
      }
    }

    if ((f + 1) % 150 === 0 || f === TOTAL_FRAMES - 1) {
      console.log(`   → Rendered frame ${f + 1} / ${TOTAL_FRAMES} (${((f + 1) / FPS).toFixed(1)}s)`);
    }
  }

  // Close stdin immediately after frame 900 before awaiting process exit
  ffmpegProc.stdin.end();
  await ffmpegExitPromise;
  await browser.close();

  const sysFfmpeg = findSystemFfmpeg();
  if (sysFfmpeg) {
    console.log(`🍎 [4/4] Encoding H.264 + AAC MP4 (1080x1920) via system ffmpeg (${sysFfmpeg})...`);
    const mp4Res = spawnSync(
      sysFfmpeg,
      [
        "-y",
        "-framerate", String(FPS),
        "-i", path.join(tmpDir, "frame_%04d.jpg"),
        "-i", wavPath,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        OUT_MP4,
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
    if (mp4Res.status !== 0) {
      throw new Error(`System ffmpeg MP4 encode failed: ${mp4Res.stderr?.toString()}`);
    }
  } else {
    console.log("🍎 [4/4] System ffmpeg not found; encoding H.264 + AAC MP4 (1080x1920) via macOS AVFoundation...");
    fs.writeFileSync(swiftPath, SWIFT_MP4_ENCODER, "utf8");
    const swiftRes = spawnSync("swift", [swiftPath, tmpDir, String(TOTAL_FRAMES), wavPath, OUT_MP4], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (swiftRes.status !== 0) {
      throw new Error(`Swift MP4 encoder exited with status ${swiftRes.status}: ${swiftRes.stderr?.toString()}`);
    }
  }

  // Cleanup temp directory
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const mp4SizeMB = (fs.statSync(OUT_MP4).size / (1024 * 1024)).toFixed(2);
  const webmSizeMB = (fs.statSync(OUT_WEBM).size / (1024 * 1024)).toFixed(2);
  console.log("==================================================");
  console.log("✅ STUDYAIR 9:16 VERTICAL TRAILER RENDER COMPLETE!");
  console.log(`📦 MP4  (1080x1920 H.264+AAC): ${OUT_MP4} (${mp4SizeMB} MB)`);
  console.log(`📦 WebM (1080x1920 VP9)      : ${OUT_WEBM} (${webmSizeMB} MB)`);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("❌ Trailer render failed:", err);
  process.exit(1);
});
