/**
 * Phase 10 — Test Samples Validator Script
 * 
 * Validates:
 * 1. Every sample file in timetables/, whiteboards/, and messages/ has a matching .json answer file.
 * 2. Holdout subfolders are scanned and validated.
 * 3. Identifies missing answer files, orphaned/extra answer files, and malformed JSON structures.
 * 4. Ensures messages follow the TaskExtract answer format.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLES_DIR = path.resolve(__dirname, "../test_samples");

const CATEGORIES = {
  timetables: {
    extensions: [".png", ".jpg", ".jpeg"],
    validateSchema: (json, filePath) => {
      if (!json || typeof json !== "object") return "Root must be an object";
      const entries = json.entries || json.e;
      if (!Array.isArray(entries)) return "Missing 'entries' array in timetable answer";
      for (let i = 0; i < entries.length; i++) {
        const item = entries[i];
        if (!item.day && !item.rawDay && !item.d) {
          return `Entry ${i} missing 'day' / 'rawDay'`;
        }
        if (item.period === undefined && item.rawPeriod === undefined && item.p === undefined) {
          return `Entry ${i} missing 'period' / 'rawPeriod'`;
        }
        if (!item.subject && !item.rawSubject && !item.s) {
          return `Entry ${i} missing 'subject' / 'rawSubject'`;
        }
      }
      return null;
    },
  },
  whiteboards: {
    extensions: [".png", ".jpg", ".jpeg"],
    validateSchema: (json, filePath) => {
      if (!json || typeof json !== "object") return "Root must be an object";
      const tasks = json.tasks;
      if (!Array.isArray(tasks)) return "Missing 'tasks' array in whiteboard answer";
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        if (!t.title || typeof t.title !== "string") {
          return `Task ${i} missing string 'title'`;
        }
      }
      return null;
    },
  },
  messages: {
    extensions: [".txt"],
    validateSchema: (json, filePath) => {
      // Must conform to TaskExtract answer format
      if (!json || typeof json !== "object") return "Root must be an object";
      const tasks = json.tasks;
      if (!Array.isArray(tasks)) return "Missing 'tasks' array in TaskExtract answer";
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        if (!t.title || typeof t.title !== "string") {
          return `TaskExtract item ${i} missing string 'title'`;
        }
        if (t.type && !["homework", "quiz", "project"].includes(t.type)) {
          return `TaskExtract item ${i} invalid type: ${t.type}`;
        }
      }
      return null;
    },
  },
};

console.log("==================================================");
console.log("  Phase 10 — Test Samples Ground Truth Validator   ");
console.log("==================================================");

if (!fs.existsSync(SAMPLES_DIR)) {
  console.error(`Error: test_samples directory not found at ${SAMPLES_DIR}`);
  process.exit(1);
}

let totalSamples = 0;
let totalHoldouts = 0;
let totalAnswers = 0;
const errors = [];

for (const [category, config] of Object.entries(CATEGORIES)) {
  const catDir = path.join(SAMPLES_DIR, category);
  if (!fs.existsSync(catDir)) {
    errors.push(`Missing category folder: test_samples/${category}`);
    continue;
  }

  const subdirs = [
    { dir: catDir, isHoldout: false, label: category },
    { dir: path.join(catDir, "synthetic"), isHoldout: false, label: `${category}/synthetic` },
    { dir: path.join(catDir, "holdout"), isHoldout: true, label: `${category}/holdout` },
  ];

  for (const { dir, isHoldout, label } of subdirs) {
    if (!fs.existsSync(dir)) {
      if (isHoldout) errors.push(`Missing required holdout folder in test_samples/${label}`);
      continue;
    }

    const files = fs.readdirSync(dir).filter((f) => !f.startsWith("."));
    const sampleFiles = [];
    const jsonFiles = new Set();

    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) continue;

      const ext = path.extname(file).toLowerCase();
      if (config.extensions.includes(ext)) {
        sampleFiles.push(file);
      } else if (ext === ".json") {
        jsonFiles.add(file);
      }
    }

    totalSamples += sampleFiles.length;
    if (isHoldout) totalHoldouts += sampleFiles.length;

    console.log(`\n📂 [${label}] — ${sampleFiles.length} sample(s), ${jsonFiles.size} answer file(s)`);

    // Check each sample has matching answer file
    for (const sample of sampleFiles) {
      const baseName = path.basename(sample, path.extname(sample));
      const expectedJson = `${baseName}.json`;
      const jsonPath = path.join(dir, expectedJson);

      if (!jsonFiles.has(expectedJson)) {
        errors.push(`[${label}] Missing answer file: ${expectedJson} for sample ${sample}`);
        console.log(`  ✗ ${sample} -> Missing ${expectedJson}`);
      } else {
        totalAnswers++;
        jsonFiles.delete(expectedJson); // Mark as claimed

        // Validate JSON content
        try {
          const raw = fs.readFileSync(jsonPath, "utf8");
          const parsed = JSON.parse(raw);
          const schemaErr = config.validateSchema(parsed, jsonPath);
          if (schemaErr) {
            errors.push(`[${label}] Malformed answer file: ${expectedJson} (${schemaErr})`);
            console.log(`  ✗ ${sample} -> ${expectedJson} (Malformed: ${schemaErr})`);
          } else {
            console.log(`  ✓ ${sample} -> ${expectedJson} (Valid)`);
          }
        } catch (parseErr) {
          errors.push(`[${label}] Invalid JSON syntax in ${expectedJson}: ${parseErr.message}`);
          console.log(`  ✗ ${sample} -> ${expectedJson} (JSON syntax error)`);
        }
      }
    }

    // Check for leftover / orphan JSON files
    for (const orphan of jsonFiles) {
      errors.push(`[${label}] Extra/orphaned answer file with no matching sample: ${orphan}`);
      console.log(`  ✗ Orphaned answer file: ${orphan}`);
    }
  }
}

console.log("\n==================================================");
console.log(`Summary:`);
console.log(`- Total Samples: ${totalSamples} (${totalSamples - totalHoldouts} tuning, ${totalHoldouts} holdout)`);
console.log(`- Validated Answers: ${totalAnswers}`);
console.log(`- Validation Status: ${errors.length === 0 ? "PASSED (0 errors)" : `FAILED (${errors.length} errors)`}`);
console.log("==================================================");

if (errors.length > 0) {
  console.error("\nValidation Errors:");
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
} else {
  console.log("\nAll sample answer files are complete and conform to required schemas!");
  process.exit(0);
}
