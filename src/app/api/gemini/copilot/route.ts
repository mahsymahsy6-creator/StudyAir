import { NextResponse } from "next/server";
import { copilotWithGemini } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, routine, blocks = [], subjects = [], apiKey } = body;

    const effectiveApiKey =
      apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // Build concise student schedule summary
    const highLoadCount = blocks.filter(
      (b: { study_unit?: { cognitive_load?: string } }) =>
        b.study_unit?.cognitive_load === "HIGH"
    ).length;
    const completedCount = blocks.filter(
      (b: { status?: string }) => b.status === "COMPLETED"
    ).length;

    const summary = `
- Total active study blocks: ${blocks.length}
- Completed blocks: ${completedCount}
- High cognitive strain blocks: ${highLoadCount}
- Registered subjects: ${subjects.map((s: { title: string }) => s.title).join(", ") || "None"}
`;

    if (effectiveApiKey) {
      try {
        const result = await copilotWithGemini({
          prompt: prompt || "",
          routine,
          currentScheduleSummary: summary,
          apiKey: effectiveApiKey,
        });

        return NextResponse.json({
          success: true,
          source: "gemini",
          model: result.modelUsed,
          ...result,
        });
      } catch (geminiError: unknown) {
        console.warn("Gemini Copilot API call failed, falling back:", geminiError);
      }
    }

    // Local Copilot Heuristic Fallback
    const p = (prompt || routine || "").toLowerCase();
    let explanation = "Analyzed cognitive distribution across current scheduled slots.";
    let recommendedAction = "Calendar optimized for sustained focus.";
    let dailyCap = 240;

    if (p.includes("morning") || routine === "morning") {
      explanation = "Shifting high-strain analytical sessions to morning blocks (09:00 - 12:00) during peak alertness.";
      recommendedAction = "Morning Deep Work priority active.";
      dailyCap = 210;
    } else if (p.includes("exam") || p.includes("crunch") || routine === "crunch") {
      explanation = "Expanding daily capacity to 5 hours and ordering blocks by upcoming exam deadlines.";
      recommendedAction = "14-Day Exam Crunch Mode enabled.";
      dailyCap = 300;
    } else if (p.includes("sm-2") || p.includes("review") || routine === "catchup") {
      explanation = "Refreshing spaced repetition intervals to reinforce active memory recall.";
      recommendedAction = "SM-2 Spaced Repetition milestones booked.";
      dailyCap = 240;
    } else {
      explanation = "Rebalancing high-demand problem sets with restorative review intervals to avoid mental burnout.";
      recommendedAction = "Cognitive strain distributed evenly across the week.";
      dailyCap = 240;
    }

    return NextResponse.json({
      success: true,
      source: "local-heuristic",
      model: "StudyAir Copilot Engine",
      explanation,
      recommendedAction,
      dailyCapMinutes: dailyCap,
      highlightedAdjustment: "Evenly interleaving HIGH and MEDIUM cognitive demand topics.",
      note: effectiveApiKey
        ? undefined
        : "Set GEMINI_API_KEY in .env.local to activate cloud-scale Google Gemini Copilot reasoning.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
