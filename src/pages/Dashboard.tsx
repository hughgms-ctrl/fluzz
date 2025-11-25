import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, CheckSquare, Clock, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id");
      
      if (!projectsData) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(name)")
        .in("project_id", projectsData.map(p => p.id))
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const activeProjects = projects?.filter(p => p.status === "active").length || 0;
  const completedTasks = tasks?.filter(t => t.status === "completed").length || 0;
  const pendingTasks = tasks?.filter(t => t.status !== "completed").length || 0;
  const overdueTasks = tasks?.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
  ) || [];
  const urgentTasks = tasks?.filter(t => 
    t.due_date && new Date(t.due_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && t.status !== "completed"
  ).length || 0;

  const recentTasks = tasks?.slice(0, 5) || [];

  const priorityColors = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  };

  const statusLabels = {
    todo: "A Fazer",
    in_progress: "Em Progresso",
    completed: "Concluído",
  };

  if (projectsLoading || tasksLoading) {
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral dos seus projetos e tarefas</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Projetos Ativos
              </CardTitle>
              <FolderKanban className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{activeProjects}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tarefas Concluídas
              </CardTitle>
              <CheckSquare className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{completedTasks}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tarefas Pendentes
              </CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{pendingTasks}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-destructive/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-destructive">
                Tarefas Atrasadas
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{overdueTasks.length}</div>
            </CardContent>
          </Card>
        </div>

        {overdueTasks.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Tarefas Atrasadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overdueTasks.slice(0, 5).map((task: any) => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
                  return (
                    <Link key={task.id} to={`/tasks/${task.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.projects?.name || "Projeto desconhecido"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant={priorityColors[task.priority as keyof typeof priorityColors] as any}>
                            {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                          </Badge>
                          <Badge variant="outline">
                            {statusLabels[task.status as keyof typeof statusLabels]}
                          </Badge>
                          <span className="text-xs text-destructive font-medium whitespace-nowrap flex items-center gap-1">
                            <Clock size={12} />
                            {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {overdueTasks.length > 5 && (
                <p className="text-sm text-muted-foreground text-center mt-3">
                  E mais {overdueTasks.length - 5} tarefa(s) atrasada(s)
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Tarefas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma tarefa encontrada. Comece criando um projeto!
              </p>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task: any) => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
                  return (
                    <Link key={task.id} to={`/tasks/${task.id}`}>
                      <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isOverdue 
                          ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10" 
                          : "border-border hover:bg-muted/50"
                      }`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.projects?.name || "Projeto desconhecido"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant={priorityColors[task.priority as keyof typeof priorityColors] as any}>
                            {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                          </Badge>
                          <Badge variant="outline">
                            {statusLabels[task.status as keyof typeof statusLabels]}
                          </Badge>
                          {task.due_date && (
                            <span className={`text-xs whitespace-nowrap flex items-center gap-1 ${
                              isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                            }`}>
                              <Clock size={12} />
                              {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link to="/projects">Ver todos os projetos</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}