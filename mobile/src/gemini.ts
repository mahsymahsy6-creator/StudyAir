/**
 * StudyAir Mobile — Google Gemini Client
 * Direct REST API client for React Native with Gemini 2.5 Flash & 1.5 Flash.
 */

import { CognitiveLoad } from "./types";
import { toLocalDateStr, addDaysLocal } from "./lib/dateUtils";

export interface MobileParsedUnit {
  id: string;
  title: string;
  estimated_minutes: number;
  cognitive_load: CognitiveLoad;
  enabled: boolean;
  suggested_time: string;
}

export interface MobileParsedSyllabus {
  subject_title: string;
  subject_code?: string;
  exam_date: string;
  color_hex: string;
  summary: string;
  units: MobileParsedUnit[];
}

const PRIMARY_MODEL = "gemini-3.8-flash";
const FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
];

export type GeminiInput =
  | string
  | {
      text?: string;
      imageBase64?: string;
      mimeType?: string;
    };

export async function parseSyllabusWithGemini(
  input: GeminiInput,
  apiKey: string
): Promise<{ result: MobileParsedSyllabus; model: string }> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Please enter your Gemini API Key first.");
  }

  const textContent = typeof input === "string" ? input : input.text || "";
  const isImage = typeof input === "object" && !!input.imageBase64;

  const prompt = `You are StudyAir AI, an elite academic scheduler.
Analyze the following course syllabus, task notes, timetable, or photograph of assignments/materials:
${textContent ? `"""\n${textContent}\n"""` : ""}

Extract:
1. "subject_title": string (clean course or task subject name)
2. "subject_code": string (optional course code)
3. "exam_date": string in YYYY-MM-DD format (if not mentioned, pick a plausible date 3-5 weeks from today)
4. "color_hex": string (hex color e.g. "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899")
5. "summary": string (1-2 sentence executive overview)
6. "units": array of atomic study units or actionable tasks:
   - "id": string (unique e.g. "u-1", "u-2")
   - "title": string (clear atomic concept or lecture topic or task)
   - "estimated_minutes": number (30 to 120 minutes)
   - "cognitive_load": "LOW" | "MEDIUM" | "HIGH"
   - "suggested_time": string in HH:mm 24-hour format (e.g. "09:00", "11:30", "14:00")

Respond ONLY with a valid JSON object matching the schema above without markdown wraps.`;

  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const parts: any[] = [];
      if (isImage && typeof input === "object" && input.imageBase64) {
        const cleanBase64 = input.imageBase64.replace(/^data:[^;]+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType: input.mimeType || "image/jpeg",
            data: cleanBase64,
          },
        });
      }
      parts.push({ text: prompt });

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Empty response from Gemini.");

      // Clean possible fences
      const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const units: MobileParsedUnit[] = (parsed.units || []).map((u: any, idx: number) => ({
        id: u.id || `u-${idx + 1}`,
        title: u.title || `Topic ${idx + 1}`,
        estimated_minutes: typeof u.estimated_minutes === "number" ? u.estimated_minutes : 60,
        cognitive_load: ["LOW", "MEDIUM", "HIGH"].includes(u.cognitive_load)
          ? u.cognitive_load
          : "MEDIUM",
        enabled: true,
        suggested_time: u.suggested_time || "10:00",
      }));

      return {
        result: {
          subject_title: parsed.subject_title || "Course Syllabus",
          subject_code: parsed.subject_code,
          exam_date: parsed.exam_date || addDaysLocal(toLocalDateStr(), 30),
          color_hex: parsed.color_hex || "#3b82f6",
          summary: parsed.summary || "Parsed course outline.",
          units,
        },
        model,
      };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to communicate with Gemini API.");
}
