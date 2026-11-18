/**
 * StudyAir Google Gemini Service
 * Direct REST API client for Gemini 3.8 Flash with multimodal vision support.
 * Uses native fetch with zero extra runtime dependencies.
 */

export interface GeminiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // Base64 encoded string
  };
}

export interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  thinkingConfig?: { thinkingBudget?: number };
}

export interface GeminiRequestPayload {
  contents: {
    role?: string;
    parts: GeminiContentPart[];
  }[];
  systemInstruction?: {
    parts: { text: string }[];
  };
  generationConfig?: GeminiGenerationConfig;
}

export interface GeminiResponseCandidate {
  content: {
    parts: { text?: string }[];
    role: string;
  };
  finishReason?: string;
}

export interface GeminiApiResponse {
  candidates?: GeminiResponseCandidate[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

const PRIMARY_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

/**
 * Executes a call to the Gemini API using native fetch
 */
export async function callGeminiAPI(
  payload: GeminiRequestPayload,
  apiKeyOverride?: string
): Promise<{ text: string; model: string }> {
  const apiKey =
    apiKeyOverride ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please provide an API key in .env.local or via Settings."
    );
  }

  // Attempt primary model first, fallback to available flash models
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMsg =
          errorData?.error?.message || `HTTP ${res.status} ${res.statusText}`;
        throw new Error(`Gemini API [${model}] error: ${errorMsg}`);
      }

      const data: GeminiApiResponse = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error(`Gemini API [${model}] returned an empty response.`);
      }

      return { text, model };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue to fallback model if primary fails
    }
  }

  throw lastError ?? new Error("Failed to contact Gemini API.");
}

/**
 * Extracts syllabus, exam dates, atomic study units, and time slots from an image using Gemini
 */
export async function parseSyllabusWithGemini(params: {
  imageBase64?: string;
  mimeType?: string;
  syllabusText?: string;
  customPrompt?: string;
  apiKey?: string;
}): Promise<{
  subject_title: string;
  exam_date: string;
  color_hex: string;
  total_estimated_minutes: number;
  confidence: number;
  units: {
    id: string;
    title: string;
    estimated_minutes: number;
    cognitive_load: "LOW" | "MEDIUM" | "HIGH";
    suggested_date?: string;
    suggested_time?: string;
    block_type: "STUDY" | "REVIEW" | "EXAM_PREP";
  }[];
  modelUsed: string;
}> {
  const parts: GeminiContentPart[] = [];

  if (params.imageBase64 && params.mimeType) {
    // Strip potential data URL prefix if present
    const base64Clean = params.imageBase64.replace(/^data:[^;]+;base64,/, "");
    parts.push({
      inlineData: {
        mimeType: params.mimeType,
        data: base64Clean,
      },
    });
  }

  const promptText = `
You are an expert academic curriculum deconstructor and cognitive study scheduling AI for StudyAir.
Analyze this course syllabus, lecture schedule, timetable, or notes and extract an optimized study plan.

Requirements:
1. Extract or synthesize a clear subject title (e.g. "Distributed Systems & Cloud Computing").
2. Extract the target final exam date or milestone in YYYY-MM-DD format (ONLY if explicitly mentioned in the text or photo; otherwise return null).
3. Choose a vibrant subject color hex code (e.g. #3b82f6, #10b981, #8b5cf6, #ec4899, #f59e0b).
4. Extract 4 to 8 distinct, atomic study units representing core topics or modules.
5. For each study unit:
   - title: concise, descriptive topic name
   - estimated_minutes: realistic study duration between 30 and 120 minutes (typically 45, 60, or 90)
   - cognitive_load: 'LOW' (reading, flashcard review), 'MEDIUM' (conceptual understanding, homework), or 'HIGH' (proofs, coding labs, heavy problem sets)
   - suggested_date: an ISO date (YYYY-MM-DD) if date is stated, else null
   - suggested_time: suggested start time (e.g. "09:00", "11:00", "14:00", "16:00")
   - block_type: 'STUDY', 'REVIEW', or 'EXAM_PREP'

Return strictly valid JSON conforming to this schema without any markdown backticks:
{
  "subject_title": "string",
  "exam_date": "YYYY-MM-DD or null",
  "color_hex": "#hex",
  "total_estimated_minutes": number,
  "confidence": number between 0.85 and 0.99,
  "units": [
    {
      "id": "u-1",
      "title": "string",
      "estimated_minutes": number,
      "cognitive_load": "LOW" | "MEDIUM" | "HIGH",
      "suggested_date": "YYYY-MM-DD or null",
      "suggested_time": "HH:mm",
      "block_type": "STUDY" | "REVIEW" | "EXAM_PREP"
    }
  ]
}
${params.customPrompt ? `Additional user instructions: ${params.customPrompt}` : ""}
${params.syllabusText ? `Document Text:\n${params.syllabusText}` : ""}
`;

  parts.push({ text: promptText });

  const payload: GeminiRequestPayload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  const { text, model } = await callGeminiAPI(payload, params.apiKey);

  // Parse JSON response safely
  const cleanJson = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleanJson);

  return {
    ...parsed,
    modelUsed: model,
  };
}

