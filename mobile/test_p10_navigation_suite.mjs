/**
 * StudyAir - P10 Navigation Restructure Test Suite
 * Tests 3-tab layout + center "+" and route resolution for v2.
 */

import assert from "node:assert";

// Pure route mapping logic matching mobile/App.tsx
export function resolveTargetScreen(screenName) {
  const norm = screenName.toLowerCase().trim();
  if (norm === "home" || norm === "today" || norm === "rencana") {
    return "Today"; // Rencana Screen
  }
  if (norm === "tasks" || norm === "tugas") {
    return "Tasks"; // Tugas Screen
  }
  if (norm === "calendar" || norm === "kalender" || norm === "jadwal") {
    return "Calendar"; // Kalender Screen
  }
  if (norm === "settings" || norm === "pengaturan") {
    return "Settings";
  }
  if (norm === "focus" || norm === "fokus") {
    return "Focus";
  }
  if (norm === "streak") {
    return "Streak";
  }
  if (norm === "timetablewizard" || norm === "import") {
    return "TimetableWizard";
  }
  return "Today";
}

// 3-tab layout descriptor
export function getTabBarTabs() {
  return [
    { key: "Today", label: "Rencana", icon: "checkbox-outline" },
    { key: "Tasks", label: "Tugas", icon: "list-outline" },
    { key: "FAB", isCenterAction: true, icon: "add" },
    { key: "Calendar", label: "Kalender", icon: "calendar-outline" },
  ];
}

console.log("==================================================");
console.log("    STUDYAIR P10 NAVIGATION RESTRUCTURE SUITE");
console.log("==================================================");

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("\n[1] Route Alias Resolution");

it("maps 'Rencana', 'Home', 'Today' to 'Today' screen", () => {
  assert.strictEqual(resolveTargetScreen("Rencana"), "Today");
  assert.strictEqual(resolveTargetScreen("Home"), "Today");
  assert.strictEqual(resolveTargetScreen("Today"), "Today");
});

it("maps 'Tugas', 'Tasks' to 'Tasks' screen", () => {
  assert.strictEqual(resolveTargetScreen("Tugas"), "Tasks");
  assert.strictEqual(resolveTargetScreen("Tasks"), "Tasks");
});

it("maps 'Kalender', 'Calendar', 'Jadwal' to 'Calendar' screen", () => {
  assert.strictEqual(resolveTargetScreen("Kalender"), "Calendar");
  assert.strictEqual(resolveTargetScreen("Calendar"), "Calendar");
  assert.strictEqual(resolveTargetScreen("Jadwal"), "Calendar");
});

it("maps auxiliary screens correctly", () => {
  assert.strictEqual(resolveTargetScreen("Settings"), "Settings");
  assert.strictEqual(resolveTargetScreen("Focus"), "Focus");
  assert.strictEqual(resolveTargetScreen("Streak"), "Streak");
});

console.log("\n[2] Bottom Tab Bar Layout");

it("has exactly 3 primary tabs and 1 center action FAB", () => {
  const tabs = getTabBarTabs();
  assert.strictEqual(tabs.length, 4);
  assert.strictEqual(tabs[0].key, "Today");
  assert.strictEqual(tabs[1].key, "Tasks");
  assert.strictEqual(tabs[2].isCenterAction, true);
  assert.strictEqual(tabs[3].key, "Calendar");
});

console.log("\n==================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) process.exit(1);
