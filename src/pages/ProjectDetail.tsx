import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowLeft, LayoutGrid, List, Users, BarChart3, FileText } from "lucide-react";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { DraggableTaskBoard } from "@/components/tasks/DraggableTaskBoard";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { MobileFilterDrawer } from "@/components/filters/MobileFilterDrawer";
import { ProjectMembers } from "@/components/projects/ProjectMembers";
import { ProjectDashboard } from "@/components/projects/ProjectDashboard";
import { ProjectNotes } from "@/components/projects/ProjectNotes";
import BriefingDebriefingTab from "@/components/briefing/BriefingDebriefingTab";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "tasks" | "notes" | "briefing">("tasks");
  const [view, setView] = useState<"board" | "list">("board");
  const [showMembers, setShowMembers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  const [setorFilter, setSetorFilter] = useState("all");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  
  // Load sort mode from localStorage for this project
  const [sortMode, setSortMode] = useState<"manual" | "az">(() => {
    const saved = localStorage.getItem(`project-sort-mode-${id}`);
    return (saved === "az" || saved === "manual") ? saved : "manual";
  });

  // Persist sort mode changes to localStorage
  const handleSortModeChange = (mode: "manual" | "az") => {
    setSortMode(mode);
    localStorage.setItem(`project-sort-mode-${id}`, mode);
  };

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setProjectName(data.name);
      setProjectDescription(data.description || "");
      return data;
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ name, description }: { name?: string; description?: string }) => {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description || null;
      
      const { error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto atualizado!");
      setIsEditingName(false);
      setIsEditingDescription(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar projeto");
      setProjectName(project?.name || "");
      setProjectDescription(project?.description || "");
    },
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Real-time updates for tasks
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('project-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tasks", id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      toast.success("Tarefa excluída com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir tarefa");
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      console.log("ProjectDetail - Atualizando status:", { taskId, status });
      const { data, error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", taskId)
        .select();
      if (error) {
        console.error("ProjectDetail - Erro Supabase:", error);
        throw error;
      }
      console.log("ProjectDetail - Resposta Supabase:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("ProjectDetail - onSuccess:", data);
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      console.error("ProjectDetail - onError:", error);
      toast.error("Erro ao atualizar status");
    },
  });

  const updateTaskOrderMutation = useMutation({
    mutationFn: async ({ taskId, newOrder, status }: { taskId: string; newOrder: number; status: string }) => {
      // Get all tasks with same status and update their orders
      const tasksToUpdate = tasks?.filter(t => t.status === status) || [];
      const oldIndex = tasksToUpdate.findIndex(t => t.id === taskId);
      
      if (oldIndex === -1) return;
      
      // Reorder tasks
      const reordered = [...tasksToUpdate].sort((a, b) => (a.task_order || 0) - (b.task_order || 0));
      const movedTask = reordered.find(t => t.id === taskId);
      if (!movedTask) return;
      
      const movedIndex = reordered.indexOf(movedTask);
      reordered.splice(movedIndex, 1);
      reordered.splice(newOrder, 0, movedTask);
      
      // Update all task orders
      for (let i = 0; i < reordered.length; i++) {
        const { error } = await supabase
          .from("tasks")
          .update({ task_order: i })
          .eq("id", reordered[i].id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    },
    onError: () => {
      toast.error("Erro ao reordenar tarefa");
    },
  });

  // Apply filters
  const filteredTasks = tasks?.filter((task) => {
    const matchesSearch =
      searchTerm === "" ||
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesSetor = setorFilter === "all" || task.setor === setorFilter;

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

    return matchesSearch && matchesPriority && matchesStatus && matchesDueDate && matchesSetor;
  }) || [];

  const uniqueSetores = Array.from(new Set(tasks?.filter(t => t.setor).map(t => t.setor))) as string[];

  const isOwner = project?.user_id === user?.id;

  const activeFiltersCount = [
    searchTerm !== "",
    priorityFilter !== "all",
    statusFilter !== "all",
    dueDateFilter !== "all",
    setorFilter !== "all",
  ].filter(Boolean).length;

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setPriorityFilter("all");
    setStatusFilter("all");
    setDueDateFilter("all");
    setSetorFilter("all");
  };

  const handleNameBlur = () => {
    if (projectName.trim() && projectName !== project?.name) {
      updateProjectMutation.mutate({ name: projectName.trim() });
    } else {
      setIsEditingName(false);
      setProjectName(project?.name || "");
    }
  };

  const handleDescriptionBlur = () => {
    if (projectDescription !== (project?.description || "")) {
      updateProjectMutation.mutate({ description: projectDescription.trim() });
    } else {
      setIsEditingDescription(false);
      setProjectDescription(project?.description || "");
    }
  };

  const handleDashboardFilterClick = (filterType: string, filterValue: string) => {
    setActiveTab("tasks");
    if (filterType === "status") {
      setStatusFilter(filterValue);
    } else if (filterType === "dueDate") {
      setDueDateFilter(filterValue);
    }
  };

  if (projectLoading || tasksLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">Projeto não encontrado</p>
          <Button onClick={() => navigate("/projects")}>Voltar aos Projetos</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-2 sm:gap-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/projects")}
              className="flex-shrink-0 mt-1"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNameBlur();
                    if (e.key === "Escape") {
                      setProjectName(project?.name || "");
                      setIsEditingName(false);
                    }
                  }}
                  className="text-xl sm:text-2xl md:text-3xl font-bold h-auto py-1 max-w-full"
                  autoFocus
                />
              ) : (
                <h1 
                  className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer break-words"
                  onClick={() => setIsEditingName(true)}
                >
                  {project.name}
                </h1>
              )}
              {isEditingDescription ? (
                <Input
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleDescriptionBlur();
                    if (e.key === "Escape") {
                      setProjectDescription(project?.description || "");
                      setIsEditingDescription(false);
                    }
                  }}
                  className="text-sm text-muted-foreground mt-1 max-w-full"
                  placeholder="Adicione uma descrição..."
                  autoFocus
                />
              ) : (
                <p 
                  className="text-xs sm:text-sm text-muted-foreground mt-1 hover:text-foreground transition-colors cursor-pointer line-clamp-2"
                  onClick={() => setIsEditingDescription(true)}
                >
                  {project.description || "Clique para adicionar descrição..."}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowMembers(!showMembers)}
              className="gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
              size="sm"
            >
              <Users size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Membros</span>
              <span className="sm:hidden">Membros</span>
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 flex-1 sm:flex-initial text-xs sm:text-sm" size="sm">
              <Plus size={14} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Nova Tarefa</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
        </div>

        {showMembers && (
          <ProjectMembers projectId={id!} isOwner={isOwner} />
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "dashboard" | "tasks" | "notes" | "briefing")}>
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="tasks" className="gap-2">
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Tarefas</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              <FileText size={16} />
              <span className="hidden sm:inline">Notas</span>
            </TabsTrigger>
            <TabsTrigger value="briefing" className="gap-2">
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Briefing</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <ProjectDashboard 
              tasks={tasks || []} 
              onFilterClick={handleDashboardFilterClick}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-6 space-y-4">
            {/* Mobile Filter Drawer */}
            <MobileFilterDrawer
              title="Filtrar Tarefas"
              description="Filtre as tarefas por diferentes critérios"
              activeFiltersCount={activeFiltersCount}
              open={isFilterDrawerOpen}
              onOpenChange={setIsFilterDrawerOpen}
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
                setorFilter={setorFilter}
                onSetorChange={setSetorFilter}
                setores={uniqueSetores}
                onClearAll={handleClearAllFilters}
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
                setorFilter={setorFilter}
                onSetorChange={setSetorFilter}
                setores={uniqueSetores}
                onClearAll={handleClearAllFilters}
              />
            </div>

            {/* View Toggle */}
            <div className="flex justify-end">
              <Tabs value={view} onValueChange={(v) => setView(v as "board" | "list")}>
                <TabsList>
                  <TabsTrigger value="board" className="gap-2">
                    <LayoutGrid size={16} />
                    <span className="hidden sm:inline">Kanban</span>
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-2">
                    <List size={16} />
                    <span className="hidden sm:inline">Lista</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {filteredTasks && filteredTasks.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">
                  {tasks && tasks.length > 0
                    ? "Nenhuma tarefa corresponde aos filtros aplicados."
                    : "Nenhuma tarefa neste projeto. Comece criando uma!"}
                </p>
                {(!tasks || tasks.length === 0) && (
                  <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <Plus size={20} />
                    Criar Primeira Tarefa
                  </Button>
                )}
              </div>
            ) : (
              <>
                {view === "board" ? (
                  <DraggableTaskBoard
                    tasks={filteredTasks || []}
                    onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
                    onUpdateStatus={(taskId, status) =>
                      updateTaskStatusMutation.mutate({ taskId, status })
                    }
                    onUpdateOrder={(taskId, newOrder, status) =>
                      updateTaskOrderMutation.mutate({ taskId, newOrder, status })
                    }
                    sortMode={sortMode}
                    onSortModeChange={handleSortModeChange}
                  />
                ) : (
                  <TaskList
                    tasks={filteredTasks || []}
                    onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
                    sortMode={sortMode}
                    onSortModeChange={handleSortModeChange}
                  />
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-6">
            <ProjectNotes projectId={id!} tasks={tasks || []} />
          </TabsContent>

          <TabsContent value="briefing" className="mt-6">
            <BriefingDebriefingTab projectId={id!} />
          </TabsContent>
        </Tabs>
      </div>

      <CreateTaskDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        projectId={id!}
      />
    </AppLayout>
  );
}