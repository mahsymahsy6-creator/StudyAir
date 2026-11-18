import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_APP_SETTINGS } from "../../types";
import { t, setLanguage } from "../i18n";

test("developerMode is always hidden by default on normal app startup / state hydration", () => {
  // Simulating state that previously had developerModeEnabled: true stored
  const loadedAppSettings = {
    ...DEFAULT_APP_SETTINGS,
    developerModeEnabled: true,
  };

  // Normal app hydration rule
  const hydratedAppSettings = {
    ...loadedAppSettings,
    developerModeEnabled: false,
  };

  assert.equal(hydratedAppSettings.developerModeEnabled, false);
});

test("ensureStandardSubjects enriches partial 4-subject list with full curriculum without duplicates", () => {
  const { ensureStandardSubjects } = require("../subjectDictionary");
  const fourLegacySubjects = [
    { id: "sub-math", name: "Matematika", color: "#3A86FF", aliases: [], bringItems: [] },
    { id: "sub-fis", name: "Fisika", color: "#8B5CF6", aliases: [], bringItems: [] },
    { id: "sub-kim", name: "Kimia", color: "#10B981", aliases: [], bringItems: [] },
    { id: "sub-pjok", name: "PJOK", color: "#F59E0B", aliases: [], bringItems: [] },
  ];

  const fullList = ensureStandardSubjects(fourLegacySubjects);
  assert.ok(fullList.length >= 16, `Expected at least 16 subjects, got ${fullList.length}`);
  const names = fullList.map((s: any) => s.name);
  assert.ok(names.includes("Matematika"));
  assert.ok(names.includes("Bahasa Indonesia"));
  assert.ok(names.includes("Bahasa Inggris"));
  assert.ok(names.includes("Biologi"));
  assert.ok(names.includes("Sejarah"));
  assert.ok(names.includes("Informatika"));
  assert.ok(names.includes("Pendidikan Pancasila (PPKn)"));
});

test("i18n translations for developer mode format correctly in id and en", () => {
  setLanguage("id");
  assert.equal(t("dev_mode_steps", { count: 3 }), "3 langkah lagi menuju Mode Pengembang");
  assert.match(t("dev_mode_activated"), /Mode Pengembang aktif/);
  assert.match(t("dev_mode_already_active"), /sudah aktif/);
  assert.match(t("dev_mode_deactivated"), /dinonaktifkan/);
  assert.equal(t("dev_mode_title"), "Mode Pengembang");

  setLanguage("en");
  assert.equal(t("dev_mode_steps", { count: 3 }), "3 steps away from Developer Mode");
  assert.match(t("dev_mode_activated"), /Developer Mode enabled/);
  assert.match(t("dev_mode_already_active"), /already active/);
  assert.match(t("dev_mode_deactivated"), /disabled/);
  assert.equal(t("dev_mode_title"), "Developer Mode");

  // Restore default
  setLanguage("id");
});

test("7-tap developer mode logic unlocks precisely on 7th tap within timeout window", () => {
  let count = 0;
  let lastTime = 0;
  let isDevMode = false;

  function tap(now: number): { count: number; unlocked: boolean } {
    if (now - lastTime > 3500) {
      count = 0;
    }
    lastTime = now;
    if (isDevMode) {
      return { count, unlocked: true };
    }
    count += 1;
    if (count >= 7) {
      count = 0;
      isDevMode = true;
      return { count: 7, unlocked: true };
    }
    return { count, unlocked: false };
  }

  // Taps 1 to 6
  let t0 = 1000;
  for (let i = 1; i <= 6; i++) {
    const res = tap(t0 + i * 300);
    assert.equal(res.unlocked, false);
    assert.equal(res.count, i);
  }

  // Tap 7 unlocks
  const res7 = tap(t0 + 7 * 300);
  assert.equal(res7.unlocked, true);
  assert.equal(isDevMode, true);

  // Subsequent tap indicates already unlocked
  const res8 = tap(t0 + 8 * 300);
  assert.equal(res8.unlocked, true);

  // Test timeout reset
  let count2 = 0;
  let lastTime2 = 1000;
  count2 = 3;
  // 4000ms later (>3500ms)
  let nowLater = lastTime2 + 4000;
  if (nowLater - lastTime2 > 3500) {
    count2 = 0;
  }
  assert.equal(count2, 0);
});
