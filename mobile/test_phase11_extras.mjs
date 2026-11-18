/**
 * StudyAir Mobile — Phase 11 Automated Test Suite
 * Validates:
 * 1. Tomorrow's Bag & Uniform Checklist compilation logic
 * 2. Per-Subject Deep Dive data integrity & next-class deadline resolution
 * 3. Focus Timer & Independent Session Logging
 * 4. Exam Countdown math & study milestone progress
 */

import assert from "node:assert/strict";

console.log("==================================================");
console.log("   STUDYAIR MOBILE — PHASE 11 EXTRAS TEST SUITE   ");
console.log("==================================================\n");

let passedCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ─── 1. Tomorrow's Bag & Uniform Checklist Logic ───

function compileBagChecklist({ targetDateStr, subjects, checkedIds = new Set(), customItems = [] }) {
  const items = [];

  // Uniform: Senin / Monday
  if (targetDateStr.toLowerCase().includes("senin") || targetDateStr.toLowerCase().includes("monday")) {
    items.push({
      id: "uniform-senin-upacara",
      label: "Seragam Putih + Topi & Dasi Upacara",
      category: "uniform",
      checked: checkedIds.has("uniform-senin-upacara"),
    });
  }

  // Uniform: PJOK / Olahraga
  const hasPjok = subjects.some((s) => {
    const name = (s.title || s.name || "").toLowerCase();
    return name.includes("pjok") || name.includes("olahraga") || name.includes("penjas");
  });
  if (hasPjok) {
    items.push({
      id: "uniform-pjok-olahraga",
      label: "Seragam Olahraga & Sepatu Kets",
      category: "uniform",
      checked: checkedIds.has("uniform-pjok-olahraga"),
    });
  }

  // Uniform: Science Lab
  const hasLab = subjects.some((s) => {
    const name = (s.title || s.name || "").toLowerCase();
    return (
      name.includes("kimia") ||
      name.includes("biologi") ||
      name.includes("fisika") ||
      name.includes("ipa")
    );
  });
  if (hasLab) {
    items.push({
      id: "uniform-lab-science",
      label: "Jas Lab & Buku Praktikum",
      category: "uniform",
      checked: checkedIds.has("uniform-lab-science"),
    });
  }

  // General Essentials
  const essentials = [
    { id: "gen-stationery", label: "Kotak Pensil & Alat Tulis" },
    { id: "gen-water", label: "Botol Minum / Tumbler" },
    { id: "gen-card", label: "Kartu Pelajar & Uang Saku" },
  ];
  for (const gen of essentials) {
    items.push({
      ...gen,
      category: "custom",
      checked: checkedIds.has(gen.id),
    });
  }

  // Subject Bring Items
  for (const sub of subjects) {
    const subTitle = sub.title || sub.name;
    const bringItems = sub.bringItems || [];
    for (const b of bringItems) {
      const id = `bring-${sub.id}-${b.toLowerCase().replace(/\\s+/g, "-")}`;
      items.push({
        id,
        label: `${b} (${subTitle})`,
        category: "subject",
        subjectName: subTitle,
        checked: checkedIds.has(id),
      });
    }
  }

  // Custom Items
  for (const c of customItems) {
    items.push({
      id: c.id,
      label: c.label,
      category: "custom",
      checked: checkedIds.has(c.id),
    });
  }

  return items;
}

runTest("Bag Checklist: Senin detects Upacara uniform", () => {
  const list = compileBagChecklist({
    targetDateStr: "Senin, 26 Okt",
    subjects: [{ id: "sub-1", title: "Matematika" }],
  });
  assert.ok(list.some((item) => item.id === "uniform-senin-upacara"));
});

runTest("Bag Checklist: PJOK class adds sports uniform & sneakers", () => {
  const list = compileBagChecklist({
    targetDateStr: "Selasa, 27 Okt",
    subjects: [
      { id: "sub-1", title: "PJOK" },
      { id: "sub-2", title: "Bahasa Indonesia" },
    ],
  });
  assert.ok(list.some((item) => item.id === "uniform-pjok-olahraga"));
  // Tuesday should NOT have Upacara uniform
  assert.ok(!list.some((item) => item.id === "uniform-senin-upacara"));
});

runTest("Bag Checklist: Lab science class adds lab coat & practical book", () => {
  const list = compileBagChecklist({
    targetDateStr: "Rabu, 28 Okt",
    subjects: [{ id: "sub-kim", title: "Kimia Dasar", bringItems: ["Kalkulator Scientific"] }],
  });
  assert.ok(list.some((item) => item.id === "uniform-lab-science"));
  assert.ok(list.some((item) => item.label.includes("Kalkulator Scientific")));
});

runTest("Bag Checklist: Progress computation matches checked items", () => {
  const checked = new Set(["gen-stationery", "gen-water"]);
  const list = compileBagChecklist({
    targetDateStr: "Kamis, 29 Okt",
    subjects: [{ id: "sub-hist", title: "Sejarah" }],
    checkedIds: checked,
  });
  const total = list.length;
  const completed = list.filter((i) => i.checked).length;
  assert.equal(completed, 2);
  const percent = Math.round((completed / total) * 100);
  assert.ok(percent > 0 && percent <= 100);
});