/**
 * Extracts school timetable grid (day, period number, subject, teacher, room)
 * AI Rule: AI extracts raw entities only; deterministic application code maps calendar dates.
 */
export async function parseTimetableWithGemini(params: {
  imageBase64?: string;
  mimeType?: string;
  timetableText?: string;
  apiKey?: string;
}): Promise<{
  entries: {
    rawDay: string | number;
    rawPeriod: number;
    rawSubject: string;
    rawTeacher?: string;
    rawRoom?: string;
  }[];
  modelUsed: string;
}> {
  const parts: GeminiContentPart[] = [];

  if (params.imageBase64 && params.mimeType) {
    const base64Clean = params.imageBase64.replace(/^data:[^;]+;base64,/, "");
    parts.push({
      inlineData: {
        mimeType: params.mimeType,
        data: base64Clean,
      },
    });
  }

  const promptText = `OCR school timetable. No dates/markdown.
Return compact JSON:
{"e":[{"d":"Senin","p":1,"s":"MTK","t":null,"r":null}]}
d=day, p=period(1..8), s=subject, t=teacher, r=room
${params.timetableText ? `Schedule Text:\n${params.timetableText}` : ""}
`;

  parts.push({ text: promptText });

  const payload: GeminiRequestPayload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2500,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
    },
  };

  let text = "";
  let model = "";
  const res = await callGeminiAPI(payload, params.apiKey);
  text = res.text;
  model = res.model;

  let cleanJson = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (_jsonErr) {
    // Retry once ONLY on invalid JSON syntax error, never on timeout
    console.warn("[Gemini] Invalid JSON received, retrying once...");
    const retryRes = await callGeminiAPI(payload, params.apiKey);
    text = retryRes.text;
    model = retryRes.model;
    cleanJson = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    parsed = JSON.parse(cleanJson);
  }

  const rawList = Array.isArray(parsed)
    ? parsed
    : (parsed.e || parsed.entries || Object.values(parsed).find(Array.isArray) || []);

  const entries = rawList.map((item: any) => ({
    rawDay: item.d || item.day || item.rawDay,
    rawPeriod: Number(item.p || item.period || item.rawPeriod) || 1,
    rawSubject: item.s || item.subject || item.rawSubject,
    rawTeacher: item.t || item.teacher || item.rawTeacher || undefined,
    rawRoom: item.r || item.room || item.rawRoom || undefined,
  }));

  return {
    entries,
    modelUsed: model,
  };
}

/**
 * Extracts whiteboard assignments, homework, and test notices.
 * AI Rule: AI extracts raw assignments; deterministic application code resolves deadlines.
 */
