import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { FileText, ListTodo, FolderKanban, UserPlus, Plus, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { CreateUnifiedTaskDialog } from "@/components/tasks/CreateUnifiedTaskDialog";
import { toast } from "sonner";

export default function Home() {
  const navigate = useNavigate();
  const { workspace, canCreateTasks } = useWorkspace();
  const { user } = useAuth();
  const [showCreateTask, setShowCreateTask] = useState(false);

  const checkDeadlinesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "check-task-deadlines",
        {
          body: { manual: true },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Verificação concluída! ${data.notifications_created} notificações criadas.`
      );
    },
    onError: (error: any) => {
      console.error("Erro ao verificar prazos:", error);
      toast.error(error.message || "Erro ao verificar prazos das tarefas");
    },
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!workspace,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["home-tasks", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];

      const { data: projectsData } = await supabase
        .from("projects")
        .select("id")
        .eq("workspace_id", workspace.id);
      
      if (!projectsData || projectsData.length === 0) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(name)")
        .in("project_id", projectsData.map(p => p.id))
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!workspace,
  });

  const activeProjects = projects?.filter(p => p.status === "active" && !p.archived).length || 0;
  const completedTasks = tasks?.filter(t => t.status === "completed").length || 0;
  const pendingTasks = tasks?.filter(t => t.status !== "completed").length || 0;
  const overdueTasks = tasks?.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
  ).length || 0;

  if (projectsLoading || tasksLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Home</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1 sm:mt-2">
              Visão geral dos seus projetos e tarefas
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => checkDeadlinesMutation.mutate()}
              disabled={checkDeadlinesMutation.isPending}
              title="Verificar prazos de tarefas manualmente"
              className="flex-1 sm:flex-none text-xs sm:text-sm"
              size="sm"
            >
              <Bell className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{checkDeadlinesMutation.isPending ? "Verificando..." : "Verificar Prazos"}</span>
              <span className="sm:hidden">Verificar</span>
            </Button>
            {canCreateTasks && (
              <Button onClick={() => setShowCreateTask(true)} size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm sm:size-default">
                <Plus className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Criar Tarefa</span>
                <span className="sm:hidden">Criar</span>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary"
            onClick={() => navigate("/projects")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Projetos Ativos
              </CardTitle>
              <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-foreground">{activeProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Clique para ver todos
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Tarefas Concluídas
              </CardTitle>
              <ListTodo className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-foreground">{completedTasks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de tarefas finalizadas
              </p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary"
            onClick={() => navigate("/my-tasks")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Tarefas Pendentes
              </CardTitle>
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-foreground">{pendingTasks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Clique para ver suas tarefas
              </p>
            </CardContent>
          </Card>

          <Card className={`hover:shadow-lg transition-all border-l-4 ${
            overdueTasks > 0 ? "border-l-destructive" : "border-l-primary"
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className={`text-xs sm:text-sm font-medium ${
                overdueTasks > 0 ? "text-destructive" : "text-muted-foreground"
              }`}>
                Tarefas Atrasadas
              </CardTitle>
              <UserPlus className={`h-4 w-4 sm:h-5 sm:w-5 ${
                overdueTasks > 0 ? "text-destructive" : "text-primary"
              }`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl sm:text-3xl font-bold ${
                overdueTasks > 0 ? "text-destructive" : "text-foreground"
              }`}>
                {overdueTasks}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {overdueTasks > 0 ? "Requer atenção imediata" : "Tudo em dia!"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Projetos Recentes
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Seus projetos mais recentes</CardDescription>
            </CardHeader>
            <CardContent>
              {!projects || projects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Nenhum projeto ainda</p>
                  <Button onClick={() => navigate("/projects")}>
                    Criar Primeiro Projeto
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {project.name}
                        </p>
                        {project.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          project.status === "completed"
                            ? "default"
                            : project.status === "active"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {project.status === "completed"
                          ? "Concluído"
                          : project.status === "active"
                          ? "Ativo"
                          : "Pausado"}
                      </Badge>
                    </div>
                  ))}
                  {projects.length > 5 && (
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => navigate("/projects")}
                    >
                      Ver Todos os Projetos ({projects.length})
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ListTodo className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Acesso Rápido
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Links úteis para seu trabalho</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/my-tasks")}
                >
                  <ListTodo className="mr-2 h-4 w-4" />
                  Minhas Tarefas
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/projects")}
                >
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Ver Todos os Projetos
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/positions")}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Cargos e Rotinas
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/workspace")}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Workspace
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateUnifiedTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
      />
    </AppLayout>
  );
}
