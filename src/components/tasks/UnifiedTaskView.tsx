import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  ChevronDown, 
  ChevronRight, 
  FolderOpen,
  RefreshCw,
  FileText,
  ArrowDownAZ,
  GripVertical,
} from "lucide-react";
import { formatDateBR, isTaskOverdue, isTaskDueSoon } from "@/lib/utils";
import { toast } from "sonner";
import { MultiAssigneeAvatars } from "./MultiAssigneeAvatars";
import { MultiAssigneeDialog } from "./MultiAssigneeDialog";
import { useMultipleTasksAssignees } from "@/hooks/useTaskAssignees";
import { useIsMobile } from "@/hooks/use-mobile";
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

// ============= Configuration =============

export const statusConfig = {
  todo: { 
    label: "Parado", 
    color: "hsl(0, 68%, 72%)",
    className: "bg-status-todo text-status-todo-foreground hover:bg-status-todo/90"
  },
  in_progress: { 
    label: "Em progresso", 
    color: "hsl(30, 100%, 65%)",
    className: "bg-status-in-progress text-status-in-progress-foreground hover:bg-status-in-progress/90"
  },
  completed: { 
    label: "Feito", 
    color: "hsl(152, 69%, 53%)",
    className: "bg-status-completed text-status-completed-foreground hover:bg-status-completed/90"
  },
};

export const priorityConfig = {
  high: { label: "Alta", color: "hsl(250, 60%, 45%)", className: "bg-[hsl(250,60%,45%)] text-white hover:bg-[hsl(250,60%,40%)]" },
  medium: { label: "Média", color: "hsl(250, 50%, 60%)", className: "bg-[hsl(250,50%,60%)] text-white hover:bg-[hsl(250,50%,55%)]" },
  low: { label: "Baixa", color: "hsl(260, 60%, 65%)", className: "bg-[hsl(260,60%,65%)] text-white hover:bg-[hsl(260,60%,60%)]" },
};

const groupColors = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(280, 65%, 60%)",
  "hsl(25, 95%, 53%)",
  "hsl(340, 82%, 52%)",
  "hsl(47, 95%, 50%)",
  "hsl(173, 80%, 40%)",
  "hsl(315, 70%, 50%)",
];

export function getProjectColor(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return groupColors[Math.abs(hash) % groupColors.length];
}

export function getTaskType(task: any): "project" | "standalone" | "routine" {
  if (task.routine_id || task.recurring_task_id) return "routine";
  if (!task.project_id) return "standalone";
  return "project";
}

// Natural sort function
const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
};

// ============= Props =============

interface UnifiedTaskViewProps {
  tasks: any[];
  showGrouping?: boolean;
  showSortToggle?: boolean;
  onDeleteTask?: (taskId: string) => void;
  onUpdateOrder?: (taskId: string, newOrder: number) => void;
  defaultSortMode?: "manual" | "az";
  queryKeyToInvalidate?: string[];
}

// ============= Task Row Component =============

