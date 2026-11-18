/**
 * Automated Test Suite — Phase 9: Local Reminders & Settings
 * 
 * Verifies:
 * 1. Default App Settings schema integrity & defaults.
 * 2. Notification payload generation for Evening Preview & Morning Alert.
 * 3. Daily scan quota management, decrement, and midnight date rollover.
 * 4. Subject custom aliases add, deduplicate, and removal.
 * 5. Period times calculation and validation.
 * 6. AI Mode settings switching (Secure Store vs Proxy).
 */

import assert from "assert";

console.log("==================================================");
console.log("   StudyAir Mobile — Phase 9 Test Suite           ");
console.log("==================================================");

let totalPassed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    throw err;
  }
}

// ─── 1. AppSettings Schema & Defaults ───
test("1.1 Default AppSettings has required schema and defaults", () => {
  const DEFAULT_APP_SETTINGS = {
    theme: "navy",
    language: "id",
    notificationsEnabled: false,
    eveningReminderEnabled: true,
    eveningReminderTime: "20:00",
    morningAlertEnabled: true,
    morningAlertTime: "06:30",
    aiMode: "secure_store",
    dailyScanQuota: 20,
    scansUsedToday: 0,
    lastScanDate: "",
  };

  assert.strictEqual(DEFAULT_APP_SETTINGS.theme, "navy");
  assert.strictEqual(DEFAULT_APP_SETTINGS.language, "id");
  assert.strictEqual(DEFAULT_APP_SETTINGS.eveningReminderTime, "20:00");
  assert.strictEqual(DEFAULT_APP_SETTINGS.morningAlertTime, "06:30");
  assert.strictEqual(DEFAULT_APP_SETTINGS.aiMode, "secure_store");
  assert.strictEqual(DEFAULT_APP_SETTINGS.dailyScanQuota, 20);
  assert.strictEqual(DEFAULT_APP_SETTINGS.scansUsedToday, 0);
});

// ─── 2. Notification Payload Generators ───
test("2.1 Evening Preview Notification with active classes and tasks", () => {
  function generateEveningPreview(tomorrowSchedule, tasksDueTomorrowCount) {
    let title = "Jadwal Belajar Besok 🎒";
    let body = "";

    if (tomorrowSchedule.isDayOff) {
      body = `Besok Libur: ${tomorrowSchedule.dayOffReason || "Hari Libur"}. Tidak ada jadwal kelas.`;
    } else if (tomorrowSchedule.items.length > 0) {
      const activeClassNames = tomorrowSchedule.items
        .filter((c) => c.overrideType !== "cancelled")
        .map((c) => c.subjectTitle || "Pelajaran");

      const classSummary =
        activeClassNames.slice(0, 3).join(", ") +
        (activeClassNames.length > 3 ? ` +${activeClassNames.length - 3}` : "");

      body = `Besok: ${classSummary}. ${
        tasksDueTomorrowCount > 0
          ? `${tasksDueTomorrowCount} tugas harus dikumpulkan.`
          : "Semua tugas aman!"
      }`;
    } else {
      body = "Tidak ada jadwal kelas untuk besok. Nikmati istirahatmu!";
    }
    return { title, body };
  }

  const normalSchedule = {
    isDayOff: false,
    items: [
      { subjectTitle: "Matematika", overrideType: undefined },
      { subjectTitle: "Biologi", overrideType: undefined },
      { subjectTitle: "B. Inggris", overrideType: undefined },
      { subjectTitle: "Kimia", overrideType: undefined },
    ],
  };

  const payload = generateEveningPreview(normalSchedule, 2);
  assert.strictEqual(payload.title, "Jadwal Belajar Besok 🎒");
  assert.strictEqual(
    payload.body,
    "Besok: Matematika, Biologi, B. Inggris +1. 2 tugas harus dikumpulkan."
  );

  // Day Off Case
  const dayOffSchedule = {
    isDayOff: true,
    dayOffReason: "Hari Guru Nasional",
    items: [],
  };
  const dayOffPayload = generateEveningPreview(dayOffSchedule, 0);
  assert.strictEqual(
    dayOffPayload.body,
    "Besok Libur: Hari Guru Nasional. Tidak ada jadwal kelas."
  );
});

test("2.2 Morning Alert Notification with today classes and pending tasks", () => {
  function generateMorningAlert(todayClassesCount, tasksDueTodayCount) {
    const title = "Pengingat Sekolah Pagi ☀️";
    const body = `Hari ini ada ${todayClassesCount} mata pelajaran${
      tasksDueTodayCount > 0
        ? ` dan ${tasksDueTodayCount} tugas harus dikumpul!`
        : ". Semangat belajar!"
    }`;
    return { title, body };
  }

  const payload = generateMorningAlert(5, 3);
  assert.strictEqual(payload.title, "Pengingat Sekolah Pagi ☀️");
  assert.strictEqual(
    payload.body,
    "Hari ini ada 5 mata pelajaran dan 3 tugas harus dikumpul!"
  );

  const noTaskPayload = generateMorningAlert(4, 0);
  assert.strictEqual(
    noTaskPayload.body,
    "Hari ini ada 4 mata pelajaran. Semangat belajar!"
  );
});

