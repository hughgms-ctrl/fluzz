import { useState } from "react";
import { Check, Calendar, Flag, User, ChevronRight } from "lucide-react";
import { cn, formatDateBR, isTaskOverdue, isTaskDueSoon } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface FocusModeTaskItemProps {
  task: any;
  profiles: any[];
  onClick: () => void;
  queryKeyToInvalidate?: string[];
}

const priorityColors = {
  high: "border-destructive bg-destructive/10",
  medium: "border-warning bg-warning/10", 
  low: "border-info bg-info/10",
};

const priorityBorderColors = {
  high: "border-destructive",
  medium: "border-warning",
  low: "border-info",
};

export function FocusModeTaskItem({ 
  task, 
  profiles, 
  onClick,
  queryKeyToInvalidate = ["my-tasks", "tasks"]
}: FocusModeTaskItemProps) {
  const queryClient = useQueryClient();
  const [isCompleting, setIsCompleting] = useState(false);
  
  const isCompleted = task.status === "completed";
  const isOverdue = isTaskOverdue(task.due_date, task.status);
  const isDueSoon = isTaskDueSoon(task.due_date, task.status);
  
  // Get first assignee for display
  const taskAssignees = task.task_assignees || [];
  const firstAssignee = taskAssignees.length > 0 
    ? profiles?.find(p => p.id === taskAssignees[0].user_id)
    : null;

  const handleCheckClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCompleting(true);
    
    const newStatus = isCompleted ? "todo" : "completed";
    
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);
      
      if (error) throw error;
      
      queryKeyToInvalidate.forEach(key => 
        queryClient.invalidateQueries({ queryKey: [key] })
      );
      
      toast.success(newStatus === "completed" ? "Tarefa concluída!" : "Tarefa reaberta");
    } catch (error) {
      toast.error("Erro ao atualizar tarefa");
    } finally {
      setIsCompleting(false);
    }
  };

  const priorityLevel = task.priority || "medium";

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-start gap-3 p-3 sm:p-4 rounded-lg border bg-card transition-all duration-200 cursor-pointer",
        "hover:bg-accent/30 hover:border-accent",
        isCompleted && "opacity-60"
      )}
    >
      {/* Circular Checkbox */}
      <button
        onClick={handleCheckClick}
        disabled={isCompleting}
        className={cn(
          "flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 transition-all duration-200",
          "flex items-center justify-center",
          isCompleted 
            ? "bg-primary border-primary" 
            : cn(
                "border-muted-foreground/40 hover:border-primary",
                priorityBorderColors[priorityLevel as keyof typeof priorityBorderColors]
              ),
          isCompleting && "animate-pulse"
        )}
      >
        {isCompleted && (
          <Check className="h-3 w-3 text-primary-foreground" />
        )}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Title */}
        <p className={cn(
          "font-medium text-sm sm:text-base leading-snug line-clamp-2",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>

        {/* Metadata Row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {/* Project Name */}
          {task.projects?.name && (
            <span className="flex items-center gap-1 text-muted-foreground/80">
              <span 
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ 
                  backgroundColor: task.projects?.color 
                    ? `hsl(var(--chart-${['blue', 'emerald', 'amber', 'purple', 'pink'].indexOf(task.projects.color) + 1 || 1}))` 
                    : 'hsl(var(--primary))' 
                }}
              />
              <span className="truncate max-w-[120px]">{task.projects.name}</span>
            </span>
          )}

          {/* Due Date */}
          {task.due_date && (
            <span className={cn(
              "flex items-center gap-1",
              isOverdue && "text-destructive font-medium",
              isDueSoon && !isOverdue && "text-amber-500"
            )}>
              <Calendar className="h-3 w-3" />
              {formatDateBR(task.due_date).slice(0, 5)}
            </span>
          )}

          {/* Priority Badge */}
          <span className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
            priorityLevel === "high" && "bg-destructive/10 text-destructive",
            priorityLevel === "medium" && "bg-warning/10 text-warning",
            priorityLevel === "low" && "bg-info/10 text-info"
          )}>
            <Flag className="h-2.5 w-2.5" />
            {priorityLevel === "high" ? "Alta" : priorityLevel === "medium" ? "Média" : "Baixa"}
          </span>

          {/* Assignee */}
          {firstAssignee && (
            <span className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={firstAssignee.avatar_url} />
                <AvatarFallback className="text-[8px] bg-primary/10">
                  {firstAssignee.full_name?.charAt(0)?.toUpperCase() || <User className="h-2 w-2" />}
                </AvatarFallback>
              </Avatar>
              {taskAssignees.length > 1 && (
                <span className="text-[10px]">+{taskAssignees.length - 1}</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Arrow Indicator */}
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0 mt-1" />
    </div>
  );
}
