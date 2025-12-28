import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { CreateMyTaskDialog } from "@/components/tasks/CreateMyTaskDialog";
import { UnifiedTaskView } from "@/components/tasks/UnifiedTaskView";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { CheckCircle2, Clock, PlayCircle, Plus, FolderOpen, User, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MobileFilterDrawer } from "@/components/filters/MobileFilterDrawer";
import { parseDateOnly, isTaskOverdue } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MyTasks() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Apply URL filter on mount
  useEffect(() => {
    const urlFilter = searchParams.get("filter");
    if (urlFilter) {
      if (urlFilter === "completed") {
        setStatusFilter("completed");
        setShowCompleted(true);
      } else if (urlFilter === "pending") {
        // pending = todo + in_progress
        setStatusFilter("all");
        setShowCompleted(false);
      } else if (urlFilter === "overdue") {
        setDueDateFilter("overdue");
        setShowCompleted(false);
      }
      // Clear the URL param after applying
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setPriorityFilter("all");
    setStatusFilter("all");
    setDueDateFilter("all");
    setProjectFilter("all");
    setTypeFilter("all");
    setFilterDrawerOpen(false);
  };

  const activeFiltersCount = [
    searchTerm !== "",
    priorityFilter !== "all",
    statusFilter !== "all",
    dueDateFilter !== "all",
    projectFilter !== "all",
    typeFilter !== "all",
  ].filter(Boolean).length;

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["my-tasks", user?.id],
    queryFn: async () => {
      // Get tasks assigned to me
      const { data: myTasks, error: myTasksError } = await supabase
        .from("tasks")
        .select("*, projects(id, name, archived, pending_notifications)")
        .eq("assigned_to", user!.id)
        .order("created_at", { ascending: false });
      if (myTasksError) throw myTasksError;

      // Get tasks I need to review (where I'm the approval_reviewer_id)
      const { data: reviewTasks, error: reviewError } = await supabase
        .from("tasks")
        .select("*, projects(id, name, archived, pending_notifications)")
        .eq("approval_reviewer_id", user!.id)
        .eq("requires_approval", true)
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });
      if (reviewError) throw reviewError;

      // Combine and deduplicate
      const allTasks = [...(myTasks || [])];
      reviewTasks?.forEach((task) => {
        if (!allTasks.find((t) => t.id === task.id)) {
          allTasks.push(task);
        }
      });

      // IMPORTANT: Do NOT show tasks from draft projects (rascunho)
      // A draft project is identified by pending_notifications === true.
      return (
        allTasks?.filter((task) => {
          // Standalone tasks are always visible
          if (!task.project_id) return true;

          // If it's a project task, only show when project is published and not archived
          if (!task.projects) return false;
          if (task.projects.archived) return false;
          if (task.projects.pending_notifications === true) return false;

          return true;
        }) || []
      );
    },
    enabled: !!user,
  });

  const { data: projects } = useQuery({
    queryKey: ["my-projects-filter", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, archived, pending_notifications")
        .eq("workspace_id", workspace.id)
        .eq("archived", false)
        .neq("pending_notifications", true)
        .order("name");
      if (error) throw error;
      return (data || []).map((p) => ({ id: p.id, name: p.name }));
    },
    enabled: !!workspace,
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa excluída com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir tarefa");
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      toast.success("Status atualizado!");
    },
  });

  // Helper function to determine task type
  const getTaskType = (task: any): "project" | "standalone" | "routine" => {
    if (task.routine_id || task.recurring_task_id) return "routine";
    if (!task.project_id) return "standalone";
    return "project";
  };

  // Natural sort function
  const naturalSort = (a: string, b: string) => {
    return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
  };

  // Apply filters (moved before conditional return)
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((task) => {
      const matchesSearch =
        searchTerm === "" ||
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesProject = projectFilter === "all" || task.project_id === projectFilter;
      
      const taskType = getTaskType(task);
      const matchesType = typeFilter === "all" || taskType === typeFilter;

      // Hide completed tasks if toggle is off
      const matchesCompletedFilter = showCompleted || task.status !== "completed";

      let matchesDueDate = true;
      if (dueDateFilter !== "all" && task.due_date) {
        const dueDate = parseDateOnly(task.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dueDate) {
          if (dueDateFilter === "overdue") {
            matchesDueDate = isTaskOverdue(task.due_date, task.status);
          } else if (dueDateFilter === "today") {
            matchesDueDate = dueDate.toDateString() === today.toDateString();
          } else if (dueDateFilter === "week") {
            const weekFromNow = new Date(today);
            weekFromNow.setDate(today.getDate() + 7);
            matchesDueDate = dueDate >= today && dueDate <= weekFromNow;
          } else if (dueDateFilter === "month") {
            const monthFromNow = new Date(today);
            monthFromNow.setMonth(today.getMonth() + 1);
            matchesDueDate = dueDate >= today && dueDate <= monthFromNow;
          }
        }
      }

      return matchesSearch && matchesPriority && matchesStatus && matchesDueDate && matchesProject && matchesType && matchesCompletedFilter;
    });
  }, [tasks, searchTerm, priorityFilter, statusFilter, dueDateFilter, projectFilter, typeFilter, showCompleted]);

  // Computed values based on filtered tasks
  const todoTasks = useMemo(() => filteredTasks.filter((t) => t.status === "todo"), [filteredTasks]);
  const inProgressTasks = useMemo(() => filteredTasks.filter((t) => t.status === "in_progress"), [filteredTasks]);
  const completedTasks = useMemo(() => filteredTasks.filter((t) => t.status === "completed"), [filteredTasks]);
  const projectTasks = useMemo(() => filteredTasks.filter((t) => getTaskType(t) === "project"), [filteredTasks]);
  const standaloneTasks = useMemo(() => filteredTasks.filter((t) => getTaskType(t) === "standalone"), [filteredTasks]);
  const routineTasks = useMemo(() => filteredTasks.filter((t) => getTaskType(t) === "routine"), [filteredTasks]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }


  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Minhas Tarefas</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Visualize e gerencie todas as tarefas atribuídas a você
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 w-full sm:w-auto">
            <Plus size={16} />
            <span className="hidden sm:inline">Nova Tarefa Avulsa</span>
            <span className="sm:hidden">Nova Tarefa</span>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-3">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <FolderOpen className="h-5 w-5 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{projectTasks.length}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Projeto</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <User className="h-5 w-5 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{standaloneTasks.length}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Avulsas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <RefreshCw className="h-5 w-5 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-lg sm:text-2xl font-bold">{routineTasks.length}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Rotina</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Filter Drawer */}
        <MobileFilterDrawer
          title="Filtrar Tarefas"
          description="Aplique filtros para encontrar tarefas específicas"
          activeFiltersCount={activeFiltersCount}
          open={filterDrawerOpen}
          onOpenChange={setFilterDrawerOpen}
        >
          <TaskFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            dueDateFilter={dueDateFilter}
            onDueDateChange={setDueDateFilter}
            projectFilter={projectFilter}
            onProjectChange={setProjectFilter}
            projects={projects}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
            onClearAll={clearAllFilters}
          />
        </MobileFilterDrawer>

        {/* Desktop Filters - Collapsible */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="hidden md:block">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto font-medium text-sm hover:bg-transparent">
              {isFiltersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Filtros
              {activeFiltersCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <TaskFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              priorityFilter={priorityFilter}
              onPriorityChange={setPriorityFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              dueDateFilter={dueDateFilter}
              onDueDateChange={setDueDateFilter}
              projectFilter={projectFilter}
              onProjectChange={setProjectFilter}
              projects={projects}
              typeFilter={typeFilter}
              onTypeChange={setTypeFilter}
              onClearAll={clearAllFilters}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Toggle show completed */}
        <div className="flex items-center justify-end gap-2">
          <Switch
            id="show-completed"
            checked={showCompleted}
            onCheckedChange={setShowCompleted}
          />
          <Label htmlFor="show-completed" className="text-xs sm:text-sm text-muted-foreground cursor-pointer">
            Exibir concluídas
          </Label>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              Todas <span className="hidden sm:inline">({filteredTasks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="todo" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">A Fazer</span>
              <span className="sm:hidden">Fazer</span>
              <span className="hidden sm:inline">({todoTasks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <PlayCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Em Progresso</span>
              <span className="sm:hidden">Progresso</span>
              <span className="hidden sm:inline">({inProgressTasks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Concluídas</span>
              <span className="sm:hidden">Feitas</span>
              <span className="hidden sm:inline">({completedTasks.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 md:mt-6">
            <UnifiedTaskView 
              tasks={filteredTasks} 
              showGrouping={true}
              queryKeyToInvalidate={["my-tasks", "tasks"]}
            />
          </TabsContent>

          <TabsContent value="todo" className="mt-4 md:mt-6">
            <UnifiedTaskView 
              tasks={todoTasks} 
              showGrouping={true}
              queryKeyToInvalidate={["my-tasks", "tasks"]}
            />
          </TabsContent>

          <TabsContent value="in_progress" className="mt-4 md:mt-6">
            <UnifiedTaskView 
              tasks={inProgressTasks} 
              showGrouping={true}
              queryKeyToInvalidate={["my-tasks", "tasks"]}
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-4 md:mt-6">
            <UnifiedTaskView 
              tasks={completedTasks} 
              showGrouping={true}
              queryKeyToInvalidate={["my-tasks", "tasks"]}
            />
          </TabsContent>
        </Tabs>
      </div>

      <CreateMyTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </AppLayout>
  );
}
