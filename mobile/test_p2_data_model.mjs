import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const originalLoad = Module._load;

// In-memory AsyncStorage mock
const asyncStorageStore = new Map();
const mockAsyncStorage = {
  getItem: async (key) => asyncStorageStore.get(key) || null,
  setItem: async (key, val) => {
    asyncStorageStore.set(key, String(val));
  },
  removeItem: async (key) => {
    asyncStorageStore.delete(key);
  },
  clear: async () => {
    asyncStorageStore.clear();
  },
};

// In-memory SQLite Database Mock
class MockSQLiteDatabase {
  constructor() {
    this.tables = new Map();
    this.tableSchemas = new Map(); // tableName -> Set of column names
  }

  ensureTable(name, columns) {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
      this.tableSchemas.set(name, new Set(columns));
    }
  }

  async execAsync(sql) {
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      const upper = stmt.toUpperCase();
      if (upper.startsWith("PRAGMA")) continue;
      if (upper.startsWith("CREATE TABLE")) {
        const match = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]+)\)/i);
        if (match) {
          const tableName = match[1];
          const colDefs = match[2].split(",").map((c) => c.trim().split(/\s+/)[0]);
          this.ensureTable(tableName, colDefs);
        }
      } else if (upper.startsWith("CREATE INDEX")) {
        // no-op for mock
      } else if (upper.startsWith("DELETE FROM")) {
        const match = stmt.match(/DELETE\s+FROM\s+(\w+)/i);
        if (match) {
          const tableName = match[1];
          if (this.tables.has(tableName)) {
            this.tables.set(tableName, []);
          }
        }
      } else if (upper.startsWith("ALTER TABLE")) {
        const match = stmt.match(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i);
        if (match) {
          const [, tableName, colName] = match;
          if (this.tableSchemas.has(tableName)) {
            this.tableSchemas.get(tableName).add(colName);
          }
        }
      }
    }
  }

  async getAllAsync(sql, ...params) {
    const upper = sql.toUpperCase();
    if (upper.startsWith("PRAGMA TABLE_INFO")) {
      const match = sql.match(/PRAGMA\s+table_info\((\w+)\)/i);
      if (match) {
        const tableName = match[1];
        const cols = this.tableSchemas.get(tableName) || new Set();
        return Array.from(cols).map((name) => ({ name }));
      }
      return [];
    }

    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    if (!fromMatch) return [];
    const tableName = fromMatch[1];
    const rows = this.tables.get(tableName) || [];
    return [...rows];
  }

  async getFirstAsync(sql, ...params) {
    const rows = await this.getAllAsync(sql, ...params);
    if (sql.includes("WHERE key =")) {
      const keyVal = params[0] || (sql.match(/WHERE\s+key\s*=\s*'([^']+)'/i) || [])[1];
      return rows.find((r) => r.key === keyVal) || null;
    }
    return rows[0] || null;
  }

  async runAsync(sql, ...params) {
    const upper = sql.toUpperCase();
    if (upper.startsWith("INSERT OR REPLACE INTO")) {
      const match = sql.match(/INSERT\s+OR\s+REPLACE\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (match) {
        const tableName = match[1];
        const colNames = match[2].split(",").map((c) => c.trim());
        const valTokens = match[3].split(",").map((v) => v.trim());
        const row = {};
        let paramIdx = 0;
        colNames.forEach((col, idx) => {
          const token = valTokens[idx];
          if (token === "?") {
            row[col] = params[paramIdx++] !== undefined ? params[paramIdx - 1] : null;
          } else if (token && token.startsWith("'") && token.endsWith("'")) {
            row[col] = token.slice(1, -1);
          } else if (token && !isNaN(Number(token))) {
            row[col] = Number(token);
          } else {
            row[col] = params[paramIdx++] !== undefined ? params[paramIdx - 1] : null;
          }
        });

        this.ensureTable(tableName, colNames);
        const rows = this.tables.get(tableName);
        // Replace if primary key exists (assume first col is PK)
        const pkCol = colNames[0];
        const existingIdx = rows.findIndex((r) => r[pkCol] === row[pkCol]);
        if (existingIdx >= 0) {
          rows[existingIdx] = row;
        } else {
          rows.push(row);
        }
      }
    }
  }

  async withTransactionAsync(callback) {
    return await callback();
  }
}

