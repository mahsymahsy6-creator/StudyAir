import test from "node:test";
import assert from "node:assert/strict";
import { toLocalDateStr, addDaysLocal } from "../dateUtils";

test("1. toLocalDateStr(new Date(2026, 10, 1, 0, 30)) returns 2026-11-01 at 00:30 local time", () => {
  const localJustAfterMidnight = new Date(2026, 10, 1, 0, 30);
  assert.equal(toLocalDateStr(localJustAfterMidnight), "2026-11-01");
});

test("2. addDaysLocal('2026-12-30', 3) handles year rollover -> 2027-01-02", () => {
  assert.equal(addDaysLocal("2026-12-30", 3), "2027-01-02");
});

test("3. addDaysLocal('2028-02-28', 1) handles leap year -> 2028-02-29", () => {
  assert.equal(addDaysLocal("2028-02-28", 1), "2028-02-29");
});

test("4. addDaysLocal('2026-11-01', 0) returns 2026-11-01", () => {
  assert.equal(addDaysLocal("2026-11-01", 0), "2026-11-01");
});
