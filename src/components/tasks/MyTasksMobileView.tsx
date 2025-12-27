import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "lucide-react";
import { formatDateBR, isTaskOverdue, isTaskDueSoon } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

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

function TaskMobileCard({ 
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

  return (
    <div 
      className="flex items-center gap-3 py-3 border-b border-border last:border-b-0 active:bg-muted/50"
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      {/* Task title */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm line-clamp-1">{task.title}</p>
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

      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={assignedUser?.avatar_url} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {assignedUser?.full_name?.charAt(0)?.toUpperCase() || <User className="h-3 w-3" />}
        </AvatarFallback>
      </Avatar>

      {/* Status dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="px-3 py-1.5 text-xs font-semibold rounded text-white min-w-[100px] text-center shrink-0"
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
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();

  const tasks = group.tasks || [];

  const GroupIcon = group.type === "routine" 
    ? RefreshCw 
    : group.type === "standalone" 
      ? User 
      : FolderOpen;

  return (
    <div className="mb-6">
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
          className="font-semibold text-base flex-1 line-clamp-1"
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
          {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
        </span>
      </div>

      {/* Tasks List */}
      {isExpanded && tasks.length > 0 && (
        <Card className="overflow-hidden" style={{ borderLeftWidth: 3, borderLeftColor: group.color }}>
          <CardContent className="p-3">
            {tasks.map((task) => (
              <TaskMobileCard
                key={task.id}
                task={task}
                profiles={profiles}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function MyTasksMobileView({ tasks }: MyTasksMobileViewProps) {
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
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
      {groups.map((group) => (
        <TaskGroupCard
          key={group.id}
          group={group}
          profiles={profiles}
        />
      ))}
    </div>
  );
}