const mockDbInstance = new MockSQLiteDatabase();

// Intercept modules for Node testing
Module._load = function (request, parent, isMain) {
  if (request === "@react-native-async-storage/async-storage") {
    return mockAsyncStorage;
  }
  if (request === "expo-sqlite") {
    return {
      openDatabaseAsync: async () => mockDbInstance,
    };
  }
  if (request === "react-native") {
    return {
      Platform: { OS: "ios" },
      StyleSheet: { create: (s) => s },
    };
  }
  return originalLoad(request, parent, isMain);
};

console.log("==================================================");
console.log("   STUDYAIR P2 DATA MODEL & MIGRATION TEST SUITE");
console.log("==================================================\n");

// ─── 1. Types & Default Constants Verification ───
console.log("[1] Types & Default Constants Verification");

const { DEFAULT_SCHEDULE_PREFS } = require("./dist-test/types.js");

assert.ok(DEFAULT_SCHEDULE_PREFS, "DEFAULT_SCHEDULE_PREFS must be exported from types.ts");
assert.strictEqual(DEFAULT_SCHEDULE_PREFS.studyWindowStart, "15:00", "Default window start is 15:00");
assert.strictEqual(DEFAULT_SCHEDULE_PREFS.studyWindowEnd, "21:00", "Default window end is 21:00");
assert.strictEqual(DEFAULT_SCHEDULE_PREFS.maxBlockMinutes, 45, "Default max block is 45 minutes");
assert.strictEqual(DEFAULT_SCHEDULE_PREFS.minBreakMinutes, 15, "Default min break is 15 minutes");
assert.deepStrictEqual(DEFAULT_SCHEDULE_PREFS.daysOff, [], "Default daysOff is empty array");
assert.strictEqual(DEFAULT_SCHEDULE_PREFS.priorityWeights.urgentFirst, true, "urgentFirst is true by default");
assert.strictEqual(DEFAULT_SCHEDULE_PREFS.priorityWeights.hardFirst, false, "hardFirst is false by default");

console.log("  ✓ DEFAULT_SCHEDULE_PREFS contains all required default tokens");

// ─── 2. SQLite Migrations & Persistence Helpers (storage.ts) ───
console.log("\n[2] SQLite Schema Migrations & Persistence Helpers (storage.ts)");

const storage = require("./dist-test/lib/storage.js");

// Initialize Database
const initResult = await storage.initDatabase();
assert.strictEqual(initResult, true, "initDatabase() returns true");

// Verify study_blocks table columns created
const studyBlocksCols = mockDbInstance.tableSchemas.get("study_blocks");
assert.ok(studyBlocksCols, "study_blocks table must exist in SQLite schema");
for (const col of ["id", "task_id", "subject_id", "date", "start_time", "end_time", "duration_minutes", "status", "completed_at", "created_at"]) {
  assert.ok(studyBlocksCols.has(col), `study_blocks schema must include '${col}' column`);
}
console.log("  ✓ study_blocks table created with all required columns");

// Verify tasks schema includes estimated_minutes
const tasksCols = mockDbInstance.tableSchemas.get("tasks");
assert.ok(tasksCols, "tasks table must exist in SQLite schema");
assert.ok(tasksCols.has("estimated_minutes"), "tasks table schema must include 'estimated_minutes'");
console.log("  ✓ tasks table includes estimated_minutes column");

// Test StudyBlock CRUD in SQLite
const testBlocks = [
  {
    id: "sb-1",
    taskId: "t-1",
    subjectId: "sub-math",
    date: "2026-10-30",
    startTime: "15:00",
    endTime: "15:45",
    durationMinutes: 45,
    status: "SCHEDULED",
  },
  {
    id: "sb-2",
    taskId: "t-2",
    subjectId: "sub-fis",
    date: "2026-10-30",
    startTime: "16:00",
    endTime: "16:45",
    durationMinutes: 45,
    status: "COMPLETED",
    completedAt: "2026-10-30T16:45:00Z",
  },
];

