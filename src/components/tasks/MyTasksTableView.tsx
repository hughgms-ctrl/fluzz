import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { 
  ChevronRight, 
  ChevronDown, 
  User, 
  FolderOpen,
  RefreshCw,
} from "lucide-react";
import { formatDateBR, isTaskOverdue, isTaskDueSoon } from "@/lib/utils";
import { toast } from "sonner";

interface MyTasksTableViewProps {
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

const priorityConfig = {
  high: { label: "Alta", color: "hsl(250, 60%, 45%)" },
  medium: { label: "Média", color: "hsl(250, 50%, 60%)" },
  low: { label: "Baixa", color: "hsl(260, 60%, 65%)" },
};

// Colors for group accent bars
const groupColors = {
  project: [
    "hsl(217, 91%, 60%)",
    "hsl(142, 71%, 45%)",
    "hsl(280, 65%, 60%)",
    "hsl(25, 95%, 53%)",
    "hsl(340, 82%, 52%)",
    "hsl(47, 95%, 50%)",
    "hsl(173, 80%, 40%)",
    "hsl(315, 70%, 50%)",
  ],
  standalone: "hsl(280, 65%, 60%)",
  routine: "hsl(142, 71%, 45%)",
};

function getProjectColor(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return groupColors.project[Math.abs(hash) % groupColors.project.length];
}

function getTaskType(task: any): "project" | "standalone" | "routine" {
  if (task.routine_id || task.recurring_task_id) return "routine";
  if (!task.project_id) return "standalone";
  return "project";
}

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

function TaskTableRow({ 
  task, 
  profiles,
}: { 
  task: any;
  profiles: any[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const assignedUser = task.assigned_to 
    ? profiles?.find(p => p.id === task.assigned_to) 
    : null;

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
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
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
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    } catch (err) {
      toast.error("Erro ao atualizar prioridade");
    }
  };

  return (
    <TableRow className="hover:bg-muted/30 bg-background/50">
      <TableCell className="w-8 px-2"></TableCell>
      <TableCell 
        className="font-medium cursor-pointer hover:text-primary transition-colors pl-8"
        onClick={() => navigate(`/tasks/${task.id}`)}
      >
        <span className="line-clamp-1">{task.title}</span>
      </TableCell>
      <TableCell className="w-[80px]">
        <div className="flex justify-center">
          {assignedUser ? (
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignedUser.avatar_url} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {assignedUser.full_name?.charAt(0)?.toUpperCase() || <User className="h-3 w-3" />}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-muted">
                <User className="h-3 w-3 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
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

function TaskGroupRow({ 
  group,
  profiles,
}: { 
  group: {
    id: string;
    name: string;
    tasks: any[];
    type: "project" | "standalone" | "routine";
    color: string;
  };
  profiles: any[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const tasks = group.tasks || [];
  const taskCount = tasks.length;

  const GroupIcon = group.type === "routine" 
    ? RefreshCw 
    : group.type === "standalone" 
      ? User 
      : FolderOpen;

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
            aria-label={isExpanded ? "Recolher grupo" : "Expandir grupo"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>

        <TableCell
          className="font-semibold cursor-pointer hover:opacity-80 transition-opacity py-4"
          onClick={() => group.type === "project" ? navigate(`/projects/${group.id}`) : setIsExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <GroupIcon className="h-4 w-4" style={{ color: group.color }} />
            <span className="text-base font-semibold" style={{ color: group.color }}>{group.name}</span>
          </div>
          <p className="text-xs text-muted-foreground font-normal mt-1">
            {taskCount} {taskCount === 1 ? "Tarefa" : "Tarefas"}
          </p>
        </TableCell>

        <TableCell className="align-middle">
          <StatusSummaryBar tasks={tasks} />
        </TableCell>

        <TableCell className="text-center align-middle">
          <span className="text-muted-foreground/50">-</span>
        </TableCell>

        <TableCell className="align-middle">
          <ProgressSummary tasks={tasks} />
        </TableCell>
      </TableRow>

      {/* Expanded content (nested table to keep alignment) */}
      {isExpanded && (
        <TableRow className="bg-background">
          <TableCell colSpan={5} className="p-0">
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
                  {tasks.length > 0 ? (
                    tasks.map((task: any) => (
                      <TaskTableRow
                        key={task.id}
                        task={task}
                        profiles={profiles}
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

export function MyTasksTableView({ tasks }: MyTasksTableViewProps) {
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

  // Group tasks by project/type
  const groups = (() => {
    const groupMap: { [key: string]: { name: string; tasks: any[]; type: "project" | "standalone" | "routine"; color: string } } = {};
    
    tasks.forEach((task) => {
      const taskType = getTaskType(task);
      
      if (taskType === "standalone") {
        if (!groupMap["standalone"]) {
          groupMap["standalone"] = { 
            name: "Tarefas Avulsas", 
            tasks: [], 
            type: "standalone",
            color: groupColors.standalone,
          };
        }
        groupMap["standalone"].tasks.push(task);
      } else if (taskType === "routine") {
        if (!groupMap["routine"]) {
          groupMap["routine"] = { 
            name: "Tarefas de Rotina", 
            tasks: [], 
            type: "routine",
            color: groupColors.routine,
          };
        }
        groupMap["routine"].tasks.push(task);
      } else if (task.project_id) {
        const projectKey = task.project_id;
        if (!groupMap[projectKey]) {
          groupMap[projectKey] = { 
            name: task.projects?.name || "Projeto", 
            tasks: [], 
            type: "project",
            color: getProjectColor(projectKey),
          };
        }
        groupMap[projectKey].tasks.push(task);
      }
    });
    
    return Object.entries(groupMap)
      .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' }))
      .map(([id, group]) => ({ id, ...group }));
  })();

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">
          Nenhuma tarefa atribuída a você ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <Table className="w-full table-fixed">
        <colgroup>
          <col className="w-[50px]" />
          <col />
          <col className="w-[160px]" />
          <col className="w-[140px]" />
          <col className="w-[180px]" />
        </colgroup>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="px-2"></TableHead>
            <TableHead>Projeto / Grupo</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Data</TableHead>
            <TableHead className="text-center">Acompanhamento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TaskGroupRow
              key={group.id}
              group={group}
              profiles={profiles || []}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
