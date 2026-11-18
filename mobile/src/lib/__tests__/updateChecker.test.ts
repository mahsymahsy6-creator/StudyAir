import test from "node:test";
import assert from "node:assert/strict";
import {
  CURRENT_APP_VERSION,
  APK_FILENAME,
  compareSemver,
  resolveDownloadEndpoints,
  evaluateUpdatePayload,
} from "../updateChecker";

test("compareSemver identifies up_to_date and update_available accurately", () => {
  assert.equal(compareSemver("2.0.0", "2.0.0"), "up_to_date");
  assert.equal(compareSemver("v2.0.0", "2.0.0"), "up_to_date");
  assert.equal(compareSemver("1.0.0", "2.0.0"), "update_available");
  assert.equal(compareSemver("2.0.0", "2.0.1"), "update_available");
  assert.equal(compareSemver("2.0.0", "2.1.0"), "update_available");
  assert.equal(compareSemver("2.1.0", "2.0.0"), "up_to_date");
});

test("resolveDownloadEndpoints routes Expo Web (port 8081) to APK server and Next.js fallback", () => {
  const endpoints = resolveDownloadEndpoints({
    platform: "web",
    webHostname: "192.168.8.175",
    webPort: "8081",
  });
  assert.equal(endpoints.directApkUrl, "http://192.168.8.175:8080/download");
  assert.equal(endpoints.fallbackApkUrl, `http://192.168.8.175:3000/${APK_FILENAME}`);
  assert.equal(endpoints.portalUrl, "http://192.168.8.175:3000/download");
  assert.equal(endpoints.versionApiUrl, "http://192.168.8.175:8080/api/version");
});

test("resolveDownloadEndpoints uses local static path when already on Next.js web (port 3000)", () => {
  const endpoints = resolveDownloadEndpoints({
    platform: "web",
    webHostname: "localhost",
    webPort: "3000",
  });
  assert.equal(endpoints.directApkUrl, `/${APK_FILENAME}`);
  assert.equal(endpoints.fallbackApkUrl, "http://localhost:8080/download");
  assert.equal(endpoints.versionApiUrl, "/api/version");
});

test("resolveDownloadEndpoints uses LAN host IP on native devices instead of localhost", () => {
  const endpoints = resolveDownloadEndpoints({
    platform: "android",
    lanHost: "192.168.8.175",
  });
  assert.equal(endpoints.directApkUrl, "http://192.168.8.175:8080/download");
  assert.equal(endpoints.fallbackApkUrl, `http://192.168.8.175:3000/${APK_FILENAME}`);
  assert.equal(endpoints.portalUrl, "http://192.168.8.175:8080");
});

test("evaluateUpdatePayload normalizes server response and compares with installed version", () => {
  const upToDate = evaluateUpdatePayload(
    {
      version: CURRENT_APP_VERSION,
      versionCode: 3,
      apkSizeMB: "86.2",
      downloadUrl: "http://192.168.8.175:8080/download",
    },
    CURRENT_APP_VERSION
  );
  assert.equal(upToDate.status, "up_to_date");
  assert.equal(upToDate.latestVersion, CURRENT_APP_VERSION);
  assert.equal(upToDate.apkSizeMB, "86.2");

  const newer = evaluateUpdatePayload(
    {
      version: "3.1.0",
      versionCode: 4,
      apkSizeMB: "86.2",
    },
    "3.0.1"
  );
  assert.equal(newer.status, "update_available");
  assert.equal(newer.latestVersion, "3.1.0");
  assert.equal(newer.versionCode, 4);
});
