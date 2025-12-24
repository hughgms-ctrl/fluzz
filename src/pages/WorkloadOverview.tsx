import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Flame, 
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FolderKanban
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  isPast, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  differenceInDays,
  parseISO,
  isWithinInterval
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateOnly, isTaskOverdue } from "@/lib/utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";
import { useNavigate } from "react-router-dom";

interface TaskWithProject {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  project_id: string | null;
  projects: {
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
  } | null;
}

// Project colors for timeline
const PROJECT_COLORS = [
  "hsl(220, 70%, 50%)",
  "hsl(160, 60%, 45%)",
  "hsl(280, 65%, 55%)",
  "hsl(30, 80%, 55%)",
  "hsl(340, 70%, 50%)",
  "hsl(190, 70%, 45%)",
  "hsl(60, 70%, 45%)",
  "hsl(120, 50%, 45%)",
];

export default function WorkloadOverview() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"month" | "week">("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch all tasks from all projects
  const { data: allTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["all-workspace-tasks", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id, title, status, priority, due_date, start_date, project_id,
          projects(id, name, start_date, end_date, archived, pending_notifications)
        `)
        .order("due_date", { ascending: true });
      
      if (error) throw error;
      
      // Filter out tasks from archived/draft projects
      return (data || []).filter((task: any) => {
        if (!task.project_id) return true; // Standalone tasks
        if (!task.projects) return false;
        if (task.projects.archived) return false;
        if (task.projects.pending_notifications === true) return false;
        return true;
      }) as TaskWithProject[];
    },
    enabled: !!workspace,
  });

  // Fetch all projects for timeline
  const { data: allProjects } = useQuery({
    queryKey: ["all-workspace-projects-timeline", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, start_date, end_date, status")
        .eq("workspace_id", workspace.id)
        .eq("archived", false)
        .neq("pending_notifications", true)
        .order("end_date", { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspace,
  });

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { locale: ptBR });
      const end = endOfWeek(currentDate, { locale: ptBR });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, viewMode]);

  // Group tasks by date for workload chart
  const workloadData = useMemo(() => {
    if (!allTasks) return [];
    
    return dateRange.map((date) => {
      const tasksOnDate = allTasks.filter((task) => {
        if (!task.due_date) return false;
        const dueDate = parseDateOnly(task.due_date);
        return dueDate && isSameDay(dueDate, date);
      });

      const pendingTasks = tasksOnDate.filter(t => t.status !== "completed");
      const completedTasks = tasksOnDate.filter(t => t.status === "completed");
      const highPriorityTasks = pendingTasks.filter(t => t.priority === "high");

      return {
        date: format(date, "dd/MM", { locale: ptBR }),
        fullDate: date,
        total: tasksOnDate.length,
        pending: pendingTasks.length,
        completed: completedTasks.length,
        highPriority: highPriorityTasks.length,
        isToday: isToday(date),
        isOverloaded: pendingTasks.length >= 5,
      };
    });
  }, [allTasks, dateRange]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!allTasks) return { overdue: 0, today: 0, thisWeek: 0, conflicts: 0 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    const overdue = allTasks.filter(task => 
      task.due_date && 
      isTaskOverdue(task.due_date, task.status)
    ).length;

    const todayTasks = allTasks.filter(task => {
      if (!task.due_date) return false;
      const dueDate = parseDateOnly(task.due_date);
      return dueDate && isSameDay(dueDate, today) && task.status !== "completed";
    }).length;

    const thisWeekTasks = allTasks.filter(task => {
      if (!task.due_date) return false;
      const dueDate = parseDateOnly(task.due_date);
      return dueDate && dueDate >= today && dueDate <= weekEnd && task.status !== "completed";
    }).length;

    // Count days with 5+ pending tasks as conflicts
    const conflicts = workloadData.filter(d => d.isOverloaded).length;

    return { overdue, today: todayTasks, thisWeek: thisWeekTasks, conflicts };
  }, [allTasks, workloadData]);

  // Group tasks by project for timeline
  const projectGroups = useMemo(() => {
    if (!allTasks) return [];
    
    const groups = new Map<string, { 
      project: { id: string; name: string; start_date: string | null; end_date: string | null } | null; 
      tasks: TaskWithProject[];
      color: string;
    }>();

    allTasks.forEach((task, index) => {
      const key = task.project_id || "standalone";
      if (!groups.has(key)) {
        groups.set(key, {
          project: task.projects,
          tasks: [],
          color: task.project_id 
            ? PROJECT_COLORS[groups.size % PROJECT_COLORS.length]
            : "hsl(0, 0%, 50%)",
        });
      }
      groups.get(key)!.tasks.push(task);
    });

    return Array.from(groups.entries())
      .filter(([key]) => key !== "standalone")
      .map(([key, value]) => ({ projectId: key, ...value }));
  }, [allTasks]);

  // Navigation handlers
  const navigatePrev = () => {
    if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get tasks for a specific day
  const getTasksForDay = (date: Date) => {
    if (!allTasks) return [];
    return allTasks.filter(task => {
      if (!task.due_date) return false;
      const dueDate = parseDateOnly(task.due_date);
      return dueDate && isSameDay(dueDate, date);
    });
  };

  if (tasksLoading) {
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
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Visão de Carga</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Visualize a distribuição de tarefas entre todos os projetos
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-destructive flex-shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.overdue}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Atrasadas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-warning">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 flex-shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.today}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Para Hoje</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.thisWeek}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Esta Semana</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-l-4 ${stats.conflicts > 0 ? 'border-l-orange-500' : 'border-l-green-500'}`}>
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <Flame className={`h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 ${stats.conflicts > 0 ? 'text-orange-500' : 'text-green-500'}`} />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.conflicts}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Dias Cheios</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="font-medium ml-2 capitalize">
              {viewMode === "week" 
                ? `Semana de ${format(dateRange[0], "dd MMM", { locale: ptBR })} - ${format(dateRange[dateRange.length - 1], "dd MMM", { locale: ptBR })}`
                : format(currentDate, "MMMM yyyy", { locale: ptBR })
              }
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={viewMode === "week" ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode("week")}
            >
              Semana
            </Button>
            <Button 
              variant={viewMode === "month" ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode("month")}
            >
              Mês
            </Button>
          </div>
        </div>

        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="chart">Gráfico</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>

          {/* Chart View */}
          <TabsContent value="chart" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição de Tarefas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] md:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workloadData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        interval={viewMode === "month" ? 2 : 0}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg shadow-lg p-3">
                                <p className="font-medium mb-2">{label}</p>
                                <p className="text-sm text-muted-foreground">
                                  Pendentes: <span className="text-foreground font-medium">{data.pending}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Concluídas: <span className="text-foreground font-medium">{data.completed}</span>
                                </p>
                                {data.highPriority > 0 && (
                                  <p className="text-sm text-destructive">
                                    Alta prioridade: {data.highPriority}
                                  </p>
                                )}
                                {data.isOverloaded && (
                                  <Badge variant="destructive" className="mt-2">Sobrecarga</Badge>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="pending" 
                        name="Pendentes" 
                        stackId="a"
                        radius={[0, 0, 0, 0]}
                      >
                        {workloadData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.isOverloaded ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                          />
                        ))}
                      </Bar>
                      <Bar 
                        dataKey="completed" 
                        name="Concluídas" 
                        stackId="a"
                        fill="hsl(var(--muted))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary" />
                    <span className="text-muted-foreground">Normal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-destructive" />
                    <span className="text-muted-foreground">Sobrecarga (5+ tarefas)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline View */}
          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline por Projeto</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="min-w-[800px]">
                    {/* Timeline Header */}
                    <div className="flex border-b">
                      <div className="w-48 flex-shrink-0 p-2 font-medium text-sm">
                        Projeto
                      </div>
                      <div className="flex-1 flex">
                        {dateRange.map((date) => (
                          <div 
                            key={date.toISOString()} 
                            className={`flex-1 text-center p-2 text-xs border-l ${
                              isToday(date) ? 'bg-primary/10 font-bold' : ''
                            }`}
                          >
                            <div>{format(date, "EEE", { locale: ptBR })}</div>
                            <div>{format(date, "dd")}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Project Rows */}
                    {projectGroups.map((group) => (
                      <div key={group.projectId} className="flex border-b hover:bg-muted/50">
                        <div 
                          className="w-48 flex-shrink-0 p-2 text-sm font-medium truncate flex items-center gap-2 cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/projects/${group.projectId}`)}
                        >
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: group.color }}
                          />
                          <span className="truncate">{group.project?.name || "Projeto"}</span>
                        </div>
                        <div className="flex-1 flex relative h-12">
                          {/* Project bar (if has dates) */}
                          {group.project?.start_date && group.project?.end_date && (
                            (() => {
                              const projectStart = parseISO(group.project.start_date);
                              const projectEnd = parseISO(group.project.end_date);
                              const rangeStart = dateRange[0];
                              const rangeEnd = dateRange[dateRange.length - 1];
                              
                              // Check if project overlaps with visible range
                              if (projectEnd < rangeStart || projectStart > rangeEnd) return null;
                              
                              const visibleStart = projectStart < rangeStart ? rangeStart : projectStart;
                              const visibleEnd = projectEnd > rangeEnd ? rangeEnd : projectEnd;
                              
                              const startIdx = dateRange.findIndex(d => isSameDay(d, visibleStart) || d > visibleStart);
                              const endIdx = dateRange.findIndex(d => isSameDay(d, visibleEnd) || d > visibleEnd);
                              const adjustedEndIdx = endIdx === -1 ? dateRange.length : endIdx + 1;
                              
                              const left = `${(startIdx / dateRange.length) * 100}%`;
                              const width = `${((adjustedEndIdx - startIdx) / dateRange.length) * 100}%`;
                              
                              return (
                                <div 
                                  className="absolute top-1/2 -translate-y-1/2 h-6 rounded opacity-30"
                                  style={{ 
                                    left, 
                                    width,
                                    backgroundColor: group.color,
                                  }}
                                />
                              );
                            })()
                          )}
                          
                          {/* Task dots */}
                          {dateRange.map((date, idx) => {
                            const tasksOnDate = group.tasks.filter(task => {
                              if (!task.due_date) return false;
                              const dueDate = parseDateOnly(task.due_date);
                              return dueDate && isSameDay(dueDate, date);
                            });
                            
                            if (tasksOnDate.length === 0) return (
                              <div 
                                key={date.toISOString()} 
                                className={`flex-1 border-l ${isToday(date) ? 'bg-primary/10' : ''}`}
                              />
                            );
                            
                            const hasOverdue = tasksOnDate.some(t => isTaskOverdue(t.due_date!, t.status));
                            const allCompleted = tasksOnDate.every(t => t.status === "completed");
                            
                            return (
                              <div 
                                key={date.toISOString()} 
                                className={`flex-1 border-l flex items-center justify-center ${isToday(date) ? 'bg-primary/10' : ''}`}
                              >
                                <div 
                                  className={`relative w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer transition-transform hover:scale-110`}
                                  style={{ 
                                    backgroundColor: hasOverdue 
                                      ? "hsl(var(--destructive))" 
                                      : allCompleted 
                                        ? "hsl(142, 76%, 36%)" 
                                        : group.color 
                                  }}
                                  title={`${tasksOnDate.length} tarefa(s)`}
                                >
                                  {tasksOnDate.length}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {projectGroups.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        Nenhum projeto com tarefas encontrado
                      </div>
                    )}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="mt-4">
            <div className="space-y-4">
              {dateRange.map((date) => {
                const tasksForDay = getTasksForDay(date);
                const pendingTasks = tasksForDay.filter(t => t.status !== "completed");
                const isOverloaded = pendingTasks.length >= 5;
                
                if (tasksForDay.length === 0) return null;
                
                return (
                  <Card key={date.toISOString()} className={isOverloaded ? "border-destructive" : ""}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                          {isToday(date) && <Badge>Hoje</Badge>}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {isOverloaded && (
                            <Badge variant="destructive" className="gap-1">
                              <Flame className="h-3 w-3" />
                              Sobrecarga
                            </Badge>
                          )}
                          <Badge variant="outline">{tasksForDay.length} tarefas</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="space-y-2">
                        {tasksForDay.map((task) => {
                          const isOverdue = isTaskOverdue(task.due_date!, task.status);
                          
                          return (
                            <div 
                              key={task.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => navigate(`/tasks/${task.id}`)}
                            >
                              <div className="flex items-center gap-3">
                                {task.status === "completed" ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : isOverdue ? (
                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                ) : (
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                  <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                                    {task.title}
                                  </p>
                                  {task.projects && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <FolderKanban className="h-3 w-3" />
                                      {task.projects.name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {task.priority === "high" && (
                                  <Badge variant="destructive" className="text-xs">Alta</Badge>
                                )}
                                <Badge 
                                  variant={
                                    task.status === "completed" ? "secondary" :
                                    task.status === "in_progress" ? "default" : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {task.status === "completed" ? "Concluída" :
                                   task.status === "in_progress" ? "Em Progresso" : "A Fazer"}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {workloadData.filter(d => d.total > 0).length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhuma tarefa com prazo neste período
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
