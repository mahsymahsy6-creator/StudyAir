import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveIndonesianSubject,
  INDONESIAN_SUBJECT_CATALOG,
} from "../../lib/subjectDictionary.ts";
import {
  normalizeWeekday,
  resolveDeadlineDate,
  resolveTimetableEntries,
  resolveWhiteboardTasks,
} from "../aiService.ts";
import { format, addDays } from "date-fns";

test("resolveIndonesianSubject maps Indonesian school abbreviations", () => {
  const mtk = resolveIndonesianSubject("MTK");
  assert.equal(mtk.canonicalName, "Matematika");
  assert.equal(mtk.defaultColor, "#3A86FF");

  const bindo = resolveIndonesianSubject("b.indo");
  assert.equal(bindo.canonicalName, "Bahasa Indonesia");

  const pjok = resolveIndonesianSubject("PJOK");
  assert.equal(pjok.canonicalName, "Pendidikan Jasmani & Kesehatan (PJOK)");

  const pai = resolveIndonesianSubject("PAI");
  assert.equal(pai.canonicalName, "Pendidikan Agama Islam (PAI)");

  const ppkn = resolveIndonesianSubject("PPKn");
  assert.equal(ppkn.canonicalName, "Pancasila & Kewarganegaraan (PPKn)");

  const bk = resolveIndonesianSubject("BK");
  assert.equal(bk.canonicalName, "Bimbingan & Konseling (BK)");

  const sbk = resolveIndonesianSubject("SBK");
  assert.equal(sbk.canonicalName, "Seni Budaya & Keterampilan (SBK)");

  const unknown = resolveIndonesianSubject("Robotika");
  assert.equal(unknown.canonicalName, "Robotika");
  assert.ok(unknown.defaultColor);
});

test("normalizeWeekday maps Indonesian day names to 1..7 (Monday=1)", () => {
  assert.equal(normalizeWeekday("Senin"), 1);
  assert.equal(normalizeWeekday("Selasa"), 2);
  assert.equal(normalizeWeekday("Rabu"), 3);
  assert.equal(normalizeWeekday("Kamis"), 4);
  assert.equal(normalizeWeekday("Jum'at"), 5);
  assert.equal(normalizeWeekday("Sabtu"), 6);
  assert.equal(normalizeWeekday("Minggu"), 7);
  assert.equal(normalizeWeekday("Monday"), 1);
  assert.equal(normalizeWeekday(3), 3);
});

test("resolveDeadlineDate resolves colloquial Indonesian deadline terms deterministically", () => {
  const fixedToday = new Date("2026-10-23T08:00:00Z"); // Friday

  // "hari ini" -> today
  assert.equal(resolveDeadlineDate("hari ini", fixedToday), "2026-10-23");

  // "besok" -> Saturday 2026-10-24
  assert.equal(resolveDeadlineDate("besok", fixedToday), "2026-10-24");

  // "lusa" -> Sunday 2026-10-25
  assert.equal(resolveDeadlineDate("lusa", fixedToday), "2026-10-25");

  // explicit date
  assert.equal(resolveDeadlineDate("2026-11-05", fixedToday), "2026-11-05");

  // empty -> defaults to tomorrow (2026-10-24) without fabricating 3 weeks out
  assert.equal(resolveDeadlineDate(undefined, fixedToday), "2026-10-24");
});

test("resolveTimetableEntries creates valid TimetableEntry and canonical Subject", () => {
  const rawEntries = [
    {
      rawDay: "Senin",
      rawPeriod: 1,
      rawSubject: "MTK",
      rawTeacher: "Pak Budi",
      rawRoom: "10-A",
    },
    {
      rawDay: "Senin",
      rawPeriod: 2,
      rawSubject: "MTK",
      rawTeacher: "Pak Budi",
      rawRoom: "10-A",
    },
    {
      rawDay: "Selasa",
      rawPeriod: 3,
      rawSubject: "PJOK",
      rawTeacher: "Pak Slamet",
    },
  ];

  const result = resolveTimetableEntries(rawEntries, []);
  assert.equal(result.timetableEntries.length, 3);
  assert.equal(result.createdSubjects.length, 2);

  const mtkSubject = result.createdSubjects.find((s) => s.name === "Matematika");
  assert.ok(mtkSubject);
  assert.equal(mtkSubject.teacher, "Pak Budi");
  assert.equal(mtkSubject.room, "10-A");

  const entry1 = result.timetableEntries[0];
  assert.equal(entry1.weekday, 1);
  assert.equal(entry1.periodNumber, 1);
  assert.equal(entry1.subjectId, mtkSubject.id);
});

test("resolveWhiteboardTasks creates valid Task models with deterministic deadline", () => {
  const rawExtraction = {
    subject: "Fisika",
    tasks: [
      {
        title: "PR LKS Halaman 45 No 1-10",
        rawDeadline: "Besok",
        type: "homework" as const,
        notes: "Kerjakan di buku tulis",
      },
      {
        title: "Kuis Bab Termodinamika",
        rawDeadline: "Lusa",
        type: "quiz" as const,
      },
    ],
  };

  const { tasks, subject } = resolveWhiteboardTasks(rawExtraction, []);
  assert.equal(subject.name, "Fisika");
  assert.equal(tasks.length, 2);

  const task1 = tasks[0];
  assert.equal(task1.title, "PR LKS Halaman 45 No 1-10");
  assert.equal(task1.type, "homework");
  assert.equal(task1.status, "PENDING");
  assert.ok(task1.deadlineDate);

  const task2 = tasks[1];
  assert.equal(task2.type, "quiz");
  assert.equal(task2.status, "PENDING");
});
