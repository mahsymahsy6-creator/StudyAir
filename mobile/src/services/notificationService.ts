/**
 * StudyAir Mobile — Local Notification Engine
 * 
 * Features:
 * - Evening preview notification at user-selected time (e.g., 20:00):
 *   "Tomorrow: Math, Biology, English. 2 tasks due."
 * - Morning "Due Today" alert at configured time (e.g., 06:30).
 * - Contextual permission handling (never on initial launch).
 * - Test notification trigger for instant verification on device.
 * - Graceful web and simulator fallback.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { EffectiveScheduleResult } from "../store";

// Notification handler for foreground presentation
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (err) {
  console.warn("[NotificationService] setNotificationHandler skipped:", err);
}

export const NOTIFICATION_CHANNELS = {
  EVENING_PREVIEW: "evening-preview-channel",
  MORNING_DUE: "morning-due-channel",
};

/**
 * Configure Android notification channels if running on Android
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.EVENING_PREVIEW, {
      name: "Pratinjau Jadwal Malam",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3A86FF",
    });

    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.MORNING_DUE, {
      name: "Pengingat Pagi Hari Ini",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#F59E0B",
    });
  } catch (err) {
    console.warn("[NotificationService] Channel setup skipped:", err);
  }
}

/**
 * Check if notification permissions are already granted
 */
export async function checkNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

/**
 * Contextually request notification permissions
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === "granted") return true;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status === "granted") {
      await setupNotificationChannels();
      return true;
    }
    return false;
  } catch (err) {
    console.warn("[NotificationService] Permission request failed:", err);
    return false;
  }
}

/**
 * Schedule daily evening preview notification
 */
export async function scheduleEveningPreviewNotification(
  timeStr: string, // "HH:MM" e.g. "20:00"
  tomorrowSchedule: EffectiveScheduleResult,
  tasksDueTomorrowCount: number
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const hasPerm = await checkNotificationPermission();
    if (!hasPerm) return null;

    const parts = timeStr.split(":");
    const hour = parseInt(parts[0] || "20", 10);
    const minute = parseInt(parts[1] || "0", 10);

    let title = "Jadwal Belajar Besok 🎒";
    let body = "";

    if (tomorrowSchedule.isDayOff) {
      body = `Besok Libur: ${tomorrowSchedule.dayOffReason || "Hari Libur"}. Tidak ada jadwal kelas.`;
    } else if (tomorrowSchedule.items.length > 0) {
      const activeClassNames = tomorrowSchedule.items
        .filter((c) => c.overrideType !== "cancelled")
        .map((c) => c.subject?.title || c.customLabel || "Pelajaran");

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

    let identifier: string | null = null;
    try {
      identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: NOTIFICATION_CHANNELS.EVENING_PREVIEW,
        },
      });
    } catch (schedErr) {
      console.warn("[NotificationService] Daily exact schedule failed, using fallback:", schedErr);
      try {
        // Fallback for Android 14+ when exact alarms are restricted
        identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
          },
          trigger: {
            seconds: 60 * 60,
            repeats: false,
          } as any,
        });
      } catch (fallbackErr) {
        console.warn("[NotificationService] Fallback also failed:", fallbackErr);
      }
    }

    return identifier;
  } catch (err) {
    console.warn("[NotificationService] Failed to schedule evening preview:", err);
    return null;
  }
}

/**
 * Schedule daily morning "Due Today" alert
 */
export async function scheduleMorningAlertNotification(
  timeStr: string, // "HH:MM" e.g. "06:30"
  todayClassesCount: number,
  tasksDueTodayCount: number
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const hasPerm = await checkNotificationPermission();
    if (!hasPerm) return null;

    const parts = timeStr.split(":");
    const hour = parseInt(parts[0] || "06", 10);
    const minute = parseInt(parts[1] || "30", 10);

    const title = "Pengingat Sekolah Pagi ☀️";
    const body = `Hari ini ada ${todayClassesCount} mata pelajaran${
      tasksDueTodayCount > 0
        ? ` dan ${tasksDueTodayCount} tugas harus dikumpul!`
        : ". Semangat belajar!"
    }`;

    let identifier: string | null = null;
    try {
      identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: NOTIFICATION_CHANNELS.MORNING_DUE,
        },
      });
    } catch (schedErr) {
      console.warn("[NotificationService] Daily exact morning schedule failed, using fallback:", schedErr);
      try {
        identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
          },
          trigger: {
            seconds: 60 * 60,
            repeats: false,
          } as any,
        });
      } catch (fallbackErr) {
        console.warn("[NotificationService] Morning fallback failed:", fallbackErr);
      }
    }

    return identifier;
  } catch (err) {
    console.warn("[NotificationService] Failed to schedule morning alert:", err);
    return null;
  }
}

/**
 * Send an immediate test notification for live verification
 */
export async function sendTestNotification(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "StudyAir — Pengingat Berhasil! 🔔",
        body: "Besok: Matematika, Biologi, B. Inggris. 2 tugas dikumpul.",
        sound: true,
      },
      trigger: null, // Send immediately
    });

    return true;
  } catch (err) {
    console.warn("[NotificationService] Send test notification failed:", err);
    return false;
  }
}

/**
 * Schedule reminder notification 10 minutes before a study block starts
 */
export async function scheduleStudyBlockReminderNotification(
  dateStr: string, // YYYY-MM-DD
  startTime: string, // HH:mm
  taskTitle: string,
  subjectName?: string
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;

    const [hours, minutes] = startTime.split(":").map(Number);
    const [year, month, day] = dateStr.split("-").map(Number);

    // Schedule 10 minutes before start
    const triggerDate = new Date(year, month - 1, day, hours, minutes);
    triggerDate.setMinutes(triggerDate.getMinutes() - 10);

    // If trigger is already in the past, skip
    if (triggerDate.getTime() <= Date.now()) return null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Waktunya Belajar! ⏱️",
        body: `10 menit lagi: ${taskTitle}${subjectName ? ` (${subjectName})` : ""}`,
        sound: true,
      },
      trigger: triggerDate as any,
    });

    return identifier;
  } catch (err) {
    console.warn("[NotificationService] Failed to schedule study block reminder:", err);
    return null;
  }
}