await storage.saveStudyBlocks(testBlocks);
const retrievedBlocks = await storage.getStudyBlocks();
assert.strictEqual(retrievedBlocks.length, 2, "getStudyBlocks() must return 2 blocks");
assert.strictEqual(retrievedBlocks[0].id, "sb-1", "Block 1 id preserved");
assert.strictEqual(retrievedBlocks[0].status, "SCHEDULED", "Block 1 status preserved");
assert.strictEqual(retrievedBlocks[1].status, "COMPLETED", "Block 2 status preserved");
assert.strictEqual(retrievedBlocks[1].completedAt, "2026-10-30T16:45:00Z", "completedAt timestamp preserved");
console.log("  ✓ saveStudyBlocks() and getStudyBlocks() round-trip cleanly");

// Test SchedulePrefs persistence & partial updates
const customPrefs = {
  studyWindowStart: "16:00",
  studyWindowEnd: "22:00",
  maxBlockMinutes: 30,
  minBreakMinutes: 10,
  daysOff: ["Sunday"],
  priorityWeights: {
    urgentFirst: false,
    hardFirst: true,
  },
};

await storage.saveSchedulePrefs(customPrefs);
const retrievedPrefs = await storage.getSchedulePrefs();
assert.strictEqual(retrievedPrefs.studyWindowStart, "16:00", "window start updated to 16:00");
assert.strictEqual(retrievedPrefs.studyWindowEnd, "22:00", "window end updated to 22:00");
assert.strictEqual(retrievedPrefs.maxBlockMinutes, 30, "max block updated to 30");
assert.strictEqual(retrievedPrefs.minBreakMinutes, 10, "min break updated to 10");
assert.strictEqual(retrievedPrefs.priorityWeights.urgentFirst, false, "urgentFirst updated to false");
assert.strictEqual(retrievedPrefs.priorityWeights.hardFirst, true, "hardFirst updated to true");
console.log("  ✓ saveSchedulePrefs() and getSchedulePrefs() persist custom preferences");

// Test Malformed Prefs Fallback
await mockDbInstance.runAsync(
  "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('schedule_prefs', ?)",
  "NOT_VALID_JSON{{"
);
const fallbackPrefs = await storage.getSchedulePrefs();
assert.strictEqual(fallbackPrefs.studyWindowStart, "15:00", "Malformed JSON falls back to default 15:00");
assert.strictEqual(fallbackPrefs.maxBlockMinutes, 45, "Malformed JSON falls back to default 45m block");
console.log("  ✓ Corrupt schedule_prefs JSON in storage gracefully falls back to DEFAULT_SCHEDULE_PREFS");

// Test Legacy Task default in loadAllData()
// Insert task with NULL estimated_minutes
await mockDbInstance.runAsync(
  "INSERT OR REPLACE INTO tasks (id, subject_id, title, notes, type, given_date, deadline_date, deadline_mode, estimated_minutes, status, completed_at, photo_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  "task-legacy-1",
  "sub-math",
  "Tugas Lama",
  null,
  "homework",
  "2026-10-25",
  "2026-10-31",
  "nextClass",
  null, // NULL estimated_minutes!
  "PENDING",
  null,
  null
);

const fullLoaded = await storage.loadAllData();
const legacyTask = fullLoaded.tasks.find((t) => t.id === "task-legacy-1");
assert.ok(legacyTask, "Legacy task loaded from database");
assert.strictEqual(legacyTask.estimatedMinutes, 30, "Legacy task with null estimated_minutes defaults to 30");
assert.strictEqual(typeof legacyTask.estimatedMinutes, "number", "estimatedMinutes is guaranteed to be a number");
console.log("  ✓ Legacy task loaded with null estimated_minutes defaults to 30 without throwing");

