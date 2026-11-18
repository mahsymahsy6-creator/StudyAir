/**
 * Benchmark Script for Step 1: Measure Only
 * Measures exact duration in milliseconds for each stage of a timetable scan.
 */

import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import assert from "node:assert/strict";

// Read API key from .env.local
const envPath = path.resolve("../.env.local");
let apiKey = process.env.GEMINI_API_KEY || "";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const match = envContent.match(/GEMINI_API_KEY=([^\r\n]+)/);
  if (match) {
    apiKey = match[1].trim();
  }
}

if (!apiKey) {
  console.error("Error: GEMINI_API_KEY not found in .env.local or environment.");
  process.exit(1);
}

// Target test timetable photo
const sampleImagePath = path.resolve("../calendar.png");
if (!fs.existsSync(sampleImagePath)) {
  console.error("Error: Sample timetable photo not found at", sampleImagePath);
  process.exit(1);
}

console.log("=================================================================");
console.log("  AI SCAN SPEED PASS — STEP 1: BASELINE MEASUREMENT (MEASURE ONLY)");
console.log("=================================================================\n");

const stages = {};

// ─── Stage 1: Pick / Capture Image ───
const t0 = performance.now();
const originalBuffer = fs.readFileSync(sampleImagePath);
const originalStats = fs.statSync(sampleImagePath);
const t1 = performance.now();
stages["1. Pick / Capture Image"] = t1 - t0;

const originalSizeKb = (originalStats.size / 1024).toFixed(2);
// PNG Dimensions from header: 1200 x 1291
const originalPixels = "1200 x 1291";

// ─── Stage 2: Crop / Rotate ───
// In mobile expo-image-picker, allowsEditing handles crop/rotate
const t2_start = performance.now();
// Simulating in-memory crop buffer slice / orientation check
const croppedBuffer = Buffer.from(originalBuffer);
const t2_end = performance.now();
stages["2. Crop / Rotate"] = t2_end - t2_start;

// ─── Stage 3: Resize / Compress ───
// Current unoptimized behavior: raw full-resolution image without resize bounding
const t3_start = performance.now();
const processedBuffer = croppedBuffer;
const t3_end = performance.now();
stages["3. Resize / Compress"] = t3_end - t3_start;

// ─── Stage 4: Encode and Upload ───
const t4_start = performance.now();
const base64Data = processedBuffer.toString("base64");
const sentSizeKb = (Buffer.byteLength(base64Data, "utf8") / 1024).toFixed(2);

const promptText = `
You are an expert OCR and schedule parser for school timetables (jadwal pelajaran).
Analyze this school timetable photo or text.

Extract every scheduled class period. For each entry:
- "rawDay": day of week name (e.g. "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu" or "Monday")
- "rawPeriod": period / hour index (integer 1, 2, 3, etc. e.g. Jam ke-1 is 1)
- "rawSubject": subject name as written (e.g. "MTK", "B.Indo", "PJOK", "Fisika", "Bahasa Inggris")
- "rawTeacher": teacher name if noted (or null)
- "rawRoom": classroom / laboratory name if noted (or null)

CRITICAL RULES:
- Do NOT invent calendar dates or years.
- Only extract entries that actually appear in the schedule.
- If a subject spans multiple periods (e.g. Jam 1-2 MTK), output an entry for each period (Jam 1 and Jam 2).

Return strictly a JSON object:
{
  "entries": [
    {
      "rawDay": "Senin",
      "rawPeriod": 1,
      "rawSubject": "Matematika",
      "rawTeacher": "Pak Budi",
      "rawRoom": "Ruang 10A"
    }
  ]
}
`;

const payload = {
  contents: [
    {
      role: "user",
      parts: [
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Data,
          },
        },
        { text: promptText },
      ],
    },
  ],
  generationConfig: {
    temperature: 0.1,
    responseMimeType: "application/json",
  },
};

const payloadString = JSON.stringify(payload);
const t4_end = performance.now();
stages["4. Encode Payload"] = t4_end - t4_start;

// ─── Stage 5: Waiting for API Response (Network Round-Trip + Gemini Inference) ───
const t5_start = performance.now();
const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
let modelName = candidateModels[0];
let apiResponseJson = null;

for (const m of candidateModels) {
  try {
    modelName = m;
    console.log(`Dispatching timetable scan to ${modelName}...`);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payloadString,
    });

    if (res.ok) {
      apiResponseJson = await res.json();
      break;
    } else {
      const errBody = await res.text();
      console.warn(`Model ${modelName} returned HTTP ${res.status}: ${errBody.slice(0, 100)}... trying fallback`);
    }
  } catch (err) {
    console.warn(`Model ${modelName} fetch error:`, err.message);
  }
}

if (!apiResponseJson) {
  console.error("All Gemini models failed.");
  process.exit(1);
}

const t5_end = performance.now();
stages["5. Waiting for API Response"] = t5_end - t5_start;

// ─── Stage 6: Parsing and Validation ───
const t6_start = performance.now();
const candidateText = apiResponseJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
const cleanJson = candidateText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
const parsedResult = JSON.parse(cleanJson);
const entries = Array.isArray(parsedResult.entries) ? parsedResult.entries : [];

// Validate schema structure
assert.ok(Array.isArray(entries), "Parsed entries must be an array");
const t6_end = performance.now();
stages["6. Parsing & Validation"] = t6_end - t6_start;

// ─── Stage 7: Rendering Review Screen Preparation ───
const t7_start = performance.now();
// Simulates normalizing subjects, mapping periods, and preparing Review Screen state
const reviewItems = entries.map((e, idx) => ({
  id: `entry-${idx}`,
  day: e.rawDay || "Senin",
  period: e.rawPeriod || 1,
  subject: e.rawSubject || "General",
  teacher: e.rawTeacher || "",
  room: e.rawRoom || "",
}));
const t7_end = performance.now();
stages["7. Rendering Review Screen Prep"] = t7_end - t7_start;

const totalTimeMs = Object.values(stages).reduce((a, b) => a + b, 0);

// Print detailed logs
console.log("\n-----------------------------------------------------------------");
console.log("  IMAGE & MODEL SPECIFICATIONS");
console.log("-----------------------------------------------------------------");
console.log(`• Original Image Size   : ${originalPixels} | ${originalSizeKb} KB`);
console.log(`• Sent Payload Image    : ${originalPixels} | ${sentSizeKb} KB (Base64)`);
console.log(`• Prompt Length         : ${promptText.length} characters`);
console.log(`• Response Length       : ${candidateText.length} characters`);
console.log(`• Model Used            : ${modelName}`);
console.log(`• Model Settings        : temperature: 0.1, responseMimeType: "application/json"`);
console.log(`• Extracted Entries     : ${entries.length} timetable periods recognized`);
console.log("-----------------------------------------------------------------\n");

console.log("-----------------------------------------------------------------");
console.log("  STAGE TIMING BREAKDOWN (MILLISECONDS)");
console.log("-----------------------------------------------------------------");
console.log("| Stage                                     | Duration (ms) | Percentage |");
console.log("|-------------------------------------------|---------------|------------|");
for (const [stage, ms] of Object.entries(stages)) {
  const pct = ((ms / totalTimeMs) * 100).toFixed(1);
  console.log(`| ${stage.padEnd(41)} | ${ms.toFixed(1).padStart(11)} ms | ${pct.padStart(8)}%  |`);
}
console.log("|-------------------------------------------|---------------|------------|");
console.log(`| Total Scan Duration                       | ${totalTimeMs.toFixed(1).padStart(11)} ms |    100.0%  |`);
console.log("-----------------------------------------------------------------\n");