export async function parseWhiteboardWithGemini(params: {
  imageBase64?: string;
  mimeType?: string;
  whiteboardText?: string;
  apiKey?: string;
}): Promise<{
  subject?: string;
  tasks: {
    title: string;
    rawDeadline?: string;
    type?: "homework" | "quiz" | "project";
    notes?: string;
  }[];
  modelUsed: string;
}> {
  const parts: GeminiContentPart[] = [];

  if (params.imageBase64 && params.mimeType) {
    const base64Clean = params.imageBase64.replace(/^data:[^;]+;base64,/, "");
    parts.push({
      inlineData: {
        mimeType: params.mimeType,
        data: base64Clean,
      },
    });
  }

  const promptText = `
You are an expert OCR parser for classroom whiteboards and assignment notes.
Analyze this photo or text of a classroom whiteboard.

Extract:
1. "subject": the subject or course title if written on the board (e.g. "Fisika", "Matematika", or null)
2. "tasks": list of all actionable assignments, homework (PR), quizzes (kuis/ulangan), or projects (split comma-separated page/exercise blocks like "Halaman 58-59 kegiatan 2, Halaman 63 kegiatan 2" into separate tasks, while keeping question numbers like "no 1, 2, 3" as one task):
   - "title": concise task description (e.g. "LKS Halaman 45 No 1-10")
   - "rawDeadline": deadline string EXACTLY as written on the board (e.g. "Besok", "Senin depan", "24 Okt", or null). NEVER fabricate dates.
   - "type": "homework" | "quiz" | "project"
   - "notes": additional notes, instructions, or materials needed (or null)

Return strictly a JSON object:
{
  "subject": "string or null",
  "tasks": [
    {
      "title": "PR Hal 45 No 1-10",
      "rawDeadline": "Besok",
      "type": "homework",
      "notes": "Kerjakan di buku tugas"
    }
  ]
}
${params.whiteboardText ? `Whiteboard Text:\n${params.whiteboardText}` : ""}
`;

  parts.push({ text: promptText });

  const payload: GeminiRequestPayload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  const { text, model } = await callGeminiAPI(payload, params.apiKey);
  const cleanJson = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleanJson);
  return {
    subject: parsed.subject || undefined,
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    modelUsed: model,
  };
}

/**
 * Schedule Copilot: Evaluates user instructions against study blocks and returns intelligent rebalancing advice & modified slots
 */
export async function copilotWithGemini(params: {
  prompt: string;
  routine?: string;
  currentScheduleSummary: string;
  apiKey?: string;
}): Promise<{
  explanation: string;
  recommendedAction: string;
  dailyCapMinutes: number;
  highlightedAdjustment: string;
  modelUsed: string;
}> {
  const combinedPrompt = `
You are the StudyAir AI Copilot. You are an expert in cognitive ergonomics, spaced repetition (SuperMemo SM-2), and time-blocking optimization.
Optimize university students' weekly study calendars to maximize memory retention and prevent burnout.

Current Student Study State:
${params.currentScheduleSummary}

Requested Action / Prompt:
${params.prompt || params.routine || "Optimize schedule for cognitive balance"}

Analyze the schedule and respond with strictly valid JSON:
{
  "explanation": "Brief 1-2 sentence rationale of the schedule optimization",
  "recommendedAction": "Actionable summary of shifts (e.g., Morning Deep Work prioritized, cognitive load balanced)",
  "dailyCapMinutes": number (suggested max daily study minutes, e.g. 210, 240, or 300),
  "highlightedAdjustment": "Key insight for the student"
}
`;

  const payload: GeminiRequestPayload = {
    contents: [{ parts: [{ text: combinedPrompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
    },
  };

  const { text, model } = await callGeminiAPI(payload, params.apiKey);
  const cleanJson = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleanJson);
  return {
    ...parsed,
    modelUsed: model,
  };
}