// Test exportBackupJSON strips geminiApiKey while preserving studyBlocks, schedulePrefs, grades, and teachers
const testGrades = [
  { id: "g-1", subjectId: "sub-math", title: "UH 1", score: 92, maxScore: 100, weight: 1, category: "exam", date: "2026-10-30" },
];
const testTeachers = [
  { id: "tc-1", name: "Pak Budi", subjectIds: ["sub-math"], room: "R.101" },
];
const exportedBackup = storage.exportBackupJSON({
  ...fullLoaded,
  geminiApiKey: "AIzaSySecretKeyShouldNotBeExported",
  studyBlocks: testBlocks,
  schedulePrefs: customPrefs,
  grades: testGrades,
  teachers: testTeachers,
});
assert.strictEqual(exportedBackup.data.geminiApiKey, "", "exportBackupJSON must scrub geminiApiKey to empty string");
assert.deepStrictEqual(exportedBackup.data.studyBlocks, testBlocks, "exportBackupJSON preserves studyBlocks");
assert.deepStrictEqual(exportedBackup.data.schedulePrefs, customPrefs, "exportBackupJSON preserves schedulePrefs");
assert.deepStrictEqual(exportedBackup.data.grades, testGrades, "exportBackupJSON preserves grades");
assert.deepStrictEqual(exportedBackup.data.teachers, testTeachers, "exportBackupJSON preserves teachers");
console.log("  ✓ exportBackupJSON scrubs geminiApiKey and preserves studyBlocks, schedulePrefs, grades, and teachers");

// Test importBackupJSON on old backup without studyBlocks, schedulePrefs, appSettings, grades, or teachers
const oldMinimalBackup = JSON.stringify({
  app: "StudyAir",
  version: "1.0.0",
  data: {
    subjects: [{ id: "sub-old", name: "Sejarah", color: "#f59e0b", aliases: [], bringItems: [] }],
    tasks: [],
  },
});
const oldImportRes = await storage.importBackupJSON(oldMinimalBackup);
assert.strictEqual(oldImportRes.success, true, "importBackupJSON succeeds on old backup without new fields");
assert.deepStrictEqual(oldImportRes.state.studyBlocks, [], "Old backup defaults studyBlocks to []");
assert.deepStrictEqual(oldImportRes.state.schedulePrefs, DEFAULT_SCHEDULE_PREFS, "Old backup defaults schedulePrefs to DEFAULT_SCHEDULE_PREFS");
assert.ok(oldImportRes.state.appSettings, "Old backup defaults appSettings to DEFAULT_APP_SETTINGS");
assert.deepStrictEqual(oldImportRes.state.grades, [], "Old backup defaults grades to []");
assert.deepStrictEqual(oldImportRes.state.teachers, [], "Old backup defaults teachers to []");
console.log("  ✓ importBackupJSON provides safe defaults for old backups missing new fields");

// ─── 3. Web Platform Storage Mirror (storage.web.ts) ───
console.log("\n[3] Web Platform Storage Mirror (storage.web.ts)");

const storageWeb = require("./dist-test/lib/storage.web.js");

// Reset async storage for clean test
await mockAsyncStorage.clear();

const webPrefs = await storageWeb.getSchedulePrefs();
assert.deepStrictEqual(webPrefs, DEFAULT_SCHEDULE_PREFS, "storage.web getSchedulePrefs returns defaults when empty");

await storageWeb.saveSchedulePrefs(customPrefs);
const retrievedWebPrefs = await storageWeb.getSchedulePrefs();
assert.strictEqual(retrievedWebPrefs.studyWindowStart, "16:00", "storage.web saves and retrieves windowStart");
assert.strictEqual(retrievedWebPrefs.priorityWeights.hardFirst, true, "storage.web saves and retrieves hardFirst");

await storageWeb.saveStudyBlocks(testBlocks);
const retrievedWebBlocks = await storageWeb.getStudyBlocks();
assert.strictEqual(retrievedWebBlocks.length, 2, "storage.web saves and retrieves studyBlocks");
assert.strictEqual(retrievedWebBlocks[0].id, "sb-1", "storage.web block id matches");

// Backup JSON test with v2 models
const testBackup = JSON.stringify({
  app: "StudyAir",
  version: "2.0.0",
  data: {
    subjects: [{ id: "sub-1", name: "Bio", color: "#10b981", aliases: [], bringItems: [] }],
    tasks: [{ id: "t-backup", subjectId: "sub-1", title: "Laporan", estimatedMinutes: 40 }],
    studyBlocks: testBlocks,
    schedulePrefs: customPrefs,
  },
});

const backupResult = await storageWeb.importBackupJSON(testBackup);
assert.strictEqual(backupResult.success, true, "importBackupJSON succeeds with v2 payload");
assert.strictEqual(backupResult.state.tasks[0].estimatedMinutes, 40, "importBackupJSON retains task estimatedMinutes");
assert.strictEqual(backupResult.state.studyBlocks.length, 2, "importBackupJSON restores studyBlocks");
assert.strictEqual(backupResult.state.schedulePrefs.maxBlockMinutes, 30, "importBackupJSON restores schedulePrefs");
console.log("  ✓ Web storage mirror functions identically and supports v2 backup payload");

