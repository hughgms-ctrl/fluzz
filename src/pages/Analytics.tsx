import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["all-tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          projects!inner(user_id)
        `)
        .eq('projects.user_id', user!.id);
      if (error) throw error;
      return data;
    },
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["user-projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Visualize suas métricas e estatísticas de produtividade
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                {projects?.length || 0} projetos ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasks}</div>
              <p className="text-xs text-muted-foreground">
                Taxa de conclusão: {completionRate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Progresso</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressTasks}</div>
              <p className="text-xs text-muted-foreground">
                Tarefas sendo trabalhadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overdueTasks}</div>
              <p className="text-xs text-muted-foreground">
                Requerem atenção imediata
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
