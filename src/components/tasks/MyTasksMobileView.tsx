import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronDown, 
  ChevronRight, 
  FolderOpen,
  RefreshCw,
  FileText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TaskCard } from "./TaskCard";

interface MyTasksMobileViewProps {
  tasks: any[];
}

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

function TaskGroupCard({ 
  group,
  onDeleteTask,
}: { 
  group: {
    id: string;
    name: string;
    tasks: any[];
    type: "project" | "standalone" | "routine";
    color: string;
  };
  onDeleteTask: (taskId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();

  const tasks = group.tasks || [];

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
          {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
        </span>
      </div>

      {/* Tasks List */}
      {isExpanded && tasks.length > 0 && (
        <Card className="overflow-hidden" style={{ borderLeftWidth: 3, borderLeftColor: group.color }}>
          <CardContent className="p-2 space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={() => onDeleteTask(task.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function MyTasksMobileView({ tasks }: MyTasksMobileViewProps) {
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

  const handleDeleteTask = async (taskId: string) => {
    // This will be handled by the parent component through query invalidation
    console.log("Delete task:", taskId);
  };

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
          onDeleteTask={handleDeleteTask}
        />
      ))}
    </div>
  );
}
