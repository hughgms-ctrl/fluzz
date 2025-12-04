import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { CreateStandaloneTaskDialog } from "@/components/tasks/CreateStandaloneTaskDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Clock, PlayCircle, Plus, FolderOpen, User, RefreshCw } from "lucide-react";
import { MobileFilterDrawer } from "@/components/filters/MobileFilterDrawer";

export default function MyTasks() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

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
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(id, name)")
        .eq("assigned_to", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: projects } = useQuery({
    queryKey: ["my-projects-filter", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("workspace_id", workspace.id)
        .order("name");
      if (error) throw error;
      return data;
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

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  // Apply filters
  const filteredTasks = tasks?.filter((task) => {
    const matchesSearch =
      searchTerm === "" ||
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesProject = projectFilter === "all" || task.project_id === projectFilter;
    
    const taskType = getTaskType(task);
    const matchesType = typeFilter === "all" || taskType === typeFilter;

    let matchesDueDate = true;
    if (dueDateFilter !== "all" && task.due_date) {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDateFilter === "overdue") {
        matchesDueDate = dueDate < today && task.status !== "completed";
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

    return matchesSearch && matchesPriority && matchesStatus && matchesDueDate && matchesProject && matchesType;
  }) || [];

  const todoTasks = filteredTasks.filter((t) => t.status === "todo");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  // Count by type
  const projectTasks = filteredTasks.filter((t) => getTaskType(t) === "project");
  const standaloneTasks = filteredTasks.filter((t) => getTaskType(t) === "standalone");
  const routineTasks = filteredTasks.filter((t) => getTaskType(t) === "routine");

  const TaskTypeIcon = ({ type }: { type: "project" | "standalone" | "routine" }) => {
    const icons = {
      project: <FolderOpen size={12} />,
      standalone: <User size={12} />,
      routine: <RefreshCw size={12} />,
    };
    return icons[type];
  };

  const TaskTypeBadge = ({ task }: { task: any }) => {
    const type = getTaskType(task);
    const labels = {
      project: task.projects?.name || "Projeto",
      standalone: "Avulsa",
      routine: "Rotina",
    };
    const colors = {
      project: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      standalone: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      routine: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };

    return (
      <Badge variant="outline" className={`text-xs px-1.5 py-0 h-5 gap-1 ${colors[type]}`}>
        <TaskTypeIcon type={type} />
        {labels[type]}
      </Badge>
    );
  };

  const renderTaskList = (taskList: any[], emptyMessage: string) => (
    taskList.length > 0 ? (
      <div className="space-y-3">
        {taskList.map((task) => (
          <div key={task.id} className="space-y-1">
            <TaskTypeBadge task={task} />
            <TaskCard
              task={task}
              onDelete={() => deleteTaskMutation.mutate(task.id)}
            />
          </div>
        ))}
      </div>
    ) : (
      <p className="text-center text-muted-foreground py-8">
        {emptyMessage}
      </p>
    )
  );

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
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{projectTasks.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Projeto</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{standaloneTasks.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Avulsas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{routineTasks.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Rotina</p>
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

        {/* Desktop Filters */}
        <div className="hidden md:block">
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

          <TabsContent value="all" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                {renderTaskList(filteredTasks, "Nenhuma tarefa atribuída a você ainda")}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="todo" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>A Fazer</CardTitle>
              </CardHeader>
              <CardContent>
                {renderTaskList(todoTasks, "Nenhuma tarefa para fazer")}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="in_progress" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Em Progresso</CardTitle>
              </CardHeader>
              <CardContent>
                {renderTaskList(inProgressTasks, "Nenhuma tarefa em progresso")}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Concluídas</CardTitle>
              </CardHeader>
              <CardContent>
                {renderTaskList(completedTasks, "Nenhuma tarefa concluída")}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CreateStandaloneTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </AppLayout>
  );
}
