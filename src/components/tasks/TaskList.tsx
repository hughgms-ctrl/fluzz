import { TaskCard } from "./TaskCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDownAZ, GripVertical } from "lucide-react";

interface TaskListProps {
  tasks: any[];
  onDeleteTask: (taskId: string) => void;
  onUpdateOrder?: (taskId: string, newOrder: number) => void;
  sortMode?: "manual" | "az";
  onSortModeChange?: (mode: "manual" | "az") => void;
}

// Natural sort function - recognizes numbers in strings
const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
};

export const TaskList = ({ 
  tasks, 
  onDeleteTask, 
  onUpdateOrder,
  sortMode = "az", // Default to A-Z
  onSortModeChange
}: TaskListProps) => {
  // Sort tasks based on mode
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortMode === "az") {
      return naturalSort(a.title, b.title);
    }
    // Manual order - sort by task_order
    return (a.task_order || 0) - (b.task_order || 0);
  });

  return (
    <div className="space-y-4">
      {/* Sort Toggle - only show if onSortModeChange is provided */}
      {onSortModeChange && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortModeChange(sortMode === "manual" ? "az" : "manual")}
            className="gap-2"
          >
            {sortMode === "az" ? (
              <>
                <ArrowDownAZ size={16} />
                A-Z
              </>
            ) : (
              <>
                <GripVertical size={16} />
                Manual
              </>
            )}
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-3">
          <div className="space-y-2">
            {sortedTasks.length > 0 ? (
              sortedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDelete={() => onDeleteTask(task.id)}
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma tarefa encontrada
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};