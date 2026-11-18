export const CURRENT_APP_VERSION = "2.0.1";
export const CURRENT_VERSION_CODE = 4;
export const APK_FILENAME = "StudyAir-v2.0.1.apk";
export const DEFAULT_APK_SIZE_MB = "86.2";
export const DEFAULT_LAN_HOST = "192.168.1.7";

export type UpdateStatus = "up_to_date" | "update_available";

export interface DownloadEndpoints {
  directApkUrl: string;
  fallbackApkUrl: string;
  portalUrl: string;
  versionApiUrl: string;
  fallbackVersionApiUrl: string;
}

export interface ServerVersionPayload {
  version?: string;
  versionCode?: number;
  apkFilename?: string;
  apkSizeMB?: string;
  downloadUrl?: string;
  portalUrl?: string;
  releaseDate?: string;
}

export interface UpdateCheckResult {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string;
  versionCode: number;
  apkFilename: string;
  apkSizeMB: string;
  downloadUrl: string;
  fallbackDownloadUrl: string;
  portalUrl: string;
  checkedAt: string;
  verifiedOnline: boolean;
}

/**
 * Deterministically compares two semantic version strings (e.g. "2.0.0" vs "2.1.0").
 */
export function compareSemver(current: string, latest: string): UpdateStatus {
  const parse = (v: string): number[] =>
    v
      .trim()
      .replace(/^v/i, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);

  const cur = parse(current);
  const lat = parse(latest);
  const len = Math.max(cur.length, lat.length, 3);

  for (let i = 0; i < len; i++) {
    const c = cur[i] ?? 0;
    const l = lat[i] ?? 0;
    if (l > c) return "update_available";
    if (l < c) return "up_to_date";
  }
  return "up_to_date";
}

export interface EndpointResolutionOptions {
  platform?: string;
  webHostname?: string;
  webPort?: string;
  lanHost?: string;
}

function detectPlatform(): string {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return "web";
  }
  return "android";
}

/**
 * Resolves the appropriate APK download and version check endpoints across:
 * - Next.js Web (:3000)
 * - Expo Web (:8081)
 * - Native Android / iOS over Wi-Fi LAN
 */
export function resolveDownloadEndpoints(
  options: EndpointResolutionOptions = {}
): DownloadEndpoints {
  const platform = options.platform ?? detectPlatform();

  if (platform === "web") {
    let hostname = options.webHostname;
    let port = options.webPort;

    if (!hostname && typeof window !== "undefined" && window.location) {
      hostname = window.location.hostname || "localhost";
      port = window.location.port || "";
    }
    const host = hostname || "localhost";

    // When running inside Next.js (:3000), static files in public/ and /api/version are local
    if (port === "3000") {
      return {
        directApkUrl: `/${APK_FILENAME}`,
        fallbackApkUrl: `http://${host}:8080/download`,
        portalUrl: "/download",
        versionApiUrl: "/api/version",
        fallbackVersionApiUrl: `http://${host}:8080/api/version`,
      };
    }

    // When running inside Expo Web (:8081) or other web ports, route binary download to APK server (:8080) or Next.js (:3000)
    return {
      directApkUrl: `http://${host}:8080/download`,
      fallbackApkUrl: `http://${host}:3000/${APK_FILENAME}`,
      portalUrl: `http://${host}:3000/download`,
      versionApiUrl: `http://${host}:8080/api/version`,
      fallbackVersionApiUrl: `http://${host}:3000/api/version`,
    };
  }

  // Native device (Android / iOS): never use localhost for LAN servers
  const host = options.lanHost || DEFAULT_LAN_HOST;
  return {
    directApkUrl: `http://${host}:8080/download`,
    fallbackApkUrl: `http://${host}:3000/${APK_FILENAME}`,
    portalUrl: `http://${host}:8080`,
    versionApiUrl: `http://${host}:8080/api/version`,
    fallbackVersionApiUrl: `http://${host}:3000/api/version`,
  };
}

/**
 * Normalizes a remote version payload and compares it with the installed version.
 */
export function evaluateUpdatePayload(
  payload: ServerVersionPayload | null | undefined,
  currentVersion: string = CURRENT_APP_VERSION,
  endpoints: DownloadEndpoints = resolveDownloadEndpoints()
): UpdateCheckResult {
  const latestVersion = payload?.version || currentVersion;
  const versionCode = payload?.versionCode ?? CURRENT_VERSION_CODE;
  const apkFilename = payload?.apkFilename || APK_FILENAME;
  const apkSizeMB = payload?.apkSizeMB || DEFAULT_APK_SIZE_MB;
  const downloadUrl = payload?.downloadUrl || endpoints.directApkUrl;
  const portalUrl = payload?.portalUrl || endpoints.portalUrl;

  const status = compareSemver(currentVersion, latestVersion);
  const now = new Date();
  const checkedAt = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  return {
    status,
    currentVersion,
    latestVersion,
    versionCode,
    apkFilename,
    apkSizeMB,
    downloadUrl,
    fallbackDownloadUrl: endpoints.fallbackApkUrl,
    portalUrl,
    checkedAt,
    verifiedOnline: Boolean(payload?.version),
  };
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs = 2500
): Promise<ServerVersionPayload | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as ServerVersionPayload;
  } catch {
    return null;
  }
}

/**
 * Queries the active update server (/api/version) with automatic fallback and returns the update check status.
 */
export async function checkAppUpdate(
  options: EndpointResolutionOptions = {}
): Promise<UpdateCheckResult> {
  const endpoints = resolveDownloadEndpoints(options);

  let payload = await fetchJsonWithTimeout(endpoints.versionApiUrl, 2200);
  if (!payload && endpoints.fallbackVersionApiUrl !== endpoints.versionApiUrl) {
    payload = await fetchJsonWithTimeout(endpoints.fallbackVersionApiUrl, 2200);
  }

  return evaluateUpdatePayload(payload, CURRENT_APP_VERSION, endpoints);
}

/**
 * Triggers a direct APK download on Web or Native with automatic server fallback.
 */
export async function triggerApkDownload(
  openUrlFn?: (url: string) => Promise<unknown>,
  customUrl?: string
): Promise<{ started: boolean; targetUrl: string }> {
  const endpoints = resolveDownloadEndpoints();
  const primaryUrl = customUrl || endpoints.directApkUrl;

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    let resolvedUrl = primaryUrl;
    if (primaryUrl.includes(":8080")) {
      const health = await fetchJsonWithTimeout(endpoints.versionApiUrl, 1200);
      if (!health) {
        resolvedUrl = endpoints.fallbackApkUrl;
      }
    }

    try {
      const link = document.createElement("a");
      link.href = resolvedUrl;
      link.setAttribute("download", APK_FILENAME);
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { started: true, targetUrl: resolvedUrl };
    } catch {
      if (openUrlFn) {
        await openUrlFn(resolvedUrl);
      }
      return { started: true, targetUrl: resolvedUrl };
    }
  }

  if (openUrlFn) {
    try {
      await openUrlFn(primaryUrl);
      return { started: true, targetUrl: primaryUrl };
    } catch {
      await openUrlFn(endpoints.fallbackApkUrl);
      return { started: true, targetUrl: endpoints.fallbackApkUrl };
    }
  }

  return { started: false, targetUrl: primaryUrl };
}
