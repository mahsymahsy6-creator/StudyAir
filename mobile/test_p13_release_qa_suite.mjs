/**
 * StudyAir - P13 Master Release QA Test Runner
 * Runs all characterization and unit test suites across all v2 milestone packets.
 */

import { execSync } from "node:child_process";

const suites = [
  { name: "P0 Characterization Baseline", file: "mobile/test_characterization_v2_baseline.mjs" },
  { name: "P3 Scheduling Engine", file: "mobile/test_scheduler_engine_suite.mjs" },
  { name: "P4 Add Task Flow", file: "mobile/test_p4_add_task_suite.mjs" },
  { name: "P5 Create Schedule Flow", file: "mobile/test_p5_create_schedule_suite.mjs" },
  { name: "P6 Rencana Screen", file: "mobile/test_p6_rencana_screen_suite.mjs" },
  { name: "P7 Tugas Screen (4 Groups)", file: "mobile/test_p7_tugas_screen_suite.mjs" },
  { name: "P8 Kalender (Agenda & Grid)", file: "mobile/test_p8_kalender_suite.mjs" },
  { name: "P9 Execution Loop (Focus & Rescheduling)", file: "mobile/test_p9_execution_loop_suite.mjs" },
  { name: "P10 Navigation Restructure (3 Tabs + FAB)", file: "mobile/test_p10_navigation_suite.mjs" },
  { name: "P11 Streak Calibration & Exam Plans", file: "mobile/test_p11_streak_exams_suite.mjs" },
  { name: "P12 AI Helpers (Duration & Batch Review)", file: "mobile/test_p12_ai_helpers_suite.mjs" },
];

console.log("==================================================");
console.log("     STUDYAIR MASTER RELEASE QA TEST RUNNER");
console.log("==================================================");

let totalPassed = 0;
let totalFailed = 0;

for (const suite of suites) {
  process.stdout.write(`\nRunning ${suite.name} ... `);
  try {
    const output = execSync(`node ${suite.file}`, { stdio: "pipe", encoding: "utf-8" });
    console.log("PASSED ✓");
    totalPassed++;
  } catch (err) {
    console.log("FAILED ✗");
    console.error(err.stdout || err.message);
    totalFailed++;
  }
}

console.log("\n==================================================");
console.log(`TOTAL SUITES: ${suites.length}`);
console.log(`PASSED: ${totalPassed}`);
console.log(`FAILED: ${totalFailed}`);
console.log("==================================================");

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL V2 REGRESSION TEST SUITES PASSED CLEANLY!");
}
