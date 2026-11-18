/**
 * StudyAir Mobile — Keep Awake Utility
 * 
 * Uses the standard W3C Screen Wake Lock API in web/browser environments
 * with graceful fallback in non-supported environments.
 */

let wakeLockSentinel: any = null;

export async function activateKeepAwake(): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
    }
  } catch (err) {
    // Non-critical: device or browser does not grant wake lock
  }
}

export async function deactivateKeepAwake(): Promise<void> {
  try {
    if (wakeLockSentinel) {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
    }
  } catch {
    // Non-critical
  }
}