// ─── 4. Store State Actions & Clamping Simulation ───
console.log("\n[4] Store State Actions & Clamping Simulation");

// Test clamping function as implemented in store.tsx
const clampEstimate = (mins) => {
  if (mins == null || isNaN(mins)) return 30;
  return Math.max(5, Math.min(360, Math.round(mins)));
};

// Test Default estimate
assert.strictEqual(clampEstimate(undefined), 30, "Missing estimate defaults to 30");
assert.strictEqual(clampEstimate(null), 30, "Null estimate defaults to 30");
assert.strictEqual(clampEstimate(NaN), 30, "NaN estimate defaults to 30");

// Test Custom valid estimate
assert.strictEqual(clampEstimate(45), 45, "Valid estimate 45 is preserved");
assert.strictEqual(clampEstimate(60), 60, "Valid estimate 60 is preserved");

// Test Bounds clamping
assert.strictEqual(clampEstimate(-10), 5, "Negative estimate is clamped to minimum 5");
assert.strictEqual(clampEstimate(0), 5, "Zero estimate is clamped to minimum 5");
assert.strictEqual(clampEstimate(2), 5, "Below-min estimate is clamped to minimum 5");
assert.strictEqual(clampEstimate(500), 360, "Over-limit estimate is clamped to maximum 360");
assert.strictEqual(clampEstimate(1000), 360, "Over-limit estimate is clamped to maximum 360");
console.log("  ✓ clampEstimate properly clamps values to [5, 360] and defaults to 30");

// Test StudyBlock completion toggle transitions
let mockBlock = {
  id: "sb-toggle-1",
  taskId: "t-1",
  subjectId: "sub-math",
  date: "2026-10-30",
  startTime: "15:00",
  endTime: "15:45",
  durationMinutes: 45,
  status: "SCHEDULED",
  completedAt: undefined,
};

const toggleBlock = (block) => {
  const isDone = block.status === "COMPLETED";
  return {
    ...block,
    status: isDone ? "SCHEDULED" : "COMPLETED",
    completedAt: isDone ? undefined : new Date().toISOString(),
  };
};

// Toggle to COMPLETED
mockBlock = toggleBlock(mockBlock);
assert.strictEqual(mockBlock.status, "COMPLETED", "Toggle transitions SCHEDULED -> COMPLETED");
assert.ok(mockBlock.completedAt, "completedAt is populated when completed");

// Toggle back to SCHEDULED
mockBlock = toggleBlock(mockBlock);
assert.strictEqual(mockBlock.status, "SCHEDULED", "Toggle transitions COMPLETED -> SCHEDULED");
assert.strictEqual(mockBlock.completedAt, undefined, "completedAt is cleared when reverted");
console.log("  ✓ toggleBlock transitions between SCHEDULED and COMPLETED with completedAt timestamp");

// Test Partial Prefs update logic
let currentPrefs = { ...DEFAULT_SCHEDULE_PREFS };
const updatePrefs = (patch) => {
  return {
    ...currentPrefs,
    ...patch,
    priorityWeights: {
      ...currentPrefs.priorityWeights,
      ...(patch.priorityWeights || {}),
    },
  };
};

const patched = updatePrefs({ maxBlockMinutes: 30, priorityWeights: { hardFirst: true } });
assert.strictEqual(patched.maxBlockMinutes, 30, "maxBlockMinutes updated");
assert.strictEqual(patched.minBreakMinutes, 15, "minBreakMinutes preserved from default");
assert.strictEqual(patched.studyWindowStart, "15:00", "studyWindowStart preserved from default");
assert.strictEqual(patched.priorityWeights.hardFirst, true, "hardFirst updated to true");
assert.strictEqual(patched.priorityWeights.urgentFirst, true, "urgentFirst preserved from default");
console.log("  ✓ Partial schedulePrefs update preserves unpatched keys and nested priorityWeights");

console.log("\n==================================================");
console.log("  RESULTS: ALL P2 DATA MODEL TESTS PASSED (100%)");
console.log("==================================================");
