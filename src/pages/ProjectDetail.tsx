import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowLeft, LayoutGrid, List, Users } from "lucide-react";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { ProjectMembers } from "@/components/projects/ProjectMembers";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [view, setView] = useState<"board" | "list">("board");
  const [showMembers, setShowMembers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState("");

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
      return data;
    },
  });

  const updateProjectNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ name: newName })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Nome do projeto atualizado!");
      setIsEditingName(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar nome");
      setProjectName(project?.name || "");
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
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
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

    return matchesSearch && matchesPriority && matchesStatus && matchesDueDate;
  }) || [];

  const isOwner = project?.user_id === user?.id;

  const handleNameBlur = () => {
    if (projectName.trim() && projectName !== project?.name) {
      updateProjectNameMutation.mutate(projectName.trim());
    } else {
      setIsEditingName(false);
      setProjectName(project?.name || "");
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
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/projects")}
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
                  className="text-3xl font-bold h-12 max-w-2xl"
                  autoFocus
                />
              ) : (
                <h1 
                  className="text-3xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                  onClick={() => setIsEditingName(true)}
                >
                  {project.name}
                </h1>
              )}
              <p className="text-muted-foreground mt-1">{project.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMembers(!showMembers)}
              className="gap-2"
            >
              <Users size={16} />
              Membros
            </Button>
            <Tabs value={view} onValueChange={(v) => setView(v as "board" | "list")}>
              <TabsList>
                <TabsTrigger value="board" className="gap-2">
                  <LayoutGrid size={16} />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List size={16} />
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus size={20} />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {showMembers && (
          <ProjectMembers projectId={id!} isOwner={isOwner} />
        )}

        <TaskFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          dueDateFilter={dueDateFilter}
          onDueDateChange={setDueDateFilter}
        />

        {filteredTasks && filteredTasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">
              Nenhuma tarefa neste projeto. Comece criando uma!
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus size={20} />
              Criar Primeira Tarefa
            </Button>
          </div>
        ) : (
          <>
            {view === "board" ? (
              <TaskBoard
                tasks={filteredTasks || []}
                onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
                onUpdateStatus={(taskId, status) =>
                  updateTaskStatusMutation.mutate({ taskId, status })
                }
              />
            ) : (
              <TaskList
                tasks={filteredTasks || []}
                onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
              />
            )}
          </>
        )}
      </div>

      <CreateTaskDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        projectId={id!}
      />
    </AppLayout>
  );
}