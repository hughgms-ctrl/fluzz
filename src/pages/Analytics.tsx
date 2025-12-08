import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const COLORS = {
  completed: "hsl(142, 76%, 36%)",
  in_progress: "hsl(43, 96%, 56%)",
  todo: "hsl(217, 91%, 60%)",
  high: "hsl(0, 84%, 60%)",
  medium: "hsl(43, 96%, 56%)",
  low: "hsl(142, 76%, 36%)",
};

export default function Analytics() {
  const { workspace } = useWorkspace();

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["all-tasks", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          projects!inner(workspace_id)
        `)
        .eq("projects.workspace_id", workspace.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["workspace-projects", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspace.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  if (tasksLoading || projectsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  const statusData = [
    {
      name: "A Fazer",
      value: tasks?.filter((t) => t.status === "todo").length || 0,
      color: COLORS.todo,
    },
    {
      name: "Em Progresso",
      value: tasks?.filter((t) => t.status === "in_progress").length || 0,
      color: COLORS.in_progress,
    },
    {
      name: "Concluído",
      value: tasks?.filter((t) => t.status === "completed").length || 0,
      color: COLORS.completed,
    },
  ];

  const priorityData = [
    {
      name: "Alta",
      value: tasks?.filter((t) => t.priority === "high").length || 0,
      color: COLORS.high,
    },
    {
      name: "Média",
      value: tasks?.filter((t) => t.priority === "medium").length || 0,
      color: COLORS.medium,
    },
    {
      name: "Baixa",
      value: tasks?.filter((t) => t.priority === "low").length || 0,
      color: COLORS.low,
    },
  ];

  const projectStats = projects?.map((project) => ({
    name: project.name.substring(0, 20),
    tarefas: tasks?.filter((t) => t.project_id === project.id).length || 0,
  }));

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t) => t.status === "completed").length || 0;
  const inProgressTasks = tasks?.filter((t) => t.status === "in_progress").length || 0;
  const overdueTasks =
    tasks?.filter(
      (t) =>
        t.due_date &&
        new Date(t.due_date) < new Date() &&
        t.status !== "completed"
    ).length || 0;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Visualize suas métricas e estatísticas de produtividade
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Total de Tarefas</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                {projects?.length || 0} projetos ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Concluídas</CardTitle>
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{completedTasks}</div>
              <p className="text-xs text-muted-foreground">
                Taxa: {completionRate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Em Progresso</CardTitle>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{inProgressTasks}</div>
              <p className="text-xs text-muted-foreground">
                Sendo trabalhadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Atrasadas</CardTitle>
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{overdueTasks}</div>
              <p className="text-xs text-muted-foreground">
                Requerem atenção
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tarefas por Status</CardTitle>
              <CardDescription>
                Distribuição das tarefas por status atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tarefas por Prioridade</CardTitle>
              <CardDescription>
                Distribuição das tarefas por nível de prioridade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tarefas por Projeto</CardTitle>
            <CardDescription>
              Quantidade de tarefas em cada projeto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="tarefas" fill="hsl(24.6, 95%, 53.1%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
