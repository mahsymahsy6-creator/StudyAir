"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useStudyStore } from "@/stores/studyStore";
import { SubjectList } from "@/components/subjects/SubjectList";
import { StudyUnitTable } from "@/components/subjects/StudyUnitTable";

const ImportExportDialog = dynamic(
  () =>
    import("@/components/subjects/ImportExportDialog").then(
      (m) => m.ImportExportDialog
    ),
  { ssr: false }
);

const AIPhotoScheduleDialog = dynamic(
  () =>
    import("@/components/ai/AIPhotoScheduleDialog").then(
      (m) => m.AIPhotoScheduleDialog
    ),
  { ssr: false }
);
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBJECT_COLORS } from "@/data/mockData";
import { toast } from "sonner";
import {
  BookOpen,
  CalendarDays,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Brain,
  Download,
  Camera,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { useCurrentDate } from "@/lib/hooks/useMounted";
import type { CognitiveLoad } from "@/types/database";

export default function SubjectsPage() {
  const today = useCurrentDate();
  const subjects = useStudyStore((state) => state.subjects);
  const studyUnits = useStudyStore((state) => state.studyUnits);

  const subjectsWithUnits = useMemo(() => {
    return subjects.map((subj) => {
      const units = studyUnits.filter((u) => u.subject_id === subj.id);
      const completed_count = units.filter((u) => u.is_completed).length;
      return {
        ...subj,
        units,
        study_units: units,
        completed_count,
        total_count: units.length,
      };
    });
  }, [subjects, studyUnits]);
  const addSubject = useStudyStore((state) => state.addSubject);
  const deleteSubject = useStudyStore((state) => state.deleteSubject);
  const addStudyUnit = useStudyStore((state) => state.addStudyUnit);
  const deleteStudyUnit = useStudyStore((state) => state.deleteStudyUnit);
  const toggleStudyUnitCompletion = useStudyStore(
    (state) => state.toggleStudyUnitCompletion
  );
  const rescheduleAll = useStudyStore((state) => state.rescheduleAll);
  const importSyllabus = useStudyStore((state) => state.importSyllabus);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    subjectsWithUnits[0]?.id ?? null
  );

  // Dialog states
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [aiPhotoOpen, setAiPhotoOpen] = useState(false);
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState("");
  const [newSubjectExamDate, setNewSubjectExamDate] = useState(
    format(addDays(new Date(), 21), "yyyy-MM-dd")
  );
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0]);

  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState("");
  const [newUnitDuration, setNewUnitDuration] = useState("60");
  const [newUnitLoad, setNewUnitLoad] = useState<CognitiveLoad>("MEDIUM");

  const currentSubject = subjectsWithUnits.find(
    (s) => s.id === selectedSubjectId
  );

  // Handlers
  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectTitle.trim()) return;

    const created = addSubject({
      title: newSubjectTitle.trim(),
      exam_date: newSubjectExamDate,
      color_hex: newSubjectColor,
    });

    toast.success("Subject created", {
      description: `"${created.title}" added to your syllabus.`,
    });

    setSelectedSubjectId(created.id);
    setNewSubjectTitle("");
    setAddSubjectOpen(false);
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !newUnitTitle.trim()) return;

    const duration = parseInt(newUnitDuration) || 60;
    addStudyUnit({
      subject_id: selectedSubjectId,
      title: newUnitTitle.trim(),
      estimated_minutes: duration,
      cognitive_load: newUnitLoad,
    });

    toast.success("Topic added", {
      description: `"${newUnitTitle.trim()}" (${duration}m, ${newUnitLoad.toLowerCase()} difficulty)`,
    });

    setNewUnitTitle("");
    setNewUnitDuration("60");
    setNewUnitLoad("MEDIUM");
    setAddUnitOpen(false);
  };

  const handleAutoReschedule = () => {
    const res = rescheduleAll(240);
    if (res.count > 0) {
      toast.success(`Rescheduled ${res.count} topics!`, {
        description:
          "Topics distributed across available slots before the exam date.",
      });
    } else if (res.overflowCount > 0) {
      toast.warning("Capacity warning", {
        description: `${res.overflowCount} units could not fit before the exam date. Consider increasing daily study time.`,
      });
    } else {
      toast.info("All units already scheduled", {
        description: "Your calendar already has slots for all pending units.",
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border bg-card/40 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Courses & Topics
            </h1>
            <p className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
              Manage your subjects and track what to study next.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setAiPhotoOpen(true)}
            className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Camera className="h-3.5 w-3.5" />
            Scan with AI
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setImportExportOpen(true)}
            className="h-8 gap-1.5 rounded-lg px-2.5 text-xs border-border hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" />
            Import
          </Button>
          <Button
            size="sm"
            onClick={handleAutoReschedule}
            className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Auto-Schedule
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddSubjectOpen(true)}
            className="h-8 gap-1.5 rounded-lg px-2.5 text-xs border-border hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" />
            New Course
          </Button>
        </div>
      </div>

      {/* ─── Responsive Two-Column Layout ─── */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left: Subjects Master List */}
        <div className="w-full md:w-80 lg:w-88 border-b md:border-b-0 md:border-r border-border overflow-y-auto max-h-48 md:max-h-none shrink-0 p-4 sm:p-5 bg-card/20">
          <SubjectList
            subjects={subjectsWithUnits}
            selectedSubjectId={selectedSubjectId}
            onSelectSubject={setSelectedSubjectId}
            onAddSubject={() => setAddSubjectOpen(true)}
          />
        </div>

        {/* Right: Selected Subject & Atomic Units */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
          {currentSubject ? (
            <div className="max-w-4xl space-y-6">
              {/* Subject Detail Card */}
              <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-none">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-5 w-5 rounded-md shadow-sm"
                      style={{ backgroundColor: currentSubject.color_hex }}
                    />
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-foreground">
                        {currentSubject.title}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span suppressHydrationWarning className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Exam: {format(new Date(currentSubject.exam_date), "MMM d, yyyy")} (
                          {differenceInDays(
                            new Date(currentSubject.exam_date),
                            today
                          )}{" "}
                          days left)
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {Math.round(currentSubject.total_estimated_minutes / 60)}h total
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setAddUnitOpen(true)}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Topic
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete course "${currentSubject.title}" and its topics?`
                          )
                        ) {
                          deleteSubject(currentSubject.id);
                          setSelectedSubjectId(null);
                        }
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      aria-label="Delete course"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress breakdown */}
                <div className="grid grid-cols-3 gap-3 pt-4 text-center">
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="text-lg font-bold text-foreground">
                      {currentSubject.units.length}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Total Topics
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="text-lg font-bold text-success">
                      {currentSubject.completed_count}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Completed
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="text-lg font-bold text-primary">
                      {currentSubject.units.length > 0
                        ? Math.round(
                            (currentSubject.completed_count /
                              currentSubject.units.length) *
                              100
                          )
                        : 0}
                      %
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Progress
                    </div>
                  </div>
                </div>
              </div>

              {/* Units Table */}
              <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-none">
                <StudyUnitTable
                  units={currentSubject.units}
                  subjectTitle={currentSubject.title}
                  subjectColor={currentSubject.color_hex}
                  onToggleComplete={toggleStudyUnitCompletion}
                  onDelete={deleteStudyUnit}
                  onAddUnit={() => setAddUnitOpen(true)}
                />
              </div>
            </div>
          ) : (
            <div className="empty-state rounded-2xl border border-dashed border-border h-64 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No course selected</p>
                <p className="text-xs text-muted-foreground">Select a course from the sidebar or create a new one</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddSubjectOpen(true)}
                className="mt-2 text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Course
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Add Subject Dialog ─── */}
      <Dialog open={addSubjectOpen} onOpenChange={setAddSubjectOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <form onSubmit={handleCreateSubject}>
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
              <DialogDescription className="text-xs">
                Set up a course, exam date, and color to track in your calendar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="subj-title" className="text-xs">
                  Subject Title
                </Label>
                <Input
                  id="subj-title"
                  placeholder="e.g. Molecular Biology, Macroeconomics"
                  value={newSubjectTitle}
                  onChange={(e) => setNewSubjectTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exam-date" className="text-xs">
                  Target Exam Date
                </Label>
                <Input
                  id="exam-date"
                  type="date"
                  value={newSubjectExamDate}
                  onChange={(e) => setNewSubjectExamDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Theme Color</Label>
                <div className="flex items-center gap-2 pt-1">
                  {SUBJECT_COLORS.map((hex) => (
                    <button
                      type="button"
                      key={hex}
                      onClick={() => setNewSubjectColor(hex)}
                      className="h-6 w-6 rounded-full border border-black/20 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: hex,
                        boxShadow:
                          newSubjectColor === hex
                            ? "0 0 0 2px var(--background), 0 0 0 4px " + hex
                            : "none",
                      }}
                      aria-label={`Color ${hex}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddSubjectOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Create Subject
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Add Topic Dialog ─── */}
      <Dialog open={addUnitOpen} onOpenChange={setAddUnitOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <form onSubmit={handleCreateUnit}>
            <DialogHeader>
              <DialogTitle>Add Study Topic</DialogTitle>
              <DialogDescription className="text-xs">
                Add a topic to this course with duration and difficulty.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="unit-title" className="text-xs">
                  Topic Name
                </Label>
                <Input
                  id="unit-title"
                  placeholder="e.g. Cellular Respiration, Taylor Polynomials"
                  value={newUnitTitle}
                  onChange={(e) => setNewUnitTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="duration" className="text-xs">
                    Estimated Duration
                  </Label>
                  <Select
                    value={newUnitDuration}
                    onValueChange={(val) => {
                      if (val) setNewUnitDuration(val);
                    }}
                  >
                    <SelectTrigger id="duration">
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes (1 hr)</SelectItem>
                      <SelectItem value="75">75 minutes</SelectItem>
                      <SelectItem value="90">90 minutes (1.5 hr)</SelectItem>
                      <SelectItem value="120">120 minutes (2 hr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cog-load" className="text-xs flex items-center gap-1">
                    <Brain className="h-3 w-3 text-primary" />
                    Difficulty
                  </Label>
                  <Select
                    value={newUnitLoad}
                    onValueChange={(v) => {
                      if (v) setNewUnitLoad(v as CognitiveLoad);
                    }}
                  >
                    <SelectTrigger id="cog-load">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Easy (Review / Light)</SelectItem>
                      <SelectItem value="MEDIUM">Medium (Standard)</SelectItem>
                      <SelectItem value="HIGH">Hard (Heavy / Challenging)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddUnitOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Topic
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ImportExportDialog
        open={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        subjects={subjects}
        studyUnits={studyUnits}
        onImport={importSyllabus}
      />

      <AIPhotoScheduleDialog
        open={aiPhotoOpen}
        onClose={() => setAiPhotoOpen(false)}
      />
    </div>
  );
}
