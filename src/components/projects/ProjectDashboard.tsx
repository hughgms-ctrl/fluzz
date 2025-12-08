import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatDateBR } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
}

interface ProjectDashboardProps {
  tasks: Task[];
  onFilterClick: (filterType: string, filterValue: string) => void;
}

const COLORS = {
  todo: "hsl(var(--chart-1))",
  in_progress: "hsl(var(--chart-2))",
  completed: "hsl(var(--chart-3))",
  overdue: "hsl(var(--destructive))",
};

export function ProjectDashboard({ tasks, onFilterClick }: ProjectDashboardProps) {
  const metrics = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const overdue = tasks.filter(
      (task) =>
        task.due_date &&
        new Date(task.due_date) < now &&
        task.status !== "completed"
    );

    const completed = tasks.filter((task) => task.status === "completed");
    const pending = tasks.filter(
      (task) => task.status === "todo" || task.status === "in_progress"
    );

    const statusDistribution = [
      {
        name: "A Fazer",
        value: tasks.filter((t) => t.status === "todo").length,
        status: "todo",
      },
      {
        name: "Em Progresso",
        value: tasks.filter((t) => t.status === "in_progress").length,
        status: "in_progress",
      },
      {
        name: "Concluído",
        value: tasks.filter((t) => t.status === "completed").length,
        status: "completed",
      },
    ].filter((item) => item.value > 0);

    // Group tasks by assigned user
    const tasksByUser = tasks.reduce((acc, task) => {
      const userId = task.assigned_to || "unassigned";
      if (!acc[userId]) {
        acc[userId] = { todo: 0, in_progress: 0, completed: 0 };
      }
      if (task.status === "todo") acc[userId].todo++;
      else if (task.status === "in_progress") acc[userId].in_progress++;
      else if (task.status === "completed") acc[userId].completed++;
      return acc;
    }, {} as Record<string, { todo: number; in_progress: number; completed: number }>);

    const userDistribution = Object.entries(tasksByUser).map(([userId, counts]) => ({
      user: userId === "unassigned" ? "Não atribuído" : `Usuário ${userId.slice(0, 8)}`,
      "A Fazer": counts.todo,
      "Em Progresso": counts.in_progress,
      Concluído: counts.completed,
      total: counts.todo + counts.in_progress + counts.completed,
    }));

    const completionRate =
      tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

    return {
      overdue,
      completed,
      pending,
      statusDistribution,
      userDistribution,
      completionRate,
      total: tasks.length,
    };
  }, [tasks]);

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    color,
    description,
    onClick,
  }: {
    title: string;
    value: number;
    icon: any;
    color: string;
    description: string;
    onClick: () => void;
  }) => (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tarefas Atrasadas"
          value={metrics.overdue.length}
          icon={AlertCircle}
          color="text-destructive"
          description={
            metrics.overdue.length > 0
              ? "Requerem atenção imediata"
              : "Nenhuma tarefa atrasada"
          }
          onClick={() => onFilterClick("dueDate", "overdue")}
        />
        <MetricCard
          title="Tarefas Concluídas"
          value={metrics.completed.length}
          icon={CheckCircle2}
          color="text-green-600"
          description={`${metrics.completionRate}% do projeto concluído`}
          onClick={() => onFilterClick("status", "completed")}
        />
        <MetricCard
          title="Em Andamento"
          value={tasks.filter((t) => t.status === "in_progress").length}
          icon={TrendingUp}
          color="text-blue-600"
          description="Tarefas em execução"
          onClick={() => onFilterClick("status", "in_progress")}
        />
        <MetricCard
          title="A Fazer"
          value={tasks.filter((t) => t.status === "todo").length}
          icon={Clock}
          color="text-orange-600"
          description="Aguardando início"
          onClick={() => onFilterClick("status", "todo")}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={(data) => onFilterClick("status", data.status)}
                    className="cursor-pointer"
                  >
                    {metrics.statusDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[entry.status as keyof typeof COLORS]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma tarefa no projeto
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Responsável</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.userDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.userDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="user" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="A Fazer" fill={COLORS.todo} />
                  <Bar dataKey="Em Progresso" fill={COLORS.in_progress} />
                  <Bar dataKey="Concluído" fill={COLORS.completed} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma tarefa atribuída
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Tasks List */}
      {metrics.overdue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Tarefas Atrasadas
              <Badge variant="destructive">{metrics.overdue.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.overdue.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/tasks/${task.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Vencimento:{" "}
                      {task.due_date
                        ? formatDateBR(task.due_date)
                        : "Sem prazo"}
                    </p>
                  </div>
                  <Badge variant="destructive">Atrasada</Badge>
                </div>
              ))}
              {metrics.overdue.length > 5 && (
                <button
                  onClick={() => onFilterClick("dueDate", "overdue")}
                  className="text-sm text-primary hover:underline w-full text-center pt-2"
                >
                  Ver todas as {metrics.overdue.length} tarefas atrasadas
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total de Tarefas
              </span>
              <span className="text-2xl font-bold">{metrics.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Taxa de Conclusão
              </span>
              <span className="text-2xl font-bold text-green-600">
                {metrics.completionRate}%
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-green-600 transition-all duration-500"
                style={{ width: `${metrics.completionRate}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">A Fazer</div>
                <div className="text-lg font-semibold">
                  {tasks.filter((t) => t.status === "todo").length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Em Progresso</div>
                <div className="text-lg font-semibold">
                  {tasks.filter((t) => t.status === "in_progress").length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Concluído</div>
                <div className="text-lg font-semibold text-green-600">
                  {metrics.completed.length}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