function TaskRowContent({ 
  task, 
  assignees,
  subtasks,
  groupColor,
  sortMode,
  onStatusChange,
  onPriorityChange,
  onTitleSave,
  onNavigate,
}: { 
  task: any;
  assignees: { user_id: string }[];
  subtasks: { completed: boolean }[];
  groupColor?: string;
  sortMode: "manual" | "az";
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  onTitleSave: (title: string) => void;
  onNavigate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [assigneeDialogOpen, setAssigneeDialogOpen] = useState(false);

  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const isOverdue = isTaskOverdue(task.due_date, task.status);
  const isDueSoon = isTaskDueSoon(task.due_date, task.status);

  // Subtask progress
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const handleTitleBlur = () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      onTitleSave(editedTitle.trim());
    } else {
      setEditedTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      setIsEditing(true);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        onNavigate();
      }, 250);
    }
  };

  return (
    <>
      {/* Task title */}
      <div className="w-[180px] min-w-[180px] py-3 px-2 shrink-0" style={groupColor ? { borderLeftWidth: 3, borderLeftColor: groupColor } : undefined}>
        {isEditing ? (
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleBlur();
              if (e.key === "Escape") {
                setEditedTitle(task.title);
                setIsEditing(false);
              }
            }}
            autoFocus
            className="h-7 text-sm"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p 
            className="font-medium text-sm line-clamp-2 cursor-pointer hover:text-primary transition-colors"
            onClick={handleTitleClick}
          >
            {task.title}
          </p>
        )}
      </div>

      {/* Assignees */}
      <div className="w-[80px] min-w-[80px] py-3 flex justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
        <MultiAssigneeAvatars
          taskId={task.id}
          assignees={assignees}
          size="sm"
          maxDisplay={2}
          showAddButton
          onAddClick={() => setAssigneeDialogOpen(true)}
        />
        <MultiAssigneeDialog
          open={assigneeDialogOpen}
          onOpenChange={setAssigneeDialogOpen}
          taskId={task.id}
          currentAssignees={assignees}
        />
      </div>

      {/* Status dropdown */}
      <div className="w-[100px] min-w-[100px] py-3 flex justify-center shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="px-3 py-1.5 text-xs font-semibold rounded text-white w-full text-center"
              style={{ backgroundColor: status.color }}
              onClick={(e) => e.stopPropagation()}
            >
              {status.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[120px]">
            {Object.entries(statusConfig).map(([key, config]) => (
              <DropdownMenuItem 
                key={key} 
                onSelect={() => onStatusChange(key)}
                className="justify-center"
              >
                <span 
                  className="px-3 py-1 rounded text-xs font-semibold text-white w-full text-center"
                  style={{ backgroundColor: config.color }}
                >
                  {config.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Due date */}
      <div className="w-[70px] min-w-[70px] py-3 text-center shrink-0">
        {task.due_date ? (
          <span className={`text-xs font-medium ${
            isOverdue 
              ? "text-destructive" 
              : isDueSoon 
                ? "text-amber-500" 
                : "text-muted-foreground"
          }`}>
            {formatDateBR(task.due_date).slice(0, 5)}
          </span>
        ) : (
          <span className="text-muted-foreground/50 text-xs">-</span>
        )}
      </div>

      {/* Priority dropdown */}
      <div className="w-[90px] min-w-[90px] py-3 flex justify-center shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="px-3 py-1.5 text-xs font-semibold rounded text-white w-full text-center"
              style={{ backgroundColor: priority.color }}
              onClick={(e) => e.stopPropagation()}
            >
              {priority.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[100px]">
            {Object.entries(priorityConfig).map(([key, config]) => (
              <DropdownMenuItem 
                key={key} 
                onSelect={() => onPriorityChange(key)}
                className="justify-center"
              >
                <span 
                  className="px-3 py-1 rounded text-xs font-semibold text-white w-full text-center"
                  style={{ backgroundColor: config.color }}
                >
                  {config.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress (subtasks) */}
      <div className="w-[100px] min-w-[100px] py-3 px-2 shrink-0">
        {totalSubtasks > 0 ? (
          <div className="flex items-center gap-1">
            <Progress value={subtaskProgress} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {completedSubtasks}/{totalSubtasks}
            </span>
          </div>
        ) : (
          <div className="h-2 bg-muted/50 rounded-full" />
        )}
      </div>
    </>
  );
}

// ============= Mobile Task Row =============

function MobileTaskRow({ 
  task, 
  assignees,
  subtasks,
  groupColor,
  sortMode,
  queryKeyToInvalidate,
}: { 
  task: any;
  assignees: { user_id: string }[];
  subtasks: { completed: boolean }[];
  groupColor?: string;
  sortMode: "manual" | "az";
  queryKeyToInvalidate: string[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleStatusChange = async (status: string) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success("Status atualizado!");
    queryKeyToInvalidate.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const handlePriorityChange = async (priority: string) => {
    const { error } = await supabase.from("tasks").update({ priority }).eq("id", task.id);
    if (error) { toast.error("Erro ao atualizar prioridade"); return; }
    toast.success("Prioridade atualizada!");
    queryKeyToInvalidate.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const handleTitleSave = async (title: string) => {
    const { error } = await supabase.from("tasks").update({ title }).eq("id", task.id);
    if (error) { toast.error("Erro ao atualizar título"); return; }
    toast.success("Título atualizado!");
    queryKeyToInvalidate.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  return (
    <div className="flex items-center border-b border-border last:border-b-0">
      <TaskRowContent
        task={task}
        assignees={assignees}
        subtasks={subtasks}
        groupColor={groupColor}
        sortMode={sortMode}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        onTitleSave={handleTitleSave}
        onNavigate={() => navigate(`/tasks/${task.id}`)}
      />
    </div>
  );
}

// ============= Desktop Sortable Task Row =============

function DesktopSortableTaskRow({ 
  task, 
  assignees,
  subtasks,
  sortMode,
  queryKeyToInvalidate,
}: { 
  task: any;
  assignees: { user_id: string }[];
  subtasks: { completed: boolean }[];
  sortMode: "manual" | "az";
  queryKeyToInvalidate: string[];
}) {
  const navigate = useNavigate();
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

  const handleStatusChange = async (status: string) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success("Status atualizado!");
    queryKeyToInvalidate.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const handlePriorityChange = async (priority: string) => {
    const { error } = await supabase.from("tasks").update({ priority }).eq("id", task.id);
    if (error) { toast.error("Erro ao atualizar prioridade"); return; }
    toast.success("Prioridade atualizada!");
    queryKeyToInvalidate.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const handleTitleSave = async (title: string) => {
    const { error } = await supabase.from("tasks").update({ title }).eq("id", task.id);
    if (error) { toast.error("Erro ao atualizar título"); return; }
    toast.success("Título atualizado!");
    queryKeyToInvalidate.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const isOverdue = isTaskOverdue(task.due_date, task.status);
  const isDueSoon = isTaskDueSoon(task.due_date, task.status);
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [assigneeDialogOpen, setAssigneeDialogOpen] = useState(false);

  const handleTitleBlur = () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      handleTitleSave(editedTitle.trim());
    } else {
      setEditedTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      setIsEditing(true);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        navigate(`/tasks/${task.id}`);
      }, 250);
    }
  };

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={`group hover:bg-muted/50 ${sortMode === "manual" ? "cursor-grab active:cursor-grabbing" : ""}`}
      {...(sortMode === "manual" ? { ...attributes, ...listeners } : {})}
    >
      <TableCell className="w-10 px-3">
        {sortMode === "manual" && (
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </TableCell>
      <TableCell className="min-w-[200px]">
        {isEditing ? (
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleBlur();
              if (e.key === "Escape") {
                setEditedTitle(task.title);
                setIsEditing(false);
              }
            }}
            autoFocus
            className="h-7 text-sm"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span 
            className="font-medium cursor-pointer hover:text-primary transition-colors line-clamp-1"
            onClick={handleTitleClick}
          >
            {task.title}
          </span>
        )}
      </TableCell>
      <TableCell className="w-[100px]">
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <MultiAssigneeAvatars
            taskId={task.id}
            assignees={assignees}
            size="md"
            maxDisplay={2}
            showAddButton
            onAddClick={() => setAssigneeDialogOpen(true)}
          />
        </div>
        <MultiAssigneeDialog
          open={assigneeDialogOpen}
          onOpenChange={setAssigneeDialogOpen}
          taskId={task.id}
          currentAssignees={assignees}
        />
      </TableCell>
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
                onSelect={() => handleStatusChange(key)}
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
      <TableCell className="w-[100px] text-center">
        {task.due_date ? (
          <span className={`text-sm ${isOverdue ? "text-destructive font-medium" : isDueSoon ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"}`}>
            {formatDateBR(task.due_date).slice(0, 5)}
          </span>
        ) : (
          <span className="text-muted-foreground/50">-</span>
        )}
      </TableCell>
      <TableCell className="w-[120px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className={`w-full px-3 py-1.5 text-sm font-medium rounded-sm text-center transition-all ${priority.className}`}
              onClick={(e) => e.stopPropagation()}
            >
              {priority.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[100px]">
            {Object.entries(priorityConfig).map(([key, config]) => (
              <DropdownMenuItem 
                key={key} 
                onSelect={() => handlePriorityChange(key)}
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
      <TableCell className="w-[140px]">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 rounded-full ${subtaskProgress === 100 ? "bg-status-completed" : subtaskProgress > 0 ? "bg-primary" : "bg-transparent"}`}
              style={{ width: `${subtaskProgress}%` }}
            />
          </div>
          <span className={`text-xs min-w-[35px] text-right ${subtaskProgress === 100 ? "text-status-completed font-medium" : "text-muted-foreground"}`}>
            {totalSubtasks > 0 ? `${Math.round(subtaskProgress)}%` : '-'}
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ============= Task Group (for grouped view) =============

function TaskGroup({ 
  group,
  taskAssignees,
  taskSubtasks,
  sortMode,
  isMobile,
  queryKeyToInvalidate,
}: { 
  group: {
    id: string;
    name: string;
    tasks: any[];
    type: "project" | "standalone" | "routine";
    color: string;
  };
  taskAssignees: Record<string, { user_id: string }[]>;
  taskSubtasks: Record<string, { completed: boolean }[]>;
  sortMode: "manual" | "az";
  isMobile: boolean;
  queryKeyToInvalidate: string[];
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();

  const sortedTasks = [...(group.tasks || [])].sort((a, b) => {
    if (sortMode === "az") return naturalSort(a.title, b.title);
    return (a.task_order || 0) - (b.task_order || 0);
  });

  const GroupIcon = group.type === "routine" 
    ? RefreshCw 
    : group.type === "standalone" 
      ? FileText 
      : FolderOpen;

  return (
    <div className="mb-4">
      {/* Group Header */}
      <div 
        className="flex items-center gap-2 mb-2 cursor-pointer"
        onClick={() => setIsExpanded(v => !v)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <GroupIcon className="h-4 w-4 shrink-0" style={{ color: group.color }} />
        <h3 
          className="font-semibold text-sm flex-1 line-clamp-1"
          style={{ color: group.color }}
          onClick={(e) => {
            if (group.type === "project") {
              e.stopPropagation();
              navigate(`/projects/${group.id}`);
            }
          }}
        >
          {group.name}
        </h3>
        <span className="text-xs text-muted-foreground shrink-0">
          {sortedTasks.length} {sortedTasks.length === 1 ? "tarefa" : "tarefas"}
        </span>
      </div>

      {/* Tasks */}
      {isExpanded && sortedTasks.length > 0 && (
        <Card className="overflow-hidden">
          <ScrollArea className="w-full" type="scroll">
            <div className="min-w-[620px]">
              {/* Table header */}
              <div className="flex items-center bg-muted/30 border-b border-border text-xs text-muted-foreground font-medium">
                <div className="w-[180px] min-w-[180px] py-2 px-2 shrink-0">Elemento</div>
                <div className="w-[80px] min-w-[80px] py-2 text-center shrink-0">Pessoa</div>
                <div className="w-[100px] min-w-[100px] py-2 text-center shrink-0">Status</div>
                <div className="w-[70px] min-w-[70px] py-2 text-center shrink-0">Data</div>
                <div className="w-[90px] min-w-[90px] py-2 text-center shrink-0">Prioridade</div>
                <div className="w-[100px] min-w-[100px] py-2 px-2 shrink-0">Acompanha</div>
              </div>
              {/* Task rows */}
              {sortedTasks.map((task) => (
                <MobileTaskRow
                  key={task.id}
                  task={task}
                  assignees={taskAssignees[task.id] || []}
                  subtasks={taskSubtasks[task.id] || []}
                  groupColor={group.color}
                  sortMode={sortMode}
                  queryKeyToInvalidate={queryKeyToInvalidate}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}

// ============= Main Component =============

export function UnifiedTaskView({ 
  tasks,
  showGrouping = true,
  showSortToggle = true,
  onDeleteTask,
  onUpdateOrder,
  defaultSortMode = "az",
  queryKeyToInvalidate = ["tasks", "my-tasks"],
}: UnifiedTaskViewProps) {
  const isMobile = useIsMobile();
  const [sortMode, setSortMode] = useState<"manual" | "az">(defaultSortMode);
  const [activeTask, setActiveTask] = useState<any>(null);
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } })
  );

  // Fetch all task assignees
  const taskIds = tasks.map(t => t.id);
  const { data: taskAssignees = {} } = useMultipleTasksAssignees(taskIds, tasks);

  // Fetch subtasks for all tasks
  const { data: allSubtasks = {} } = useQuery({
    queryKey: ["subtasks-unified", taskIds],
    queryFn: async () => {
      if (taskIds.length === 0) return {};
      const { data, error } = await supabase
        .from("subtasks")
        .select("task_id, completed")
        .in("task_id", taskIds);
      if (error) throw error;
      
      const grouped: Record<string, { completed: boolean }[]> = {};
      data?.forEach(item => {
        if (!grouped[item.task_id]) grouped[item.task_id] = [];
        grouped[item.task_id].push({ completed: item.completed || false });
      });
      return grouped;
    },
    enabled: taskIds.length > 0,
  });

  // Group tasks
  const groupedTasks = tasks.reduce((acc, task) => {
    const type = getTaskType(task);
    let groupId: string;
    let groupName: string;
    let color: string;

    if (type === "project" && task.project_id) {
      groupId = task.project_id;
      groupName = task.projects?.name || "Projeto sem nome";
      color = getProjectColor(task.project_id);
    } else if (type === "routine") {
      groupId = "routine";
      groupName = "Tarefas de Rotina";
      color = "hsl(142, 71%, 45%)";
    } else {
      groupId = "standalone";
      groupName = "Tarefas Avulsas";
      color = "hsl(280, 65%, 60%)";
    }

    if (!acc[groupId]) {
      acc[groupId] = { id: groupId, name: groupName, tasks: [], type, color };
    }
    acc[groupId].tasks.push(task);
    return acc;
  }, {} as Record<string, { id: string; name: string; tasks: any[]; type: "project" | "standalone" | "routine"; color: string; }>);

  type TaskGroup = { id: string; name: string; tasks: any[]; type: "project" | "standalone" | "routine"; color: string; };
  const groups: TaskGroup[] = Object.values(groupedTasks);
  groups.sort((a, b) => {
    const typeOrder = { project: 0, routine: 1, standalone: 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });

  // Sort tasks for flat view
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortMode === "az") return naturalSort(a.title, b.title);
    return (a.task_order || 0) - (b.task_order || 0);
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(tasks.find((t) => t.id === event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || active.id === over.id) return;
    if (sortMode === "manual" && onUpdateOrder) {
      const newIndex = sortedTasks.findIndex(t => t.id === over.id);
      if (newIndex !== -1) onUpdateOrder(active.id as string, newIndex);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Nenhuma tarefa encontrada</p>
      </div>
    );
  }

  // ============= MOBILE / GROUPED VIEW =============
  if (isMobile || showGrouping) {
    return (
      <div className="space-y-2">
        {showSortToggle && (
          <div className="flex justify-end mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortMode(sortMode === "manual" ? "az" : "manual")}
              className="gap-2"
            >
              {sortMode === "az" ? <><ArrowDownAZ size={16} />A-Z</> : <><GripVertical size={16} />Manual</>}
            </Button>
          </div>
        )}

        {groups.map((group) => (
          <TaskGroup
            key={group.id}
            group={group}
            taskAssignees={taskAssignees}
            taskSubtasks={allSubtasks}
            sortMode={sortMode}
            isMobile={isMobile}
            queryKeyToInvalidate={queryKeyToInvalidate}
          />
        ))}
      </div>
    );
  }

  // ============= DESKTOP FLAT TABLE VIEW =============
  return (
    <div className="space-y-4">
      {showSortToggle && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortMode(sortMode === "manual" ? "az" : "manual")}
            className="gap-2"
          >
            {sortMode === "az" ? <><ArrowDownAZ size={16} />A-Z</> : <><GripVertical size={16} />Manual</>}
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
                <TableHead className="w-[120px] text-center">Prioridade</TableHead>
                <TableHead className="w-[140px]">Acompanha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext items={sortedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {sortedTasks.map((task) => (
                  <DesktopSortableTaskRow
                    key={task.id}
                    task={task}
                    assignees={taskAssignees[task.id] || []}
                    subtasks={allSubtasks[task.id] || []}
                    sortMode={sortMode}
                    queryKeyToInvalidate={queryKeyToInvalidate}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
          <DragOverlay>
            {activeTask ? (
              <div className="rotate-1 shadow-2xl scale-105 opacity-90 bg-card p-3 rounded border">
                <span className="font-medium">{activeTask.title}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
