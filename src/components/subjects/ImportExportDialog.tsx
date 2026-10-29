"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Download,
  Upload,
  BookOpen,
  Sparkles,
  Copy,
  Check,
  FileCode,
} from "lucide-react";
import { SAMPLE_COURSES, generateCourseData } from "@/data/sampleCourses";
import type { Subject, StudyUnit } from "@/types/database";

interface ImportExportDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly subjects: Subject[];
  readonly studyUnits: StudyUnit[];
  readonly onImport: (data: {
    subjects: Subject[];
    studyUnits: StudyUnit[];
  }) => void;
}

export function ImportExportDialog({
  open,
  onClose,
  subjects,
  studyUnits,
  onImport,
}: ImportExportDialogProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [copied, setCopied] = useState(false);

  const exportPayload = JSON.stringify(
    {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      subjects,
      studyUnits,
    },
    null,
    2
  );

  const handleDownload = () => {
    try {
      const blob = new Blob([exportPayload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studyair-syllabus-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Syllabus exported successfully!");
    } catch {
      toast.error("Failed to export syllabus file.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportPayload);
      setCopied(true);
      toast.success("JSON copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy JSON.");
    }
  };

  const handleImportText = () => {
    try {
      if (!jsonInput.trim()) {
        toast.error("Please paste valid JSON data.");
        return;
      }
      const parsed = JSON.parse(jsonInput);
      if (!parsed.subjects || !parsed.studyUnits) {
        toast.error("Invalid format: JSON must contain 'subjects' and 'studyUnits' arrays.");
        return;
      }
      onImport({
        subjects: parsed.subjects,
        studyUnits: parsed.studyUnits,
      });
      toast.success(`Imported ${parsed.subjects.length} subjects and ${parsed.studyUnits.length} study units!`);
      setJsonInput("");
      onClose();
    } catch {
      toast.error("Invalid JSON syntax. Please check the pasted text.");
    }
  };

  const handleLoadSample = (course: (typeof SAMPLE_COURSES)[0]) => {
    const { subject, units } = generateCourseData(course);
    onImport({
      subjects: [subject],
      studyUnits: units,
    });
    toast.success(`Loaded "${course.name}" curriculum!`, {
      description: `${units.length} atomic study units created with target exam in ${course.daysUntilExam} days.`,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl border-border/40 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Curriculum Templates & Data Portability
          </DialogTitle>
          <DialogDescription>
            Import syllabus templates, backup your study units, or paste custom course JSON.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="templates" className="pt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates" className="text-xs">
              Sample Templates
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs">
              Export Syllabus
            </TabsTrigger>
            <TabsTrigger value="import" className="text-xs">
              Import JSON
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Sample Templates */}
          <TabsContent value="templates" className="space-y-4 pt-4">
            <p className="text-xs text-muted-foreground">
              Select a pre-configured university syllabus with estimated durations and cognitive load weights:
            </p>

            <div className="space-y-3">
              {SAMPLE_COURSES.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 p-3.5 transition-colors hover:border-border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: course.color }}
                      />
                      <span className="text-sm font-semibold text-foreground">
                        {course.name}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {course.units.length} units
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {course.description}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleLoadSample(course)}
                    className="h-8 gap-1.5 text-xs self-end sm:self-center shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    Load Curriculum
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tab 2: Export Syllabus */}
          <TabsContent value="export" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Export Current Syllabus</p>
                <p className="text-xs text-muted-foreground">
                  {subjects.length} subjects • {studyUnits.length} atomic units
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="h-8 gap-1.5 text-xs"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy JSON"}
                </Button>
                <Button
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download .json
                </Button>
              </div>
            </div>

            <Textarea
              readOnly
              value={exportPayload}
              rows={9}
              className="font-mono text-xs text-muted-foreground bg-muted/30"
            />
          </TabsContent>

          {/* Tab 3: Import JSON */}
          <TabsContent value="import" className="space-y-4 pt-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Paste valid JSON containing subjects and studyUnits:
              </p>
            </div>

            <Textarea
              placeholder='{\n  "subjects": [...],\n  "studyUnits": [...]\n}'
              value={jsonInput}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setJsonInput(e.target.value)
              }
              rows={8}
              className="font-mono text-xs"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <FileCode className="h-3.5 w-3.5" />
                Existing items will be preserved and duplicates skipped.
              </span>

              <Button
                size="sm"
                onClick={handleImportText}
                className="h-8 gap-1.5 text-xs"
              >
                <Upload className="h-3.5 w-3.5" />
                Import Syllabus
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
