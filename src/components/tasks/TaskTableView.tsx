import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ArrowDownAZ, 
  GripVertical, 
  User,
} from "lucide-react";
import { formatDateBR, isTaskOverdue, isTaskDueSoon } from "@/lib/utils";
import { toast } from "sonner";
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  PointerSensor, 
  TouchSensor,
  useSensor, 
  useSensors, 
  closestCenter,
} from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskTableViewProps {
  tasks: any[];
  onDeleteTask: (taskId: string) => void;
  onUpdateOrder?: (taskId: string, newOrder: number) => void;
  sortMode?: "manual" | "az";
  onSortModeChange?: (mode: "manual" | "az") => void;
}

const statusConfig = {
  todo: { 
    label: "Parado", 
    className: "bg-status-todo text-status-todo-foreground hover:bg-status-todo/90" 
  },
  in_progress: { 
    label: "Em progresso", 
    className: "bg-status-in-progress text-status-in-progress-foreground hover:bg-status-in-progress/90" 
  },
  completed: { 
    label: "Feito", 
    className: "bg-status-completed text-status-completed-foreground hover:bg-status-completed/90" 
  },
};

const priorityConfig = {
  high: { label: "Alta", className: "bg-destructive text-destructive-foreground" },
  medium: { label: "Média", className: "bg-warning text-warning-foreground" },
  low: { label: "Baixa", className: "bg-muted text-muted-foreground" },
};

// Natural sort function
const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
};

