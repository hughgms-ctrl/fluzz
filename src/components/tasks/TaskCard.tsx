import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface TaskCardProps {
  task: any;
  onDelete: () => void;
  onStatusChange?: (status: string) => void;
}

export const TaskCard = ({ task, onDelete, onStatusChange }: TaskCardProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [taskTitle, setTaskTitle] = useState(task.title);

  const { data: subtasks } = useQuery({
    queryKey: ["subtasks", task.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subtasks")
        .select("*")
        .eq("task_id", task.id);
      if (error) throw error;
      return data;
    },
  });

  const totalSubtasks = subtasks?.length || 0;
  const completedSubtasks = subtasks?.filter((s) => s.completed).length || 0;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const priorityColors = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  };

  const priorityLabels = {
    high: "Alta",
    medium: "Média",
    low: "Baixa",
  };

  const statusLabels = {
    todo: "A Fazer",
    in_progress: "Fazendo",
    completed: "Concluído",
  };

  const statusColors = {
    todo: "bg-status-todo text-status-todo-foreground",
    in_progress: "bg-status-in-progress text-status-in-progress-foreground",
    completed: "bg-status-completed text-status-completed-foreground",
  };

  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ title: newTitle })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Título atualizado!");
      setIsEditingTitle(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar título");
      setTaskTitle(task.title);
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (priority: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ priority })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Prioridade atualizada!");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      toast.success("Status atualizado!");
    },
  });

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";

  const handleTitleBlur = () => {
    if (taskTitle.trim() && taskTitle !== task.title) {
      updateTitleMutation.mutate(taskTitle.trim());
    } else {
      setIsEditingTitle(false);
      setTaskTitle(task.title);
    }
  };

  return (
    <Card 
      className="p-3 hover:shadow-md transition-shadow cursor-pointer group" 
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          {isEditingTitle ? (
            <Input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleBlur();
                if (e.key === "Escape") {
                  setTaskTitle(task.title);
                  setIsEditingTitle(false);
                }
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-sm h-7 flex-1"
              autoFocus
            />
          ) : (
            <h3 
              className="font-medium text-sm text-foreground hover:text-primary transition-colors flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
            >
              {task.title}
            </h3>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Badge 
                variant={priorityColors[task.priority as keyof typeof priorityColors] as any}
                className="cursor-pointer text-xs px-2 py-0 h-5"
              >
                {priorityLabels[task.priority as keyof typeof priorityLabels]}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-50 bg-popover">
              <DropdownMenuItem onClick={() => updatePriorityMutation.mutate("high")}>
                Alta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updatePriorityMutation.mutate("medium")}>
                Média
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updatePriorityMutation.mutate("low")}>
                Baixa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Badge className={`cursor-pointer text-xs px-2 py-0 h-5 ${statusColors[task.status as keyof typeof statusColors]}`}>
                {statusLabels[task.status as keyof typeof statusLabels]}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-50 bg-popover">
              <DropdownMenuItem onClick={() => {
                if (onStatusChange) onStatusChange("todo");
                else updateStatusMutation.mutate("todo");
              }}>
                A Fazer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (onStatusChange) onStatusChange("in_progress");
                else updateStatusMutation.mutate("in_progress");
              }}>
                Fazendo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (onStatusChange) onStatusChange("completed");
                else updateStatusMutation.mutate("completed");
              }}>
                Concluído
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {task.due_date && (
            <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
              <Calendar size={10} />
              {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
            </div>
          )}
        </div>

        {totalSubtasks > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1.5 flex-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {completedSubtasks}/{totalSubtasks}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};