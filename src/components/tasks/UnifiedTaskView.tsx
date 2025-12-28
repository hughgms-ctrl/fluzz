import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronRight, 
  FolderOpen,
  RefreshCw,
  User,
} from "lucide-react";
import { formatDateBR, isTaskOverdue, isTaskDueSoon } from "@/lib/utils";
import { toast } from "sonner";
import { MultiAssigneeDialog } from "./MultiAssigneeDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ============= Configuration =============

export const statusConfig = {
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

export const priorityConfig = {
  high: { label: "Alta", color: "hsl(250, 60%, 45%)" },
  medium: { label: "Média", color: "hsl(250, 50%, 60%)" },
  low: { label: "Baixa", color: "hsl(260, 60%, 65%)" },
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

// ============= Status Summary Bar (like ProjectsTableView) =============

function StatusSummaryBar({ tasks }: { tasks: any[] }) {
  const statusCounts = {
    completed: tasks.filter(t => t.status === "completed").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    todo: tasks.filter(t => t.status === "todo" || !t.status).length,
  };
  
  const total = tasks.length;
  if (total === 0) return <span className="text-muted-foreground/50 text-center block">-</span>;

  return (
    <TooltipProvider>
      <div className="flex h-6 w-full rounded-sm overflow-hidden">
        {Object.entries(statusCounts).map(([status, count]) => {
          if (count === 0) return null;
          const config = statusConfig[status as keyof typeof statusConfig];
          const percentage = (count / total) * 100;
          
          return (
            <Tooltip key={status}>
              <TooltipTrigger asChild>
                <div 
                  className="h-full cursor-pointer transition-opacity hover:opacity-80"
                  style={{ 
                    width: `${percentage}%`, 
                    backgroundColor: config.color,
                    minWidth: count > 0 ? '10px' : 0,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{config.label}: {count}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

// ============= Progress Summary (like ProjectsTableView) =============

function ProgressSummary({ tasks }: { tasks: any[] }) {
  const total = tasks.length;
  if (total === 0) return <span className="text-muted-foreground/50 text-center block">-</span>;
  
  const completed = tasks.filter(t => t.status === "completed").length;
  const percentage = Math.round((completed / total) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 rounded-full ${
            percentage === 100 
              ? "bg-status-completed" 
              : percentage > 0 
                ? "bg-primary" 
                : "bg-transparent"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-sm font-medium min-w-[40px] text-right ${
        percentage === 100 
          ? "text-status-completed" 
          : "text-muted-foreground"
      }`}>
        {percentage}%
      </span>
    </div>
  );
}

// ============= Task Table Row (expanded view) =============

function TaskTableRow({ 
  task, 
  profiles,
  queryKeyToInvalidate,
}: { 
  task: any;
  profiles: any[];
  queryKeyToInvalidate: string[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [assigneeDialogOpen, setAssigneeDialogOpen] = useState(false);
  
  // Get assignee from task_assignees relationship
  const taskAssignees = task.task_assignees || [];
  const assigneeProfiles = taskAssignees
    .map((ta: any) => profiles?.find(p => p.id === ta.user_id))
    .filter(Boolean);

  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  
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
      queryKeyToInvalidate.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ priority: newPriority })
        .eq("id", task.id);
      
      if (error) {
        toast.error("Erro ao atualizar prioridade");
        return;
      }
      
      toast.success("Prioridade atualizada!");
      queryKeyToInvalidate.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
    } catch (err) {
      toast.error("Erro ao atualizar prioridade");
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
        queryKeyToInvalidate.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
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
    <TableRow className="hover:bg-muted/30 bg-background/50">
      <TableCell className="w-8 px-2"></TableCell>
      <TableCell className="font-medium pl-8">
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
          <span 
            className="line-clamp-1 cursor-pointer hover:text-primary transition-colors"
            onClick={handleTitleClick}
          >
            {task.title}
          </span>
        )}
      </TableCell>
      <TableCell className="w-[80px]">
        <div className="flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
          {assigneeProfiles.length > 0 ? (
            <div className="flex items-center cursor-pointer" onClick={() => setAssigneeDialogOpen(true)}>
              {assigneeProfiles.slice(0, 2).map((user: any, index: number) => (
                <Avatar 
                  key={user.id} 
                  className={`h-6 w-6 border-2 border-background ${index > 0 ? '-ml-2' : ''}`}
                >
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {user.full_name?.charAt(0)?.toUpperCase() || <User className="h-3 w-3" />}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assigneeProfiles.length > 2 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{assigneeProfiles.length - 2}
                </span>
              )}
            </div>
          ) : (
            <Avatar 
              className="h-6 w-6 cursor-pointer" 
              onClick={() => setAssigneeDialogOpen(true)}
            >
              <AvatarFallback className="text-xs bg-muted">
                <User className="h-3 w-3 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <MultiAssigneeDialog
          open={assigneeDialogOpen}
          onOpenChange={setAssigneeDialogOpen}
          taskId={task.id}
          currentAssignees={taskAssignees.map((ta: any) => ({ user_id: ta.user_id }))}
        />
      </TableCell>
      <TableCell className="w-[120px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="w-full px-2 py-1 text-xs font-medium rounded-sm text-center transition-all text-white"
              style={{ backgroundColor: status.color }}
              onClick={(e) => e.stopPropagation()}
            >
              {status.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[100px]">
            {Object.entries(statusConfig).map(([key, config]) => (
              <DropdownMenuItem 
                key={key} 
                onSelect={() => handleStatusChange(key)}
                className="justify-center"
              >
                <span 
                  className="px-2 py-0.5 rounded-sm text-xs font-medium text-white"
                  style={{ backgroundColor: config.color }}
                >
                  {config.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      <TableCell className="w-[90px] text-center">
        {task.due_date ? (
          <span className={`text-xs ${
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
      <TableCell className="w-[100px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="w-full px-2 py-1 text-xs font-medium rounded-sm text-center transition-all text-white"
              style={{ backgroundColor: priority.color }}
              onClick={(e) => e.stopPropagation()}
            >
              {priority.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[80px]">
            {Object.entries(priorityConfig).map(([key, config]) => (
              <DropdownMenuItem 
                key={key} 
                onSelect={() => handlePriorityChange(key)}
                className="justify-center"
              >
                <span 
                  className="px-2 py-0.5 rounded-sm text-xs font-medium text-white"
                  style={{ backgroundColor: config.color }}
                >
                  {config.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ============= Group Row (like ProjectRow) =============

function GroupRow({ 
  group, 
  profiles,
  queryKeyToInvalidate,
}: { 
  group: {
    id: string;
    name: string;
    tasks: any[];
    type: "project" | "standalone" | "routine";
    color: string;
  };
  profiles: any[];
  queryKeyToInvalidate: string[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const tasks = group.tasks || [];
  const taskCount = tasks.length;

  // Calculate the nearest due date from tasks in this group
  const nearestDueDate = tasks.reduce((nearest: string | null, task: any) => {
    if (!task.due_date) return nearest;
    if (!nearest) return task.due_date;
    return task.due_date < nearest ? task.due_date : nearest;
  }, null);

  // Sort tasks by title (A-Z)
  const sortedTasks = [...tasks].sort((a, b) => naturalSort(a.title, b.title));

  const GroupIcon = group.type === "routine" 
    ? RefreshCw 
    : group.type === "standalone" 
      ? User 
      : FolderOpen;

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (group.type === "project") {
      navigate(`/projects/${group.id}`);
    }
  };

  return (
    <>
      {/* Group Row */}
      <TableRow className="bg-card hover:bg-muted/50 border-b border-border">
        <TableCell 
          className="px-2 align-top pt-4 border-l-4 rounded-l-sm"
          style={{ borderLeftColor: group.color }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((v) => !v);
            }}
            aria-label={isExpanded ? "Recolher" : "Expandir"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>

        <TableCell className="font-semibold py-4 min-w-[280px]">
          <div className="flex items-center gap-2">
            <GroupIcon className="h-4 w-4 flex-shrink-0" style={{ color: group.color }} />
            <span 
              className={`text-base font-semibold whitespace-nowrap ${group.type === "project" ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
              style={{ color: group.color }}
              onClick={handleNameClick}
            >
              {group.name}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-normal mt-1 whitespace-nowrap">
            {taskCount} {taskCount === 1 ? "Tarefa" : "Tarefas"}
          </p>
        </TableCell>

        <TableCell className="align-middle">
          <StatusSummaryBar tasks={tasks} />
        </TableCell>

        <TableCell className="text-center align-middle">
          {nearestDueDate ? (
            <Badge className="text-xs whitespace-nowrap bg-primary/80 text-primary-foreground hover:bg-primary/70">
              {formatDateBR(nearestDueDate)}
            </Badge>
          ) : (
            <span className="text-muted-foreground/50">-</span>
          )}
        </TableCell>

        <TableCell className="align-middle">
          <ProgressSummary tasks={tasks} />
        </TableCell>

        <TableCell className="align-middle">
          {/* Reserved for actions if needed */}
        </TableCell>
      </TableRow>

      {/* Expanded content (nested table) */}
      {isExpanded && (
        <TableRow className="bg-background">
          <TableCell colSpan={6} className="p-0">
            <div className="border-t border-border bg-muted/10">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 text-xs">
                    <TableHead className="w-10 px-2"></TableHead>
                    <TableHead className="font-medium text-muted-foreground pl-8">Tarefa</TableHead>
                    <TableHead className="w-[80px] text-center font-medium text-muted-foreground">Pessoa</TableHead>
                    <TableHead className="w-[120px] text-center font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="w-[90px] text-center font-medium text-muted-foreground">Data</TableHead>
                    <TableHead className="w-[100px] text-center font-medium text-muted-foreground">Prioridade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTasks.length > 0 ? (
                    sortedTasks.map((task: any) => (
                      <TaskTableRow
                        key={task.id}
                        task={task}
                        profiles={profiles}
                        queryKeyToInvalidate={queryKeyToInvalidate}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-4 text-muted-foreground text-sm"
                      >
                        Nenhuma tarefa neste grupo
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ============= Main Component =============

export function UnifiedTaskView({ 
  tasks,
  showGrouping = true,
  showSortToggle = false,
  onDeleteTask,
  onUpdateOrder,
  defaultSortMode = "az",
  queryKeyToInvalidate = ["tasks", "my-tasks"],
}: UnifiedTaskViewProps) {

  // Fetch all profiles
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url");
      if (error) throw error;
      return data || [];
    },
  });

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
      acc[groupId] = { id: groupId, name: groupName, tasks: [], type, color };
    }
    acc[groupId].tasks.push(task);
    
    return acc;
  }, {} as Record<string, { id: string; name: string; tasks: any[]; type: "project" | "standalone" | "routine"; color: string; }>);

  type TaskGroup = { id: string; name: string; tasks: any[]; type: "project" | "standalone" | "routine"; color: string; };
  const groups: TaskGroup[] = Object.values(groupedTasks);
  
  // Sort groups: projects first, then routine, then standalone
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
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <ScrollArea className="w-full" type="scroll">
        <div className="min-w-[900px]">
          <Table className="w-full">
            <colgroup>
              <col className="w-[50px]" />
              <col className="w-[320px]" />
              <col className="w-[160px]" />
              <col className="w-[140px]" />
              <col className="w-[180px]" />
              <col className="w-[50px]" />
            </colgroup>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-2"></TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Data</TableHead>
                <TableHead className="text-center">Acompanhamento</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  profiles={profiles || []}
                  queryKeyToInvalidate={queryKeyToInvalidate}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