function SortableTableRow({ 
  task, 
  onStatusChange, 
  sortMode,
  assignedUser,
  subtaskProgress,
  onNavigate,
}: { 
  task: any; 
  onStatusChange: (taskId: string, status: string) => void;
  sortMode: "manual" | "az";
  assignedUser: any;
  subtaskProgress: { completed: number; total: number };
  onNavigate: (taskId: string) => void;
}) {
  const queryClient = useQueryClient();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    disabled: sortMode === "az",
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
  const progress = subtaskProgress.total > 0 
    ? Math.round((subtaskProgress.completed / subtaskProgress.total) * 100) 
    : 0;

  const isOverdue = isTaskOverdue(task.due_date, task.status);
  const isDueSoon = isTaskDueSoon(task.due_date, task.status);

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={`group hover:bg-muted/50 ${sortMode === "manual" ? "cursor-grab active:cursor-grabbing" : ""}`}
      {...(sortMode === "manual" ? { ...attributes, ...listeners } : {})}
    >
      {/* Checkbox column */}
      <TableCell className="w-10 px-3">
        <div className="flex items-center gap-2">
          {sortMode === "manual" && (
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
          <input 
            type="checkbox" 
            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </TableCell>

      {/* Title column */}
      <TableCell 
        className="font-medium cursor-pointer hover:text-primary transition-colors min-w-[200px]"
        onClick={() => onNavigate(task.id)}
      >
        <span className="line-clamp-1">{task.title}</span>
      </TableCell>

      {/* Person column */}
      <TableCell className="w-[100px]">
        <div className="flex justify-center">
          {assignedUser ? (
            <Avatar className="h-7 w-7">
              <AvatarImage src={assignedUser.avatar_url} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {assignedUser.full_name?.charAt(0)?.toUpperCase() || <User className="h-3 w-3" />}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-muted">
                <User className="h-3 w-3 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </TableCell>

      {/* Status column */}
      <TableCell className="w-[140px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className={`w-full px-3 py-1.5 text-sm font-medium rounded-sm text-center transition-all ${status.className}`}
              onClick={(e) => e.stopPropagation()}
            >
              {status.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[120px]">
            {Object.entries(statusConfig).map(([key, config]) => (
              <DropdownMenuItem 
                key={key} 
                onSelect={() => onStatusChange(task.id, key)}
                className="justify-center"
              >
                <span className={`px-3 py-1 rounded-sm text-sm font-medium ${config.className}`}>
                  {config.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      {/* Date column */}
      <TableCell className="w-[100px] text-center">
        {task.due_date ? (
          <span className={`text-sm ${
            isOverdue 
              ? "text-destructive font-medium" 
              : isDueSoon 
                ? "text-amber-500 dark:text-amber-400" 
                : "text-muted-foreground"
          }`}>
            {formatDateBR(task.due_date).slice(0, 5)}
          </span>
        ) : (
          <span className="text-muted-foreground/50">-</span>
        )}
      </TableCell>

      {/* Progress column */}
      <TableCell className="w-[140px]">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 rounded-full ${
                progress === 100 
                  ? "bg-status-completed" 
                  : progress > 0 
                    ? "bg-primary" 
                    : "bg-transparent"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={`text-xs min-w-[35px] text-right ${
            progress === 100 
              ? "text-status-completed font-medium" 
              : "text-muted-foreground"
          }`}>
            {progress}%
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function TaskTableView({ 
  tasks, 
  onDeleteTask, 
  onUpdateOrder,
  sortMode = "az",
  onSortModeChange
}: TaskTableViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const [activeTask, setActiveTask] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 8,
      },
    })
  );

  // Fetch all profiles for assigned users
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url");
      if (error) throw error;
      return data;
    },
  });

  // Fetch subtasks for all tasks
  const taskIds = tasks.map(t => t.id);
  const { data: allSubtasks } = useQuery({
    queryKey: ["all-subtasks", taskIds],
    queryFn: async () => {
      if (taskIds.length === 0) return [];
      const { data, error } = await supabase
        .from("subtasks")
        .select("task_id, completed")
        .in("task_id", taskIds);
      if (error) throw error;
      return data;
    },
    enabled: taskIds.length > 0,
  });

  // Sort tasks based on mode
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortMode === "az") {
      return naturalSort(a.title, b.title);
    }
    return (a.task_order || 0) - (b.task_order || 0);
  });

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    if (sortMode === "manual" && onUpdateOrder) {
      const activeId = active.id as string;
      const overId = over.id as string;
      
      const oldIndex = sortedTasks.findIndex(t => t.id === activeId);
      const newIndex = sortedTasks.findIndex(t => t.id === overId);
      
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        onUpdateOrder(activeId, newIndex);
      }
    }
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", taskId);
      
      if (error) {
        toast.error("Erro ao atualizar status");
        return;
      }
      
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const getAssignedUser = (assignedTo: string | null) => {
    if (!assignedTo || !profiles) return null;
    return profiles.find(p => p.id === assignedTo);
  };

  const getSubtaskProgress = (taskId: string) => {
    if (!allSubtasks) return { completed: 0, total: 0 };
    const taskSubtasks = allSubtasks.filter(s => s.task_id === taskId);
    return {
      total: taskSubtasks.length,
      completed: taskSubtasks.filter(s => s.completed).length,
    };
  };

  return (
    <div className="space-y-4">
      {/* Sort Toggle */}
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

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-10 px-3"></TableHead>
                <TableHead className="min-w-[200px]">Elemento</TableHead>
                <TableHead className="w-[100px] text-center">Pessoa</TableHead>
                <TableHead className="w-[140px] text-center">Status</TableHead>
                <TableHead className="w-[100px] text-center">Data</TableHead>
                <TableHead className="w-[140px]">Acompanhamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext
                items={sortedTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedTasks.length > 0 ? (
                  sortedTasks.map((task) => (
                    <SortableTableRow
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      sortMode={sortMode}
                      assignedUser={getAssignedUser(task.assigned_to)}
                      subtaskProgress={getSubtaskProgress(task.id)}
                      onNavigate={(taskId) => navigate(`/tasks/${taskId}`)}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      Nenhuma tarefa encontrada
                    </TableCell>
                  </TableRow>
                )}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </div>
    </div>
  );
}
