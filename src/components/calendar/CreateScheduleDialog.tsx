"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarPlus } from "lucide-react";
import { format, setHours, setMinutes } from "date-fns";
import { toast } from "sonner";
import type { Subject, StudyUnit, BlockType } from "@/types/database";

interface CreateScheduleDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly defaultDate?: Date;
  readonly defaultHour?: number;
  readonly subjects: Subject[];
  readonly studyUnits: StudyUnit[];
  readonly onAddBlock: (data: {
    study_unit_id: string;
    start_time: string;
    end_time: string;
    block_type: BlockType;
  }) => void;
}

interface ScheduleFormProps {
  readonly defaultDate: Date;
  readonly defaultHour: number;
  readonly subjects: Subject[];
  readonly studyUnits: StudyUnit[];
  readonly onAddBlock: (data: {
    study_unit_id: string;
    start_time: string;
    end_time: string;
    block_type: BlockType;
  }) => void;
  readonly onClose: () => void;
}

function ScheduleForm({
  defaultDate,
  defaultHour,
  subjects,
  studyUnits,
  onAddBlock,
  onClose,
}: ScheduleFormProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ""
  );

  const availableUnits = useMemo(() => {
    return studyUnits.filter((u) => u.subject_id === selectedSubjectId);
  }, [studyUnits, selectedSubjectId]);

  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    availableUnits[0]?.id || ""
  );

  const [dateStr, setDateStr] = useState(format(defaultDate, "yyyy-MM-dd"));
  const [startHourStr, setStartHourStr] = useState(String(defaultHour));
  const [startMinuteStr, setStartMinuteStr] = useState("00");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [blockType, setBlockType] = useState<BlockType>("STUDY");

  // Keep selected unit in sync when subject changes
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const unitsForSubj = studyUnits.filter((u) => u.subject_id === subjectId);
    if (unitsForSubj.length > 0) {
      setSelectedUnitId(unitsForSubj[0].id);
      setDurationMinutes(String(unitsForSubj[0].estimated_minutes || 60));
    } else {
      setSelectedUnitId("");
    }
  };

  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    const unit = studyUnits.find((u) => u.id === unitId);
    if (unit) {
      setDurationMinutes(String(unit.estimated_minutes || 60));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) {
      toast.error("Please select a study unit to schedule.");
      return;
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const targetDate = new Date(year, month - 1, day);
    const start = setMinutes(
      setHours(targetDate, parseInt(startHourStr, 10)),
      parseInt(startMinuteStr, 10)
    );
    const durationMin = parseInt(durationMinutes, 10) || 60;
    const end = new Date(start.getTime() + durationMin * 60000);

    onAddBlock({
      study_unit_id: selectedUnitId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      block_type: blockType,
    });

    const unit = studyUnits.find((u) => u.id === selectedUnitId);
    toast.success("Study session scheduled!", {
      description: `"${unit?.title || "Session"}" added to ${format(start, "MMM d, h:mm a")}.`,
    });

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {/* Subject selector */}
      <div className="space-y-1.5">
        <Label htmlFor="sched-subject" className="text-xs">
          Subject
        </Label>
        <Select
          value={selectedSubjectId}
          onValueChange={(val) => {
            if (val) handleSubjectChange(val);
          }}
        >
          <SelectTrigger id="sched-subject">
            <SelectValue placeholder="Select Subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color_hex }}
                  />
                  <span>{s.title}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Study Unit selector */}
      <div className="space-y-1.5">
        <Label htmlFor="sched-unit" className="text-xs">
          Atomic Study Unit
        </Label>
        <Select
          value={selectedUnitId}
          onValueChange={(val) => {
            if (val) handleUnitChange(val);
          }}
          disabled={availableUnits.length === 0}
        >
          <SelectTrigger id="sched-unit">
            <SelectValue
              placeholder={
                availableUnits.length === 0
                  ? "No units in this subject"
                  : "Select Study Unit"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableUnits.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="truncate">{u.title}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    ({u.estimated_minutes}m · {u.cognitive_load})
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date & Start Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sched-date" className="text-xs">
            Date
          </Label>
          <Input
            id="sched-date"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sched-time" className="text-xs">
            Start Time
          </Label>
          <div className="grid grid-cols-2 gap-1.5">
            <Select
              value={startHourStr}
              onValueChange={(val) => {
                if (val) setStartHourStr(val);
              }}
            >
              <SelectTrigger id="sched-time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, "0")}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={startMinuteStr}
              onValueChange={(val) => {
                if (val) setStartMinuteStr(val);
              }}
            >
              <SelectTrigger id="sched-min">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="00">:00</SelectItem>
                <SelectItem value="15">:15</SelectItem>
                <SelectItem value="30">:30</SelectItem>
                <SelectItem value="45">:45</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Duration & Block Type */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sched-duration" className="text-xs">
            Duration
          </Label>
          <Select
            value={durationMinutes}
            onValueChange={(val) => {
              if (val) setDurationMinutes(val);
            }}
          >
            <SelectTrigger id="sched-duration">
              <SelectValue />
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
          <Label htmlFor="sched-type" className="text-xs">
            Session Type
          </Label>
          <Select
            value={blockType}
            onValueChange={(v) => {
              if (v) setBlockType(v as BlockType);
            }}
          >
            <SelectTrigger id="sched-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STUDY">Study Session</SelectItem>
              <SelectItem value="REVIEW">SM-2 Review Block</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter className="pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" className="gap-1.5">
          <CalendarPlus className="h-3.5 w-3.5" />
          Add to Calendar
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreateScheduleDialog({
  open,
  onClose,
  defaultDate = new Date(),
  defaultHour = 9,
  subjects,
  studyUnits,
  onAddBlock,
}: CreateScheduleDialogProps) {
  const formKey = `${defaultDate.toISOString()}-${defaultHour}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md border-border/40 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Schedule Study Session
          </DialogTitle>
          <DialogDescription>
            Place an atomic study unit or review block into your calendar.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <ScheduleForm
            key={formKey}
            defaultDate={defaultDate}
            defaultHour={defaultHour}
            subjects={subjects}
            studyUnits={studyUnits}
            onAddBlock={onAddBlock}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
