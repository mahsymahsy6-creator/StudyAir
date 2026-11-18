"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Upload,
  Camera,
  FileText,
  Calendar,
  Clock,
  RotateCcw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { soundFX } from "@/lib/sound";
import { useStudyStore } from "@/stores/studyStore";
import {
  SAMPLE_PHOTO_PRESETS,
  type ParsedSyllabusResult,
  type ParsedStudyUnit,
} from "@/lib/engine/ai-vision-parser";
import { CognitiveLoadBadge } from "@/components/shared/CognitiveLoadBadge";
import { GeminiApiKeyModal } from "@/components/ai/GeminiApiKeyModal";
import { cn } from "@/lib/utils";

interface AIPhotoScheduleDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onScheduleCompleted?: () => void;
}

type ScanStep = "idle" | "scanning" | "completed";
type IngestTab = "photo" | "text";

export function AIPhotoScheduleDialog({
  open,
  onClose,
  onScheduleCompleted,
}: AIPhotoScheduleDialogProps) {
  const addSubject = useStudyStore((state) => state.addSubject);
  const addStudyUnit = useStudyStore((state) => state.addStudyUnit);
  const addBlock = useStudyStore((state) => state.addBlock);

  const [scanStep, setScanStep] = useState<ScanStep>("idle");
  const [ingestTab, setIngestTab] = useState<IngestTab>("photo");
  const [syllabusText, setSyllabusText] = useState("");
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSyllabusResult | null>(null);
  const [editableUnits, setEditableUnits] = useState<
    (ParsedStudyUnit & { enabled: boolean })[]
  >([]);
  const [subjectTitle, setSubjectTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [modelName, setModelName] = useState("Gemini Flash (Live)");
  const [geminiKeyOpen, setGeminiKeyOpen] = useState(false);
  const [quickKeyInput, setQuickKeyInput] = useState("");
  const [hasGeminiKey, setHasGeminiKey] = useState(() => {
    if (Boolean(process.env.NEXT_PUBLIC_GEMINI_API_KEY)) return true;
    if (typeof window !== "undefined") {
      return Boolean(localStorage.getItem("studyair-gemini-key"));
    }
    return false;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setScanStep("idle");
    setSelectedImageSrc(null);
    setParsedData(null);
    setEditableUnits([]);
    setSyllabusText("");
    onClose();
  }, [onClose]);

  const handleSaveQuickKey = () => {
    if (!quickKeyInput.trim()) return;
    localStorage.setItem("studyair-gemini-key", quickKeyInput.trim());
    setHasGeminiKey(true);
    setQuickKeyInput("");
    toast.success("Google Gemini API Key Activated!", {
      description: "Ready to analyze your real documents and syllabi with Gemini 3.8 Flash.",
    });
  };

  // Execute Gemini Multimodal Analysis on Real Image
  const processImage = useCallback(
    async (file: File) => {
      setScanStep("scanning");
      try {
        soundFX.playClick();

        const storedKey =
          typeof window !== "undefined"
            ? localStorage.getItem("studyair-gemini-key")
            : null;

        const mimeType = file.type || "image/jpeg";
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || "");
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await fetch("/api/gemini/parse-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64,
            mimeType,
            apiKey: storedKey || undefined,
          }),
        });

        const resJson = await response.json();

        if (!resJson.success) {
          if (resJson.error === "MISSING_GEMINI_API_KEY") {
            toast.error("Gemini API Key Required", {
              description:
                "Enter your Gemini API key below to process real photos with live Gemini 3.8 Flash.",
            });
            setScanStep("idle");
            return;
          }
          throw new Error(resJson.message || "Failed to analyze image with Gemini");
        }

        const result: ParsedSyllabusResult = resJson.data;
        setModelName(resJson.model || "Gemini 3.8 Flash");
        setParsedData(result);
        setSubjectTitle(result.subject_title);
        setExamDate(result.exam_date);
        setEditableUnits(
          result.units.map((u) => ({
            ...u,
            enabled: true,
          }))
        );
        setScanStep("completed");
        soundFX.playSessionSuccess();
      } catch (err: unknown) {
        toast.error("Gemini Vision AI Analysis Failed", {
          description:
            err instanceof Error ? err.message : "Could not parse document structure.",
        });
        setScanStep("idle");
      }
    },
    []
  );

  // Execute Gemini Analysis on Real Syllabus Text
  const processSyllabusText = useCallback(async () => {
    if (!syllabusText.trim()) {
      toast.error("Please enter or paste your syllabus text.");
      return;
    }

    setScanStep("scanning");
    try {
      soundFX.playClick();

      const storedKey =
        typeof window !== "undefined"
          ? localStorage.getItem("studyair-gemini-key")
          : null;

      const response = await fetch("/api/gemini/parse-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabusText: syllabusText.trim(),
          apiKey: storedKey || undefined,
        }),
      });

      const resJson = await response.json();

      if (!resJson.success) {
        if (resJson.error === "MISSING_GEMINI_API_KEY") {
          toast.error("Gemini API Key Required", {
            description:
              "Enter your Gemini API key below to process text with live Gemini 3.8 Flash.",
          });
          setScanStep("idle");
          return;
        }
        throw new Error(resJson.message || "Failed to analyze text with Gemini");
      }

      const result: ParsedSyllabusResult = resJson.data;
      setModelName(resJson.model || "Gemini 3.8 Flash");
      setParsedData(result);
      setSubjectTitle(result.subject_title);
      setExamDate(result.exam_date);
      setEditableUnits(
        result.units.map((u) => ({
          ...u,
          enabled: true,
        }))
      );
      setScanStep("completed");
      soundFX.playSessionSuccess();
    } catch (err: unknown) {
      toast.error("Gemini Text Analysis Failed", {
        description:
          err instanceof Error ? err.message : "Could not parse syllabus text.",
      });
      setScanStep("idle");
    }
  }, [syllabusText]);

  // Handle Preset Quick Click
  const handlePresetClick = (preset: (typeof SAMPLE_PHOTO_PRESETS)[0]) => {
    setSyllabusText(
      `${preset.name}\n\nTopics:\n` +
        preset.extracted_result.units
          .map(
            (u) =>
              `- ${u.title} (${u.estimated_minutes} min, ${u.cognitive_load} strain)`
          )
          .join("\n")
    );
    setIngestTab("text");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImageSrc(event.target?.result as string);
      processImage(file);
    };
    reader.readAsDataURL(file);
  };

  const toggleUnit = (unitId: string) => {
    setEditableUnits((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, enabled: !u.enabled } : u))
    );
  };

  // Commit and schedule
  const handleCommitSchedule = () => {
    if (!parsedData) return;

    const enabledUnits = editableUnits.filter((u) => u.enabled);
    if (enabledUnits.length === 0) {
      toast.error("Please enable at least one study unit to import.");
      return;
    }

    // 1. Create Subject
    const createdSubject = addSubject({
      title: subjectTitle || parsedData.subject_title,
      exam_date: examDate || parsedData.exam_date,
      color_hex: parsedData.color_hex,
    });

    let scheduledCount = 0;

    // 2. Add units and schedule blocks
    for (const unit of enabledUnits) {
      const createdUnit = addStudyUnit({
        subject_id: createdSubject.id,
        title: unit.title,
        estimated_minutes: unit.estimated_minutes,
        cognitive_load: unit.cognitive_load,
      });

      if (unit.suggested_date && unit.suggested_time) {
        const [year, month, day] = unit.suggested_date.split("-").map(Number);
        const [hour, minute] = unit.suggested_time.split(":").map(Number);
        const start = new Date(year, month - 1, day, hour, minute);
        const end = new Date(start.getTime() + unit.estimated_minutes * 60000);

        addBlock({
          study_unit_id: createdUnit.id,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          block_type: unit.block_type,
        });
        scheduledCount++;
      }
    }

    toast.success("Gemini Ingestion Complete!", {
      description: `Added "${createdSubject.title}" with ${enabledUnits.length} units (${scheduledCount} blocks placed on calendar).`,
    });

    onScheduleCompleted?.();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-border bg-card p-6 sm:p-7 shadow-none">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Scan Syllabus with AI
                <Badge
                  variant="outline"
                  className="text-[10px] bg-primary/10 text-primary border-primary/30 font-medium"
                >
                  ⚡ {modelName || "Gemini AI"}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Upload a photo or paste text to create your study schedule.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ─── State 1: Upload / Input ─── */}
        {scanStep === "idle" && (
          <div className="space-y-5 pt-3">
            {/* Inline Gemini Activation Banner if no key */}
            {!hasGeminiKey && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      Connect Live Google Gemini 3.8 Flash
                    </span>
                  </div>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    Get Free Key (10 sec) ↗
                  </a>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Enter your free Gemini API key to activate real cloud multimodal vision on your photos:
                </p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Tempel API key Gemini..."
                    value={quickKeyInput}
                    onChange={(e) => setQuickKeyInput(e.target.value)}
                    className="h-8 text-xs font-mono bg-background/50 border-primary/30"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveQuickKey}
                    disabled={!quickKeyInput.trim()}
                    className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shrink-0"
                  >
                    Activate
                  </Button>
                </div>
              </div>
            )}

            {/* Ingestion Mode Switcher */}
            <div className="flex items-center rounded-xl bg-muted/20 border border-border p-1">
              <button
                type="button"
                onClick={() => setIngestTab("photo")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 min-h-[36px]",
                  ingestTab === "photo"
                    ? "bg-background text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Camera className="h-3.5 w-3.5" />
                Upload Photo
              </button>
              <button
                type="button"
                onClick={() => setIngestTab("text")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 min-h-[36px]",
                  ingestTab === "text"
                    ? "bg-background text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                Paste Text
              </button>
            </div>

            {/* Tab 1: Real Photo Ingestion */}
            {ingestTab === "photo" && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group cursor-pointer rounded-2xl border border-dashed border-border bg-muted/10 p-8 text-center transition-all duration-150 hover:border-primary/60 hover:bg-primary/[0.02]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
                  <Upload className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  Click or drop a syllabus photo here
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supports PNG, JPG, or photos of your timetable.
                </p>
              </div>
            )}

            {/* Tab 2: Real Text Ingestion */}
            {ingestTab === "text" && (
              <div className="space-y-3">
                <Textarea
                  placeholder={`Paste course syllabus, lecture schedule, or exam topics here...\n\nExample:\nCS 101 Computer Systems\nExam: November 20\n- Topic 1: Memory & Caches (60m)\n- Topic 2: Virtual Memory (90m)`}
                  value={syllabusText}
                  onChange={(e) => setSyllabusText(e.target.value)}
                  rows={5}
                  className="text-xs font-mono leading-relaxed bg-muted/15 border-border"
                />
                <Button
                  onClick={processSyllabusText}
                  disabled={!syllabusText.trim()}
                  className="w-full gap-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Analyze Syllabus
                </Button>
              </div>
            )}

            {/* Quick Demo Inspiration (Collapsible) */}
            <details className="rounded-xl border border-border bg-muted/10 p-3">
              <summary className="text-xs text-muted-foreground cursor-pointer font-medium hover:text-foreground">
                Try a sample template (optional)
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
                {SAMPLE_PHOTO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className="flex flex-col text-left p-2.5 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors duration-150 min-h-[44px]"
                  >
                    <span className="text-xs font-semibold text-foreground truncate">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      {preset.category}
                    </span>
                    <span className="mt-2 text-[10px] text-primary font-medium">
                      Load Text →
                    </span>
                  </button>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* ─── State 2: Live Scanning Animation ─── */}
        {scanStep === "scanning" && (
          <div className="py-12 text-center space-y-6">
            <div className="relative mx-auto w-48 h-32 rounded-xl border border-primary/30 bg-muted/20 overflow-hidden flex items-center justify-center">
              {selectedImageSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedImageSrc}
                  alt="Document"
                  className="w-full h-full object-cover opacity-60"
                />
              ) : (
                <FileText className="h-10 w-10 text-primary/40 animate-pulse" />
              )}
              {/* Laser beam */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(var(--primary),0.5)] animate-bounce" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary animate-spin" />
                <span>Google Gemini 3.8 Flash is analyzing your document...</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Deconstructing lecture modules, calculating cognitive strain ratings, and structuring non-overlapping calendar blocks.
              </p>
            </div>
          </div>
        )}

        {/* ─── State 3: Extracted Units Review ─── */}
        {scanStep === "completed" && parsedData && (
          <div className="space-y-5 pt-3">
            {/* Subject Overview Card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3.5 w-3.5 rounded-full"
                    style={{ backgroundColor: parsedData.color_hex }}
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Course Details
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setScanStep("idle")}
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  Scan Another
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Course Name</Label>
                  <Input
                    value={subjectTitle}
                    onChange={(e) => setSubjectTitle(e.target.value)}
                    className="h-8 text-xs font-medium bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Exam Date</Label>
                  <Input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="h-8 text-xs font-medium bg-background"
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground italic pt-2 border-t border-border">
                &ldquo;{parsedData.summary}&rdquo;
              </p>
            </div>

            {/* Extracted Atomic Units Table */}
            <div>
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Topics ({editableUnits.filter((u) => u.enabled).length}/{editableUnits.length} selected)
                </span>
                <span className="text-[11px] text-muted-foreground">Choose topics to schedule</span>
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                {editableUnits.map((unit) => (
                  <div
                    key={unit.id}
                    className={cn(
                      "flex items-center justify-between p-3 transition-colors duration-150",
                      unit.enabled ? "hover:bg-muted/30" : "opacity-40 bg-muted/10"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={unit.enabled}
                        onChange={() => toggleUnit(unit.id)}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">
                          {unit.title}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {unit.estimated_minutes}m
                          </span>
                          {unit.suggested_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {unit.suggested_date} {unit.suggested_time}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <CognitiveLoadBadge load={unit.cognitive_load} size="sm" />
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase tracking-wider border-border"
                      >
                        {unit.block_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
            Cancel
          </Button>
          {scanStep === "completed" && (
            <Button
              size="sm"
              onClick={handleCommitSchedule}
              className="gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              Add to Calendar ({editableUnits.filter((u) => u.enabled).length} Topics)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <GeminiApiKeyModal
        open={geminiKeyOpen}
        onClose={() => setGeminiKeyOpen(false)}
      />
    </Dialog>
  );
}
