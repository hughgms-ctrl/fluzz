import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDown, 
  ChevronRight, 
  User, 
  FolderOpen,
  RefreshCw,
  FileText,
  Plus,
  ArrowDownAZ,
  GripVertical,
} from "lucide-react";
import { formatDateBR, isTaskOverdue, isTaskDueSoon } from "@/lib/utils";
import { toast } from "sonner";
import { MultiAssigneeAvatars } from "./MultiAssigneeAvatars";
import { MultiAssigneeDialog } from "./MultiAssigneeDialog";
import { useMultipleTasksAssignees } from "@/hooks/useTaskAssignees";

interface MyTasksMobileViewProps {
  tasks: any[];
}

const statusConfig = {
  todo: { 
    label: "Parado", 
    color: "hsl(0, 68%, 72%)",
  },
  in_progress: { 
    label: "Em progresso", 
    color: "hsl(30, 100%, 65%)",
  },
  completed: { 
    label: "Feito", 
    color: "hsl(152, 69%, 53%)",
  },
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

function getProjectColor(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return groupColors[Math.abs(hash) % groupColors.length];
}

function getTaskType(task: any): "project" | "standalone" | "routine" {
  if (task.routine_id || task.recurring_task_id) return "routine";
  if (!task.project_id) return "standalone";
  return "project";
}

// Natural sort function
const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
};

function TaskRow({ 
  task, 
  assignees,
  groupColor,
}: { 
  task: any;
  assignees: { user_id: string }[];
  groupColor: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [assigneeDialogOpen, setAssigneeDialogOpen] = useState(false);

  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
  const isOverdue = isTaskOverdue(task.due_date, task.status);
  const isDueSoon = isTaskDueSoon(task.due_date, task.status);

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
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      try {
        const { error } = await supabase
          .from("tasks")
          .update({ title: editedTitle.trim() })
          .eq("id", task.id);
        
        if (error) throw error;
        toast.success("Título atualizado!");
        queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      } catch (err) {
        toast.error("Erro ao atualizar título");
        setEditedTitle(task.title);
      }
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
    <div 
      className="flex items-center gap-2 py-3 border-b border-border last:border-b-0"
      style={{ borderLeftWidth: 3, borderLeftColor: groupColor, paddingLeft: 8 }}
    >
      {/* Task title and date */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
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
            className="font-medium text-sm line-clamp-1 cursor-pointer hover:text-primary transition-colors"
            onClick={handleTitleClick}
          >
            {task.title}
          </p>
        )}
        {task.due_date && (
          <p className={`text-xs mt-0.5 ${
            isOverdue 
              ? "text-destructive" 
              : isDueSoon 
                ? "text-amber-500" 
                : "text-muted-foreground"
          }`}>
            {formatDateBR(task.due_date).slice(0, 5)}
          </p>
        )}
      </div>

      {/* Assignees */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="px-3 py-1.5 text-xs font-semibold rounded text-white min-w-[90px] text-center shrink-0"
            style={{ backgroundColor: status.color }}
            onClick={(e) => e.stopPropagation()}
          >
            {status.label}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[120px]">
          {Object.entries(statusConfig).map(([key, config]) => (
            <DropdownMenuItem 
              key={key} 
              onSelect={() => handleStatusChange(key)}
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
  );
}

function TaskGroupCard({ 
  group,
  taskAssignees,
  sortMode,
}: { 
  group: {
    id: string;
    name: string;
    tasks: any[];
    type: "project" | "standalone" | "routine";
    color: string;
  };
  taskAssignees: Record<string, { user_id: string }[]>;
  sortMode: "manual" | "az";
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();

  // Sort tasks based on mode
  const sortedTasks = [...(group.tasks || [])].sort((a, b) => {
    if (sortMode === "az") {
      return naturalSort(a.title, b.title);
    }
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

      {/* Tasks List - Table-like layout */}
      {isExpanded && sortedTasks.length > 0 && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Table header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border text-xs text-muted-foreground font-medium">
              <div className="flex-1 pl-2">Elemento</div>
              <div className="w-[70px] text-center shrink-0">Pessoa</div>
              <div className="w-[90px] text-center shrink-0">Status</div>
            </div>
            {/* Task rows */}
            <div className="px-2">
              {sortedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  assignees={taskAssignees[task.id] || []}
                  groupColor={group.color}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function MyTasksMobileView({ tasks }: MyTasksMobileViewProps) {
  const [sortMode, setSortMode] = useState<"manual" | "az">("az");
  
  // Fetch all task assignees
  const taskIds = tasks.map(t => t.id);
  const { data: taskAssignees = {} } = useMultipleTasksAssignees(taskIds, tasks);

  // Group tasks by project/routine/standalone
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
      acc[groupId] = {
        id: groupId,
        name: groupName,
        tasks: [],
        type,
        color,
      };
    }
    acc[groupId].tasks.push(task);
    return acc;
  }, {} as Record<string, { id: string; name: string; tasks: any[]; type: "project" | "standalone" | "routine"; color: string; }>);

  type TaskGroup = { id: string; name: string; tasks: any[]; type: "project" | "standalone" | "routine"; color: string; };
  const groups: TaskGroup[] = Object.values(groupedTasks);

  // Sort: projects first, then routines, then standalone
  groups.sort((a, b) => {
    const typeOrder = { project: 0, routine: 1, standalone: 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Nenhuma tarefa encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Sort Toggle */}
      <div className="flex justify-end mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortMode(sortMode === "manual" ? "az" : "manual")}
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

      {groups.map((group) => (
        <TaskGroupCard
          key={group.id}
          group={group}
          taskAssignees={taskAssignees}
          sortMode={sortMode}
        />
      ))}
    </div>
  );
}
