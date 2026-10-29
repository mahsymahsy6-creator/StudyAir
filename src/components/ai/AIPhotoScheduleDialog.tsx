"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import {
  Sparkles,
  Upload,
  Camera,
  FileImage,
  CheckCircle2,
  Calendar,
  Clock,
  Brain,
  RotateCcw,
  Trash2,
  Plus,
  ArrowRight,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { soundFX } from "@/lib/sound";
import { useStudyStore } from "@/stores/studyStore";
import {
  SAMPLE_PHOTO_PRESETS,
  parsePhotoSchedule,
  type ParsedSyllabusResult,
  type ParsedStudyUnit,
} from "@/lib/engine/ai-vision-parser";
import { CognitiveLoadBadge } from "@/components/shared/CognitiveLoadBadge";
import { cn } from "@/lib/utils";

interface AIPhotoScheduleDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onScheduleCompleted?: () => void;
}

type ScanStep = "idle" | "scanning" | "completed";

export function AIPhotoScheduleDialog({
  open,
  onClose,
  onScheduleCompleted,
}: AIPhotoScheduleDialogProps) {
  const addSubject = useStudyStore((state) => state.addSubject);
  const addStudyUnit = useStudyStore((state) => state.addStudyUnit);
  const addBlock = useStudyStore((state) => state.addBlock);

  const [scanStep, setScanStep] = useState<ScanStep>("idle");
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParsedSyllabusResult | null>(null);
  const [editableUnits, setEditableUnits] = useState<
    (ParsedStudyUnit & { enabled: boolean })[]
  >([]);
  const [subjectTitle, setSubjectTitle] = useState("");
  const [examDate, setExamDate] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open/close
  useEffect(() => {
    if (!open) {
      setScanStep("idle");
      setSelectedImageSrc(null);
      setParsedData(null);
      setEditableUnits([]);
    }
  }, [open]);

  // Handle parsing execution
  const processImage = useCallback(async (fileOrPreset: File | string, fileName?: string) => {
    setScanStep("scanning");
    try {
      soundFX.playClick();
      const result = await parsePhotoSchedule(fileOrPreset, fileName);
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
    } catch {
      toast.error("Vision AI extraction failed", {
        description: "Could not parse document structure. Please try another image.",
      });
      setScanStep("idle");
    }
  }, []);

  // Handle file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImageSrc(event.target?.result as string);
      processImage(file, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Handle sample preset click
  const handlePresetClick = (presetId: string) => {
    const preset = SAMPLE_PHOTO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedFileName(preset.name);
    setSelectedImageSrc(preset.thumbnail_data_uri);
    processImage(presetId, preset.name);
  };

  // Toggle unit on/off
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
      total_estimated_minutes: enabledUnits.reduce(
        (sum, u) => sum + u.estimated_minutes,
        0
      ),
    });

    let scheduledCount = 0;

    // 2. Add units and schedule blocks
    for (const unit of enabledUnits) {
      const createdUnit = addStudyUnit(createdSubject.id, {
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

    toast.success("AI Ingestion Complete!", {
      description: `Added "${createdSubject.title}" with ${enabledUnits.length} units (${scheduledCount} blocks placed on calendar).`,
    });

    onScheduleCompleted?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-border/40 bg-card/95 backdrop-blur-2xl p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-blue-500 to-indigo-600 shadow-md shadow-primary/20 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                AI Photo-to-Schedule Ingestion
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                  Vision AI
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Scan or photograph any syllabus, timetable, or notes to automatically extract study units and calendar slots.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ─── State 1: Upload / Choose Preset ─── */}
        {scanStep === "idle" && (
          <div className="space-y-6 pt-4">
            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 p-8 text-center transition-all hover:border-primary/60 hover:bg-primary/[0.03]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Upload className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                Click to upload syllabus or drag & drop photo
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports photos of course schedules, exam dates, handwritten notes (PNG, JPG, WEBP)
              </p>
            </div>

            {/* Quick Presets */}
            <div>
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Or Test With Sample Documents
                </span>
                <span className="text-[11px] text-muted-foreground">1-Click Instant Demo</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SAMPLE_PHOTO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset.id)}
                    className="flex flex-col text-left p-3.5 rounded-xl border border-border/30 bg-card/40 transition-all hover:bg-card hover:border-primary/50 hover:shadow-md"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <FileImage className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{preset.name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                      {preset.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-primary font-medium">
                      <span>{preset.category}</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── State 2: Scanning Laser Animation ─── */}
        {scanStep === "scanning" && (
          <div className="py-12 text-center space-y-6">
            <div className="relative mx-auto w-48 h-32 rounded-xl border border-primary/40 bg-muted/20 overflow-hidden flex items-center justify-center shadow-lg shadow-primary/10">
              {selectedImageSrc ? (
                <img
                  src={selectedImageSrc}
                  alt="Scanned Syllabus"
                  className="w-full h-full object-cover opacity-60"
                />
              ) : (
                <Camera className="h-10 w-10 text-primary/40 animate-pulse" />
              )}
              {/* Laser beam */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-bounce" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-cyan-400 animate-spin" />
                <span>Analyzing document with Multimodal Vision AI...</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Deconstructing syllabus hierarchy, extracting lecture modules, evaluating cognitive load, and calculating time slots.
              </p>
            </div>
          </div>
        )}

        {/* ─── State 3: Completed Extraction & Review ─── */}
        {scanStep === "completed" && parsedData && (
          <div className="space-y-5 pt-3">
            {/* Top Insight Card */}
            <div className="p-4 rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] font-semibold">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {Math.round(parsedData.confidence_score * 100)}% AI Confidence
                  </Badge>
                  <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                    from {selectedFileName}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScanStep("idle")}
                  className="h-7 text-xs text-muted-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Scan Another
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Subject Title</Label>
                  <Input
                    value={subjectTitle}
                    onChange={(e) => setSubjectTitle(e.target.value)}
                    className="h-8 text-xs font-medium bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Target Exam Date</Label>
                  <Input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="h-8 text-xs font-medium bg-background"
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground/90 italic pt-1 border-t border-border/20">
                &ldquo;{parsedData.summary}&rdquo;
              </p>
            </div>

            {/* Extracted Atomic Units Table */}
            <div>
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Extracted Study Units ({editableUnits.filter((u) => u.enabled).length}/{editableUnits.length} active)
                </span>
                <span className="text-[11px] text-muted-foreground">Toggle or adjust before import</span>
              </div>

              <div className="rounded-xl border border-border/30 bg-card/30 overflow-hidden divide-y divide-border/20">
                {editableUnits.map((unit) => (
                  <div
                    key={unit.id}
                    className={cn(
                      "flex items-center justify-between p-3 transition-colors",
                      unit.enabled ? "hover:bg-muted/15" : "opacity-40 bg-muted/5"
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
                        className="text-[9px] uppercase tracking-wider border-border/40"
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

        <DialogFooter className="pt-3 border-t border-border/30">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          {scanStep === "completed" && (
            <Button
              size="sm"
              onClick={handleCommitSchedule}
              className="gap-1.5 text-xs font-medium shadow-md bg-gradient-to-r from-primary to-blue-600 text-white hover:opacity-95"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              Import & Auto-Schedule ({editableUnits.filter((u) => u.enabled).length} Units)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
