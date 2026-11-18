/**
 * StudyAir - Local APK Download Server
 * Hosts downloadable APK file over local Wi-Fi with responsive landing portal and QR code.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { toQR } from "toqr";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// Resolve APK location
const candidatePaths = [
  path.join(__dirname, "../../public/StudyAir-v2.0.1.apk"),
  path.join(__dirname, "../StudyAir-v2.0.1.apk"),
  path.join(__dirname, "../../public/StudyAir-v3.0.1.apk"),
  path.join(__dirname, "../StudyAir-v3.0.1.apk"),
  path.join(__dirname, "../../public/StudyAir-v2.0.0.apk"),
  path.join(__dirname, "../StudyAir-v2.0.0.apk"),
  path.join(__dirname, "../../public/StudyAir-ExpoGo-v58.0.5.apk"),
  path.join(__dirname, "../../public/Expo-Go-58.0.5.apk"),
  path.join(__dirname, "../Expo-Go-58.0.5.apk"),
];

let apkPath = null;
for (const cand of candidatePaths) {
  if (fs.existsSync(cand)) {
    apkPath = cand;
    break;
  }
}

if (!apkPath) {
  console.error("❌ Error: No APK file found in candidate paths!");
  process.exit(1);
}

const apkStats = fs.statSync(apkPath);
const apkSizeMB = (apkStats.size / (1024 * 1024)).toFixed(1);

// Find primary LAN IPv4 address
function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

const LAN_IP = getLanIp();
const DOWNLOAD_URL = `http://${LAN_IP}:${PORT}/download`;
const PORTAL_URL = `http://${LAN_IP}:${PORT}`;
const EXPO_METRO_URL = `exp://${LAN_IP}:8081`;

// Generate clean vector SVG QR Code
function generateQrSvg(text) {
  const qr = toQR(text);
  const size = Math.round(Math.sqrt(qr.length));
  let pathD = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (qr[y * size + x] === 1) {
        pathD += `M${x + 4},${y + 4}h1v1h-1z `;
      }
    }
  }
  const total = size + 8;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" style="width:100%;height:100%;border-radius:12px;">
    <rect width="${total}" height="${total}" fill="#ffffff" rx="2"/>
    <path d="${pathD.trim()}" fill="#0f172a"/>
  </svg>`;
}

const qrSvg = generateQrSvg(DOWNLOAD_URL);

let downloadCount = 0;

// Render HTML Landing Portal
function renderHtml() {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Unduh StudyAir APK — Peluncur Aplikasi Android</title>
  <link rel="icon" type="image/svg+xml" href="/studyair-icon.svg">
  <style>
    :root {
      --bg: #0C1322;
      --surface: #18223B;
      --surface-border: #233256;
      --primary: #1CB0F6;
      --primary-dark: #1480B2;
      --accent: #58CC02;
      --accent-dark: #46A302;
      --flame: #FF9600;
      --text: #F1F5F9;
      --text-muted: #94A3B8;
      --radius: 16px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body {
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px 16px;
    }
    .container {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .card {
      background: var(--surface);
      border: 2px solid var(--surface-border);
      border-radius: var(--radius);
      padding: 24px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }
    .header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .app-icon {
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, #1CB0F6, #8B5CF6);
      border-radius: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 38px;
      box-shadow: 0 8px 16px rgba(28, 176, 246, 0.3);
      border-bottom: 4px solid var(--primary-dark);
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(28, 176, 246, 0.15);
      border: 1px solid rgba(28, 176, 246, 0.4);
      color: var(--primary);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
    }
    .qr-box {
      background: #FFFFFF;
      padding: 16px;
      border-radius: 18px;
      width: 220px;
      height: 220px;
      margin: 12px auto;
      box-shadow: 0 12px 24px rgba(0,0,0,0.3);
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .qr-caption {
      text-align: center;
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      background: var(--accent);
      color: #FFFFFF;
      text-decoration: none;
      font-size: 18px;
      font-weight: 800;
      padding: 18px 20px;
      border-radius: 14px;
      border-bottom: 5px solid var(--accent-dark);
      transition: all 0.1s ease;
      cursor: pointer;
      box-shadow: 0 6px 16px rgba(88, 204, 2, 0.3);
      text-align: center;
    }
    .btn:hover {
      background: #62d807;
      transform: translateY(-1px);
    }
    .btn:active {
      transform: translateY(3px);
      border-bottom-width: 2px;
    }
    .file-meta {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--text-muted);
      background: rgba(0,0,0,0.25);
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .file-meta b { color: var(--text); }
    .steps-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .step-item {
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--primary);
      color: #FFFFFF;
      font-weight: 800;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .step-text {
      font-size: 14px;
      line-height: 1.45;
      color: var(--text);
    }
    .step-text strong {
      color: var(--primary);
    }
    .url-chip {
      background: rgba(0,0,0,0.3);
      padding: 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
      color: var(--primary);
      text-align: center;
      user-select: all;
    }
    .footer-note {
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="app-icon" style="background:transparent;box-shadow:none;margin-bottom:12px;">
          <img src="/studyair-icon.svg" width="76" height="76" alt="StudyAir Logo" style="border-radius:20px; box-shadow: 0 12px 28px rgba(37,99,235,0.45); border: 2px solid rgba(255,255,255,0.15); display:inline-block;">
        </div>
        <h1>StudyAir Android</h1>
        <div class="badge-pill">
          <span>✨ Rapor Indonesia + TKA Edition</span>
        </div>
        <p style="font-size: 14px; color: var(--text-muted);">
          School Planner & Penjadwal Belajar Mandiri (APK Resmi)
        </p>
      </div>

      <div style="margin: 20px 0;">
        <div class="qr-box">
          ${qrSvg}
        </div>
        <p class="qr-caption">Arahkan kamera HP ke layar untuk unduh seketika</p>
      </div>

      <a href="/download" class="btn">
        <span>⬇️ Unduh APK Sekarang (${apkSizeMB} MB)</span>
      </a>

      <a href="/trailer" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.35); color: #93C5FD; padding: 12px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px; transition: all 0.2s;">
        <span>🎬 Tonton Trailer 9:16 StudyAir (30 Detik)</span>
      </a>

      <a href="/trailer/StudyAir-Trailer-9x16.mp4" download="StudyAir-Trailer-9x16.mp4" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; background: rgba(16, 185, 129, 0.14); border: 1px solid rgba(16, 185, 129, 0.35); color: #6EE7B7; padding: 10px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 13px; transition: all 0.2s;">
        <span>⬇️ Unduh Video Trailer MP4 (1080×1920)</span>
      </a>

      <div class="file-meta" style="margin-top: 14px;">
        <span>Format: <b>.apk (Android)</b></span>
        <span>Ukuran: <b>${apkSizeMB} MB</b></span>
        <span>Versi: <b>v2.0.1</b></span>
      </div>

      <div style="margin-top: 14px;">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px; text-align: center;">Tautan Unduh Langsung:</div>
        <div class="url-chip">${DOWNLOAD_URL}</div>
      </div>
    </div>

    <div class="card steps-card">
      <h3 style="font-size: 16px; font-weight: 700; color: var(--primary);">📲 Cara Pasang di HP Android:</h3>
      
      <div class="step-item">
        <div class="step-num">1</div>
        <div class="step-text">
          Ketuk tombol <strong>Unduh APK</strong> atau scan QR Code di atas menggunakan kamera smartphone Android Anda.
        </div>
      </div>

      <div class="step-item">
        <div class="step-num">2</div>
        <div class="step-text">
          Buka file <code>StudyAir-v2.0.1.apk</code> di folder <em>Download / Unduhan</em> di HP Anda, lalu ketuk <strong>Install</strong>.
        </div>
      </div>

      <div class="step-item">
        <div class="step-num">3</div>
        <div class="step-text">
          Jika muncul peringatan keamanan bawaan Android, pilih <strong>"Tetap Install"</strong> / <em>"Install from unknown sources"</em>.
        </div>
      </div>

      <div class="step-item">
        <div class="step-num">4</div>
        <div class="step-text">
          Buka aplikasi yang terpasang, lalu sambungkan ke server development lokal melalui URL: 
          <code style="color:var(--accent); font-weight:bold;">${EXPO_METRO_URL}</code>
        </div>
      </div>
    </div>

    <div class="footer-note">
      Host Server: <code>${LAN_IP}:${PORT}</code> • Total Berhasil Diunduh: <b>${downloadCount} kali</b>
    </div>
  </div>
</body>
</html>`;
}

// Create HTTP server supporting Range requests for 215MB download
const server = http.createServer((req, res) => {
  const rawUrl = req.url || "/";
  const url = rawUrl.split("?")[0];

  // Endpoint: Download APK
  if (url === "/download" || url.endsWith(".apk")) {
    downloadCount++;
    console.log(`[${new Date().toLocaleTimeString()}] ⬇️ APK Download requested from ${req.socket.remoteAddress} (Total: ${downloadCount})`);

    const stat = fs.statSync(apkPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Support HTTP Range requests for resume & smooth downloading
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(apkPath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="StudyAir-v2.0.1.apk"',
      });

      file.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Accept-Ranges": "bytes",
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="StudyAir-v2.0.1.apk"',
      });

      fs.createReadStream(apkPath).pipe(res);
    }
    return;
  }

  // Endpoint: StudyAir Brand SVG icon
  if (url === "/studyair-icon.svg") {
    const iconPath = path.join(__dirname, "../../public/studyair-icon.svg");
    if (fs.existsSync(iconPath)) {
      res.writeHead(200, {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      });
      res.end(fs.readFileSync(iconPath));
      return;
    }
  }

  // Endpoint: QR SVG direct
  if (url === "/qr.svg") {
    res.writeHead(200, {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(qrSvg);
    return;
  }

  // Endpoint: Health & Version API
  if (url === "/health" || url === "/api/version") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    });
    res.end(
      JSON.stringify({
        status: "ok",
        name: "StudyAir",
        version: "2.0.1",
        versionCode: 4,
        apkFilename: "StudyAir-v2.0.1.apk",
        apkSizeMB,
        port: PORT,
        lanIp: LAN_IP,
        downloadUrl: DOWNLOAD_URL,
        portalUrl: PORTAL_URL,
        downloadCount,
      })
    );
    return;
  }

  // Endpoint: Cinematic Trailer
  if (url === "/trailer" || url === "/trailer/") {
    const trailerHtmlPath = path.join(__dirname, "../../public/trailer/index.html");
    if (fs.existsSync(trailerHtmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(trailerHtmlPath));
      return;
    }
  }

  // Endpoint: 12-Second Keynote Sting (1080x1080)
  if (url === "/sting" || url === "/sting/") {
    const stingHtmlPath = path.join(__dirname, "../../public/sting/index.html");
    if (fs.existsSync(stingHtmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(stingHtmlPath));
      return;
    }
  }

  // Endpoint: Trailer static files (.mp4, .webm, assets)
  if (url.startsWith("/trailer/") && url !== "/trailer/") {
    const relPath = url.replace("/trailer/", "");
    const safeRel = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
    const filePath = path.join(__dirname, "../../public/trailer", safeRel);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes = {
        ".html": "text/html; charset=utf-8",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".m4a": "audio/mp4",
        ".wav": "audio/wav",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
      };
      res.writeHead(200, {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  // Endpoint: Portal Landing Page (Default)
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(renderHtml());
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("==================================================");
  console.log("🚀 STUDYAIR APK DOWNLOAD SERVER IS RUNNING!");
  console.log("==================================================");
  console.log(`📡 Local Portal : http://localhost:${PORT}`);
  console.log(`📱 Wi-Fi Portal : ${PORTAL_URL}`);
  console.log(`⬇️ Direct Download : ${DOWNLOAD_URL}`);
  console.log(`📦 Serving File : ${apkPath} (${apkSizeMB} MB)`);
  console.log("==================================================");
});