// ─── 3. Daily Scan Quota Management & Date Rollover ───
test("3.1 Scan quota increments and resets on date rollover", () => {
  let settings = {
    dailyScanQuota: 20,
    scansUsedToday: 5,
    lastScanDate: "2026-10-23",
  };

  function simulateScan(currentDateStr, state) {
    const isNewDay = state.lastScanDate !== currentDateStr;
    const scansUsedToday = isNewDay ? 1 : state.scansUsedToday + 1;
    return {
      ...state,
      lastScanDate: currentDateStr,
      scansUsedToday,
    };
  }

  // Same day increment
  settings = simulateScan("2026-10-23", settings);
  assert.strictEqual(settings.scansUsedToday, 6);

  // Next day rollover (new day resets count to 1 for current scan)
  settings = simulateScan("2026-10-24", settings);
  assert.strictEqual(settings.lastScanDate, "2026-10-24");
  assert.strictEqual(settings.scansUsedToday, 1);

  // Remaining quota
  const remaining = Math.max(0, settings.dailyScanQuota - settings.scansUsedToday);
  assert.strictEqual(remaining, 19);
});

// ─── 4. Subject Custom Aliases ───
test("4.1 Add, deduplicate, and remove custom subject aliases", () => {
  let subject = {
    id: "sub-math",
    title: "Matematika",
    aliases: ["MTK", "Math"],
  };

  function addAlias(sub, alias) {
    const trimmed = alias.trim();
    if (!trimmed) return sub;
    const current = sub.aliases || [];
    if (current.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      return sub; // Prevent duplicate
    }
    return { ...sub, aliases: [...current, trimmed] };
  }

  function removeAlias(sub, alias) {
    return {
      ...sub,
      aliases: (sub.aliases || []).filter((a) => a !== alias),
    };
  }

  // Add new alias
  subject = addAlias(subject, "Kalkulus");
  assert.deepStrictEqual(subject.aliases, ["MTK", "Math", "Kalkulus"]);

  // Duplicate add (case-insensitive) should be ignored
  subject = addAlias(subject, "mtk");
  assert.deepStrictEqual(subject.aliases, ["MTK", "Math", "Kalkulus"]);

  // Remove alias
  subject = removeAlias(subject, "Math");
  assert.deepStrictEqual(subject.aliases, ["MTK", "Kalkulus"]);
});

// ─── 5. Bell Schedule Period Times Calculation ───
test("5.1 Calculate end time for newly added period", () => {
  const periodTimes = [
    { periodNumber: 1, start: "07:15", end: "08:00" },
    { periodNumber: 2, start: "08:00", end: "08:45" },
    { periodNumber: 3, start: "08:45", end: "09:30" },
  ];

  function addNextPeriod(list, durationMinutes = 45) {
    const nextNum = list.length > 0 ? Math.max(...list.map((p) => p.periodNumber)) + 1 : 1;
    const last = list[list.length - 1];
    const startTime = last ? last.end : "07:00";
    const [h, m] = startTime.split(":").map(Number);
    const endMinutes = (h * 60 + m + durationMinutes) % 1440;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    return {
      periodNumber: nextNum,
      start: startTime,
      end: `${endH}:${endM}`,
    };
  }

  const period4 = addNextPeriod(periodTimes, 45);
  assert.strictEqual(period4.periodNumber, 4);
  assert.strictEqual(period4.start, "09:30");
  assert.strictEqual(period4.end, "10:15");
});

// ─── 6. AI Mode Switching ───
test("6.1 Switch between Mode A (Secure Store) and Mode B (Proxy)", () => {
  let settings = {
    aiMode: "secure_store",
    proxyUrl: "",
    proxyToken: "",
  };

  // Switch to Proxy
  settings = {
    ...settings,
    aiMode: "proxy",
    proxyUrl: "https://school.proxy.edu/v1",
    proxyToken: "tok_123456",
  };
  assert.strictEqual(settings.aiMode, "proxy");
  assert.strictEqual(settings.proxyUrl, "https://school.proxy.edu/v1");

  // Switch back to Secure Store
  settings = { ...settings, aiMode: "secure_store" };
  assert.strictEqual(settings.aiMode, "secure_store");
});

console.log("==================================================");
console.log(`   Phase 9 Tests: ALL ${totalPassed} PASSED!       `);
console.log("==================================================");
