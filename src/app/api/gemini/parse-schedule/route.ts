import { NextResponse } from "next/server";
import {
  parseSyllabusWithGemini,
  parseTimetableWithGemini,
  parseWhiteboardWithGemini,
} from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      imageBase64,
      mimeType,
      syllabusText,
      timetableText,
      whiteboardText,
      text,
      customPrompt,
      apiKey,
      mode = "syllabus",
    } = body;

    // Check if API key is provided directly or via environment
    const effectiveApiKey =
      apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!effectiveApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_GEMINI_API_KEY",
          message:
            "A Google Gemini API Key is required to process real documents with Gemini 3.8 Flash. Please configure GEMINI_API_KEY in your environment.",
        },
        { status: 400 }
      );
    }

    const effectiveText = text || syllabusText || timetableText || whiteboardText;

    if (!imageBase64 && !effectiveText) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_INPUT_PROVIDED",
          message: "Please upload an image, take a photo, or paste text for Gemini to analyze.",
        },
        { status: 400 }
      );
    }

    let result: any;
    if (mode === "timetable") {
      result = await parseTimetableWithGemini({
        imageBase64,
        mimeType: mimeType || "image/jpeg",
        timetableText: effectiveText,
        apiKey: effectiveApiKey,
      });
    } else if (mode === "whiteboard") {
      result = await parseWhiteboardWithGemini({
        imageBase64,
        mimeType: mimeType || "image/jpeg",
        whiteboardText: effectiveText,
        apiKey: effectiveApiKey,
      });
    } else {
      result = await parseSyllabusWithGemini({
        imageBase64,
        mimeType: mimeType || "image/jpeg",
        syllabusText: effectiveText,
        customPrompt,
        apiKey: effectiveApiKey,
      });
    }

    return NextResponse.json({
      success: true,
      source: "gemini",
      model: result.modelUsed,
      data: result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze document with Gemini";
    return NextResponse.json(
      {
        success: false,
        error: "GEMINI_EXECUTION_ERROR",
        message,
      },
      { status: 500 }
    );
  }
}
