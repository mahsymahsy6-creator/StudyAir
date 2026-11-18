/**
 * StudyAir Mobile — Timetable Data Audit & Repair Engine (Step 3)
 * 
 * Provides:
 * 1. Pre-repair backup snapshot.
 * 2. Audit of:
 *    - Orphan entries (subjectId not found in subjects).
 *    - Duplicates & Conflicts (same weekday + periodNumber + weekPattern).
 *    - Reclassification candidates (e.g. Literasi -> event, Istirahat -> break).
 * 3. Repair operations:
 *    - Relink orphan to a subject (or auto-relink by name/alias).
 *    - Keep one / delete other in conflicts.
 *    - Auto-deduplicate exact duplicates.
 *    - Apply proposed kind classifications.
 */

import { Subject, TimetableEntry } from "../types";
import { classifyTimetableKind } from "./daySchedule";

export interface OrphanAuditItem {
  entry: TimetableEntry;
  suggestedSubject?: Subject;
}

export interface DuplicateConflictGroup {
  key: string; // `${weekday}-${periodNumber}-${weekPattern}`
  weekday: number;
  periodNumber: number;
  weekPattern: string;
  entries: TimetableEntry[];
  isExactDuplicate: boolean;
}

export interface ReclassifyCandidateItem {
  entry: TimetableEntry;
  currentKind: string;
  proposedKind: "class" | "break" | "event";
  reason: string;
}

export interface TimetableAuditResult {
  hasIssues: boolean;
  orphans: OrphanAuditItem[];
  conflictGroups: DuplicateConflictGroup[];
  reclassifyCandidates: ReclassifyCandidateItem[];
  totalEntriesCount: number;
}

/**
 * Audits current database state for anomalies.
 */
export function auditTimetableData(
  entries: TimetableEntry[],
  subjects: Subject[]
): TimetableAuditResult {
  const subjectsMap = new Map<string, Subject>();
  for (const s of subjects) {
    subjectsMap.set(s.id, s);
  }

  // 1. Audit Orphans
  const orphans: OrphanAuditItem[] = [];
  for (const entry of entries) {
    // If it's a break or event with no subjectId, that is valid
    if (entry.kind === "break" || entry.kind === "event") continue;

    if (!entry.subjectId || !subjectsMap.has(entry.subjectId)) {
      // Try to find a suggested subject by label or alias
      let suggested: Subject | undefined = undefined;
      const label = (entry.customLabel || "").toLowerCase().trim();

      if (label) {
        suggested = subjects.find((s) => {
          if (s.name.toLowerCase() === label || s.title?.toLowerCase() === label) return true;
          return s.aliases?.some((a) => a.toLowerCase() === label);
        });
      }

      orphans.push({
        entry,
        suggestedSubject: suggested,
      });
    }
  }

  // 2. Audit Duplicates & Conflicts
  const groupsMap = new Map<string, TimetableEntry[]>();
  for (const entry of entries) {
    const key = `${entry.weekday}-${entry.periodNumber}-${entry.weekPattern || "every"}`;
    const list = groupsMap.get(key) || [];
    list.push(entry);
    groupsMap.set(key, list);
  }

  const conflictGroups: DuplicateConflictGroup[] = [];
  for (const [key, list] of groupsMap.entries()) {
    if (list.length > 1) {
      const parts = key.split("-");
      const weekday = parseInt(parts[0], 10);
      const periodNumber = parseInt(parts[1], 10);
      const weekPattern = parts[2];

      const first = list[0];
      const isExact = list.every(
        (e) =>
          e.subjectId === first.subjectId &&
          (e.room || "") === (first.room || "") &&
          (e.teacher || "") === (first.teacher || "") &&
          (e.kind || "class") === (first.kind || "class")
      );

      conflictGroups.push({
        key,
        weekday,
        periodNumber,
        weekPattern,
        entries: list,
        isExactDuplicate: isExact,
      });
    }
  }

  // 3. Audit Reclassifications (e.g. Literasi, Istirahat, Upacara)
  const reclassifyCandidates: ReclassifyCandidateItem[] = [];
  for (const entry of entries) {
    const subj = subjectsMap.get(entry.subjectId);
    const rawName = entry.customLabel || subj?.title || subj?.name || "";
    const proposed = classifyTimetableKind(undefined, rawName, entry.customLabel);

    const currentKind = entry.kind || "class";
    if (proposed !== currentKind) {
      reclassifyCandidates.push({
        entry,
        currentKind,
        proposedKind: proposed,
        reason: `Nama "${rawName}" terdeteksi sebagai ${proposed}`,
      });
    }
  }

  const hasIssues = orphans.length > 0 || conflictGroups.length > 0 || reclassifyCandidates.length > 0;

  return {
    hasIssues,
    orphans,
    conflictGroups,
    reclassifyCandidates,
    totalEntriesCount: entries.length,
  };
}

/**
 * Automatically repairs exact duplicates by keeping only one copy.
 */
export function removeExactDuplicates(entries: TimetableEntry[]): {
  repairedEntries: TimetableEntry[];
  removedCount: number;
} {
  const seen = new Set<string>();
  const repairedEntries: TimetableEntry[] = [];
  let removedCount = 0;

  for (const entry of entries) {
    // Fingerprint of entry content
    const fingerprint = `${entry.weekday}-${entry.periodNumber}-${entry.weekPattern || "every"}-${entry.subjectId}-${entry.kind || "class"}-${entry.room || ""}-${entry.teacher || ""}`;
    if (seen.has(fingerprint)) {
      removedCount++;
    } else {
      seen.add(fingerprint);
      repairedEntries.push(entry);
    }
  }

  return { repairedEntries, removedCount };
}