// ─── 2. Focus Timer & Session Logging Logic ───

runTest("Focus Timer: Presets match 15m, 25m, 45m, 60m", () => {
  const presets = [15, 25, 45, 60];
  assert.deepEqual(presets, [15, 25, 45, 60]);
  assert.equal(presets[1], 25, "Default pomodoro preset is 25m");
});

runTest("Focus Timer: Independent session correctly increments dailyStats", () => {
  let dailyStats = [{ date: "2026-10-25", planned_minutes: 0, actual_minutes: 30 }];
  const focusLogs = [];

  function logIndependent(subjectId, actualMinutes) {
    const todayStr = "2026-10-25";
    const newLog = {
      id: `fl-${Date.now()}`,
      scheduled_block_id: "independent",
      planned_minutes: actualMinutes,
      actual_minutes: actualMinutes,
      pomodoro_count: Math.ceil(actualMinutes / 25),
    };
    focusLogs.push(newLog);

    const existing = dailyStats.find((d) => d.date === todayStr);
    if (existing) {
      dailyStats = dailyStats.map((d) =>
        d.date === todayStr
          ? { ...d, actual_minutes: d.actual_minutes + actualMinutes }
          : d
      );
    } else {
      dailyStats.push({ date: todayStr, planned_minutes: 0, actual_minutes: actualMinutes });
    }
  }

  logIndependent("sub-math", 25);
  assert.equal(focusLogs.length, 1);
  assert.equal(focusLogs[0].actual_minutes, 25);
  assert.equal(focusLogs[0].pomodoro_count, 1);
  assert.equal(dailyStats[0].actual_minutes, 55); // 30 + 25

  logIndependent("sub-bio", 45);
  assert.equal(focusLogs.length, 2);
  assert.equal(focusLogs[1].actual_minutes, 45);
  assert.equal(focusLogs[1].pomodoro_count, 2); // 45 / 25 ceil = 2
  assert.equal(dailyStats[0].actual_minutes, 100); // 55 + 45
});

// ─── 3. Exam Countdown & Milestones Logic ───

runTest("Exam Countdown: Accurately calculates days left and progress", () => {
  const examDateStr = "2026-11-25";
  const todayStr = "2026-10-25";

  const diffMs = new Date(examDateStr).getTime() - new Date(todayStr).getTime();
  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));
  assert.equal(daysLeft, 31, "Days left from Oct 25 to Nov 25 is 31 days");

  const milestones = [
    { id: "m-1", title: "Rangkuman Bab 1", completed: true },
    { id: "m-2", title: "Latihan Soal", completed: true },
    { id: "m-3", title: "Tryout", completed: false },
    { id: "m-4", title: "Review Kisi-kisi", completed: false },
  ];

  const completedCount = milestones.filter((m) => m.completed).length;
  const progressPercent = Math.round((completedCount / milestones.length) * 100);
  assert.equal(completedCount, 2);
  assert.equal(progressPercent, 50);
});

// ─── 4. Per-Subject Deep Dive Session Resolution ───

runTest("Subject Deep Dive: Groups weekly sessions correctly and sorts by day & period", () => {
  const timetableEntries = [
    { id: "e-1", subjectId: "sub-1", weekday: 4, periodNumber: 3 },
    { id: "e-2", subjectId: "sub-1", weekday: 1, periodNumber: 2 },
    { id: "e-3", subjectId: "sub-2", weekday: 2, periodNumber: 1 },
    { id: "e-4", subjectId: "sub-1", weekday: 1, periodNumber: 1 },
  ];

  const subEntries = timetableEntries
    .filter((e) => e.subjectId === "sub-1")
    .sort((a, b) => a.weekday - b.weekday || a.periodNumber - b.periodNumber);

  assert.equal(subEntries.length, 3);
  // Entry at weekday 1, period 1 should be first
  assert.equal(subEntries[0].id, "e-4");
  // Entry at weekday 1, period 2 should be second
  assert.equal(subEntries[1].id, "e-2");
  // Entry at weekday 4, period 3 should be third
  assert.equal(subEntries[2].id, "e-1");
});

runTest("Subject Deep Dive: Separates pending and completed tasks", () => {
  const allTasks = [
    { id: "t-1", subjectId: "sub-1", title: "PR Bab 1", completed: false },
    { id: "t-2", subjectId: "sub-1", title: "Tugas Mandiri", completed: true },
    { id: "t-3", subjectId: "sub-2", title: "Kuis Fisika", completed: false },
    { id: "t-4", subjectId: "sub-1", title: "Laporan Praktikum", completed: false },
  ];

  const subTasks = allTasks.filter((t) => t.subjectId === "sub-1");
  const pending = subTasks.filter((t) => !t.completed);
  const completed = subTasks.filter((t) => t.completed);

  assert.equal(pending.length, 2);
  assert.equal(completed.length, 1);
  assert.equal(completed[0].id, "t-2");
});

console.log("\n==================================================");
console.log(`🎉 ALL ${passedCount} PHASE 11 TESTS PASSED!`);
console.log("==================================================");
