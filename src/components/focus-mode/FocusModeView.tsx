import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Calendar, FolderOpen, User, RefreshCw, AlertCircle } from "lucide-react";
import { FocusModeTaskGroup, groupTasksByDate, groupTasksByProject } from "./FocusModeTaskGroup";
import { FocusModeTaskDetail } from "./FocusModeTaskDetail";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface FocusModeViewProps {
  tasks: any[];
  queryKeyToInvalidate?: string[];
}

// Map project color values to actual colors
const projectColorMap: Record<string, string> = {
  primary: "hsl(var(--primary))",
  blue: "hsl(217, 91%, 60%)",
  emerald: "hsl(142, 71%, 45%)",
  amber: "hsl(43, 96%, 56%)",
  purple: "hsl(271, 81%, 56%)",
  pink: "hsl(330, 81%, 60%)",
  cyan: "hsl(188, 94%, 42%)",
  rose: "hsl(346, 77%, 49%)",
  orange: "hsl(25, 95%, 53%)",
  teal: "hsl(173, 80%, 40%)",
};

export function FocusModeView({ tasks, queryKeyToInvalidate = ["my-tasks", "tasks"] }: FocusModeViewProps) {
  const { workspace } = useWorkspace();
  const isMobile = useIsMobile();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [groupBy, setGroupBy] = useState<"date" | "project">("date");

  // Fetch profiles for assignee display
  const { data: profiles } = useQuery({
    queryKey: ["workspace-profiles", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace.id);
      
      if (!members || members.length === 0) return [];
      
      const userIds = members.map(m => m.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);
      
      return profilesData || [];
    },
    enabled: !!workspace,
  });

  // Group tasks by date
  const dateGroups = useMemo(() => groupTasksByDate(tasks), [tasks]);
  
  // Group tasks by project
  const { projectGroups, personalTasks, routineTasks } = useMemo(
    () => groupTasksByProject(tasks),
    [tasks]
  );

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
  };

  const handleCloseDetail = () => {
    setSelectedTask(null);
  };

  return (
    <div className={cn(
      "flex h-full",
      !isMobile && selectedTask && "gap-0"
    )}>
      {/* Task List */}
      <div className={cn(
        "flex-1 min-w-0 space-y-6",
        !isMobile && selectedTask && "max-w-[60%]"
      )}>
        {/* Grouping Tabs */}
        <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as "date" | "project")}>
          <TabsList className="grid w-full max-w-[300px] grid-cols-2">
            <TabsTrigger value="date" className="gap-2 text-xs sm:text-sm">
              <Calendar className="h-3.5 w-3.5" />
              Por Data
            </TabsTrigger>
            <TabsTrigger value="project" className="gap-2 text-xs sm:text-sm">
              <FolderOpen className="h-3.5 w-3.5" />
              Por Projeto
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-1">Nenhuma tarefa</h3>
            <p className="text-sm text-muted-foreground">
              Você não tem tarefas atribuídas no momento
            </p>
          </div>
        ) : groupBy === "date" ? (
          <div className="space-y-4">
            {/* Overdue */}
            <FocusModeTaskGroup
              title="Atrasadas"
              icon={<AlertCircle className="h-4 w-4 text-destructive" />}
              tasks={dateGroups.overdue}
              profiles={profiles || []}
              onTaskClick={handleTaskClick}
              queryKeyToInvalidate={queryKeyToInvalidate}
              defaultExpanded
            />

            {/* Today */}
            <FocusModeTaskGroup
              title="Hoje"
              icon={<Calendar className="h-4 w-4 text-primary" />}
              tasks={dateGroups.today}
              profiles={profiles || []}
              onTaskClick={handleTaskClick}
              queryKeyToInvalidate={queryKeyToInvalidate}
              defaultExpanded
            />

            {/* Tomorrow */}
            <FocusModeTaskGroup
              title="Amanhã"
              icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
              tasks={dateGroups.tomorrow}
              profiles={profiles || []}
              onTaskClick={handleTaskClick}
              queryKeyToInvalidate={queryKeyToInvalidate}
              defaultExpanded
            />

            {/* This Week */}
            <FocusModeTaskGroup
              title="Esta Semana"
              icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
              tasks={dateGroups.thisWeek}
              profiles={profiles || []}
              onTaskClick={handleTaskClick}
              queryKeyToInvalidate={queryKeyToInvalidate}
              defaultExpanded
            />

            {/* Later */}
            <FocusModeTaskGroup
              title="Mais Tarde"
              icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
              tasks={dateGroups.later}
              profiles={profiles || []}
              onTaskClick={handleTaskClick}
              queryKeyToInvalidate={queryKeyToInvalidate}
              defaultExpanded={false}
            />

            {/* No Due Date */}
            <FocusModeTaskGroup
              title="Sem Prazo"
              icon={<Calendar className="h-4 w-4 text-muted-foreground/50" />}
              tasks={dateGroups.noDueDate}
              profiles={profiles || []}
              onTaskClick={handleTaskClick}
              queryKeyToInvalidate={queryKeyToInvalidate}
              defaultExpanded={false}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Project Groups */}
            {Object.entries(projectGroups).map(([projectId, group]) => (
              <FocusModeTaskGroup
                key={projectId}
                title={group.name}
                color={group.color ? projectColorMap[group.color] || projectColorMap.primary : projectColorMap.primary}
                icon={<FolderOpen className="h-4 w-4" />}
                tasks={group.tasks}
                profiles={profiles || []}
                onTaskClick={handleTaskClick}
                queryKeyToInvalidate={queryKeyToInvalidate}
                defaultExpanded
              />
            ))}

            {/* Personal Tasks */}
            <FocusModeTaskGroup
              title="Tarefas Pessoais"
              icon={<User className="h-4 w-4 text-chart-4" />}
              tasks={personalTasks}
              profiles={profiles || []}
              onTaskClick={handleTaskClick}
              queryKeyToInvalidate={queryKeyToInvalidate}
              defaultExpanded
            />

            {/* Routine Tasks */}
            <FocusModeTaskGroup
              title="Rotinas"
              icon={<RefreshCw className="h-4 w-4 text-chart-3" />}
              tasks={routineTasks}
              profiles={profiles || []}
              onTaskClick={handleTaskClick}
              queryKeyToInvalidate={queryKeyToInvalidate}
              defaultExpanded
            />
          </div>
        )}
      </div>

      {/* Task Detail Panel - Desktop */}
      {!isMobile && selectedTask && (
        <div className="w-[400px] min-w-[350px] flex-shrink-0 animate-slide-in-right">
          <FocusModeTaskDetail
            task={selectedTask}
            profiles={profiles || []}
            onClose={handleCloseDetail}
            queryKeyToInvalidate={queryKeyToInvalidate}
          />
        </div>
      )}

      {/* Task Detail Modal - Mobile */}
      {isMobile && selectedTask && (
        <FocusModeTaskDetail
          task={selectedTask}
          profiles={profiles || []}
          onClose={handleCloseDetail}
          queryKeyToInvalidate={queryKeyToInvalidate}
        />
      )}
    </div>
  );
}
