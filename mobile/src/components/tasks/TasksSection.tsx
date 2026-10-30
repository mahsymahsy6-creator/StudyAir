import React from "react";
import { TasksScreen } from "../../screens/TasksScreen";
import { Task } from "../../types";

export interface TasksSectionProps {
  onOpenAddTask?: () => void;
  onOpenBatchCapture?: () => void;
  onStartFocusForTask?: (task: Task) => void;
}

export function TasksSection({ onOpenAddTask, onStartFocusForTask }: TasksSectionProps) {
  return (
    <TasksScreen
      onStartFocusForTask={onStartFocusForTask}
    />
  );
}

export { TasksScreen };
