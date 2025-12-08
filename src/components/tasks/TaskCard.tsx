import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Briefcase } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
  isDraggable?: boolean;
}

export const TaskCard = ({ task, onDelete, isDraggable = false }: TaskCardProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
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

  const { data: sectorData } = useQuery({
    queryKey: ["position", task.setor],
    queryFn: async () => {
      if (!task.setor) return null;
      const { data, error } = await supabase
        .from("positions")
        .select("id, name")
        .eq("id", task.setor)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!task.setor,
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);
      
      if (error) {
        toast.error("Erro ao atualizar status");
        return;
      }
      
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";

  const handleTitleBlur = () => {
    if (taskTitle.trim() && taskTitle !== task.title) {
      updateTitleMutation.mutate(taskTitle.trim());
    } else {
      setIsEditingTitle(false);
      setTaskTitle(task.title);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Se é draggable, não navegar ao clicar - apenas com double click
    if (isDraggable) {
      return;
    }
    
    const target = e.target as HTMLElement;
    
    // Não navegar se clicou em elementos interativos
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('[role="menu"]') ||
      target.closest('button') ||
      target.closest('[data-radix-popper-content-wrapper]')
    ) {
      e.stopPropagation();
      return;
    }
    
    navigate(`/tasks/${task.id}`);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('[role="menu"]') ||
      target.closest('button')
    ) {
      return;
    }
    
    navigate(`/tasks/${task.id}`);
  };

  return (
    <Card 
      className={`p-3 hover:shadow-md transition-shadow ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} group`}
      onClick={handleCardClick}
      onDoubleClick={isDraggable ? handleDoubleClick : undefined}
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
              className="font-medium text-sm text-foreground flex-1"
              onDoubleClick={(e) => {
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
            <DropdownMenuTrigger asChild>
              <button 
                type="button"
                className="focus:outline-none"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <Badge 
                  variant={priorityColors[task.priority as keyof typeof priorityColors] as any}
                  className="cursor-pointer text-xs px-2 py-0 h-5 hover:opacity-80"
                >
                  {priorityLabels[task.priority as keyof typeof priorityLabels]}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="z-50 bg-popover"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenuItem onSelect={() => updatePriorityMutation.mutate("high")}>
                Alta
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => updatePriorityMutation.mutate("medium")}>
                Média
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => updatePriorityMutation.mutate("low")}>
                Baixa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                type="button"
                className="focus:outline-none"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <Badge className={`cursor-pointer text-xs px-2 py-0 h-5 hover:opacity-80 ${statusColors[task.status as keyof typeof statusColors]}`}>
                  {statusLabels[task.status as keyof typeof statusLabels]}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="z-50 bg-popover"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenuItem onSelect={() => handleStatusChange("todo")}>
                A Fazer
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleStatusChange("in_progress")}>
                Fazendo
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleStatusChange("completed")}>
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

          {sectorData && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase size={10} />
              {sectorData.name}
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
