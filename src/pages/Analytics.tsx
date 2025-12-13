import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { TrendingUp, CheckCircle2, Clock, AlertCircle, FolderOpen, User, RefreshCw, ChevronDown, ChevronRight, Calendar, Users } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = {
  completed: "hsl(142, 76%, 36%)",
  in_progress: "hsl(43, 96%, 56%)",
  todo: "hsl(217, 91%, 60%)",
  high: "hsl(0, 84%, 60%)",
  medium: "hsl(43, 96%, 56%)",
  low: "hsl(142, 76%, 36%)",
};

// Natural sort function
const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
};

export default function Analytics() {
  const { workspace } = useWorkspace();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlFilter = searchParams.get("filter");
  
  // Set initial tab based on URL filter
  const getInitialTab = () => {
    if (urlFilter === "completed") return "completed";
    if (urlFilter === "pending") return "pending";
    if (urlFilter === "overdue") return "overdue";
    return "all";
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [selectedMember, setSelectedMember] = useState<string>("all");
  
  // Update tab when URL filter changes
  useEffect(() => {
    if (urlFilter) {
      setActiveTab(getInitialTab());
    }
  }, [urlFilter]);

  // Fetch all project tasks
  const { data: projectTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["analytics-project-tasks", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          projects!inner(id, name, workspace_id, archived, is_standalone_folder)
        `)
        .eq("projects.workspace_id", workspace.id)
        .eq("projects.archived", false);
      
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  // Fetch standalone tasks (no project)
  const { data: standaloneTasks } = useQuery({
    queryKey: ["analytics-standalone-tasks", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      // Get all workspace members
      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace.id);
      
      if (!members || members.length === 0) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .is("project_id", null)
        .is("routine_id", null)
        .in("assigned_to", members.map(m => m.user_id));
      
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  // Fetch routine tasks
  const { data: routineTasks } = useQuery({
    queryKey: ["analytics-routine-tasks", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      // Get all workspace members
      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace.id);
      
      if (!members || members.length === 0) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .not("routine_id", "is", null)
        .in("assigned_to", members.map(m => m.user_id));
      
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  // Fetch profiles for assignee names
  const { data: profiles } = useQuery({
    queryKey: ["analytics-profiles", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace.id);
      
      if (!members || members.length === 0) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", members.map(m => m.user_id));
      
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  // Fetch workspace members for filter dropdown
  const { data: workspaceMembers } = useQuery({
    queryKey: ["analytics-members", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data: members, error } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace.id);
      
      if (error) throw error;
      
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", members?.map(m => m.user_id) || []);
      
      return profilesData || [];
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
        .eq("workspace_id", workspace.id)
        .eq("archived", false)
        .eq("is_standalone_folder", false);
      
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  // Combine all tasks
  const allTasksRaw = useMemo(() => {
    return [...(projectTasks || []), ...(standaloneTasks || []), ...(routineTasks || [])];
  }, [projectTasks, standaloneTasks, routineTasks]);

  // Filter by selected member
  const allTasks = useMemo(() => {
    if (selectedMember === "all") return allTasksRaw;
    return allTasksRaw.filter(t => t.assigned_to === selectedMember);
  }, [allTasksRaw, selectedMember]);

  // Get profile name helper
  const getProfileName = (userId: string | null) => {
    if (!userId) return "Não atribuído";
    const profile = profiles?.find(p => p.id === userId);
    return profile?.full_name || "Usuário";
  };

  // Get task type helper
  const getTaskType = (task: any): "project" | "standalone" | "routine" => {
    if (task.routine_id || task.recurring_task_id) return "routine";
    if (!task.project_id) return "standalone";
    return "project";
  };

  // Filter tasks based on tab
  const getFilteredTasks = (tab: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (tab) {
      case "completed":
        return allTasks.filter(t => t.status === "completed");
      case "pending":
        return allTasks.filter(t => t.status !== "completed");
      case "overdue":
        return allTasks.filter(t => 
          t.due_date && 
          new Date(t.due_date) < today && 
          t.status !== "completed"
        );
      default:
        return allTasks;
    }
  };

  const filteredTasks = useMemo(() => getFilteredTasks(activeTab), [allTasks, activeTab]);

  // Group tasks by type and project
  const groupedTasks = useMemo(() => {
    const groups: { 
      projects: { [key: string]: { name: string; tasks: any[] } };
      standalone: any[];
      routine: any[];
    } = {
      projects: {},
      standalone: [],
      routine: []
    };

    filteredTasks.forEach(task => {
      const type = getTaskType(task);
      
      if (type === "standalone") {
        groups.standalone.push(task);
      } else if (type === "routine") {
        groups.routine.push(task);
      } else if (task.project_id) {
        if (!groups.projects[task.project_id]) {
          // Get project name from projectTasks which has the join
          const projectTask = projectTasks?.find(pt => pt.project_id === task.project_id);
          groups.projects[task.project_id] = {
            name: projectTask?.projects?.name || "Projeto",
            tasks: []
          };
        }
        groups.projects[task.project_id].tasks.push(task);
      }
    });

    return groups;
  }, [filteredTasks, projectTasks]);

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
      value: allTasks?.filter((t) => t.status === "todo").length || 0,
      color: COLORS.todo,
    },
    {
      name: "Em Progresso",
      value: allTasks?.filter((t) => t.status === "in_progress").length || 0,
      color: COLORS.in_progress,
    },
    {
      name: "Concluído",
      value: allTasks?.filter((t) => t.status === "completed").length || 0,
      color: COLORS.completed,
    },
  ];

  const priorityData = [
    {
      name: "Alta",
      value: allTasks?.filter((t) => t.priority === "high").length || 0,
      color: COLORS.high,
    },
    {
      name: "Média",
      value: allTasks?.filter((t) => t.priority === "medium").length || 0,
      color: COLORS.medium,
    },
    {
      name: "Baixa",
      value: allTasks?.filter((t) => t.priority === "low").length || 0,
      color: COLORS.low,
    },
  ];

  const projectStats = projects?.map((project) => ({
    name: project.name.substring(0, 20),
    tarefas: projectTasks?.filter((t) => t.project_id === project.id).length || 0,
  }));

  const totalTasks = allTasks?.length || 0;
  const completedTasks = allTasks?.filter((t) => t.status === "completed").length || 0;
  const inProgressTasks = allTasks?.filter((t) => t.status === "in_progress").length || 0;
  const overdueTasks =
    allTasks?.filter(
      (t) =>
        t.due_date &&
        new Date(t.due_date) < new Date() &&
        t.status !== "completed"
    ).length || 0;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const TaskItem = ({ task }: { task: any }) => {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
    
    const priorityColors = {
      high: "destructive",
      medium: "default",
      low: "secondary",
    };
    
    const priorityLabels = {
      high: "Alta",
      medium: "Média",
      low: "Baixa",
    };
    
    const statusLabels = {
      todo: "A Fazer",
      in_progress: "Fazendo",
      completed: "Concluído"
    };
    
    const statusColors = {
      todo: "bg-status-todo text-status-todo-foreground",
      in_progress: "bg-status-in-progress text-status-in-progress-foreground",
      completed: "bg-status-completed text-status-completed-foreground",
    };
    
    return (
      <Card 
        className="p-3 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => navigate(`/tasks/${task.id}`)}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-medium text-sm flex-1 ${isOverdue ? "text-destructive" : "text-foreground"}`}>
              {task.title}
            </h3>
          </div>
          
          <div className="flex flex-wrap gap-1.5 items-center">
            <Badge 
              variant={priorityColors[task.priority as keyof typeof priorityColors] as any}
              className="text-xs px-2 py-0 h-5"
            >
              {priorityLabels[task.priority as keyof typeof priorityLabels]}
            </Badge>
            
            <Badge className={`text-xs px-2 py-0 h-5 ${statusColors[task.status as keyof typeof statusColors]}`}>
              {statusLabels[task.status as keyof typeof statusLabels]}
            </Badge>
            
            {task.due_date && (
              <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
              </div>
            )}
            
            <span className="text-xs text-muted-foreground">
              {getProfileName(task.assigned_to)}
            </span>
          </div>
        </div>
      </Card>
    );
  };

  const CollapsibleTaskGroup = ({ 
    title, 
    icon: Icon, 
    iconColor, 
    tasks 
  }: { 
    title: string; 
    icon: any; 
    iconColor: string; 
    tasks: any[];
  }) => {
    const [isOpen, setIsOpen] = useState(true);
    
    if (tasks.length === 0) return null;
    
    // Sort tasks by title using natural sort
    const sortedTasks = [...tasks].sort((a, b) => naturalSort(a.title, b.title));
    
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 hover:bg-accent/50 rounded-lg transition-colors">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="font-medium">{title}</span>
          <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-8 space-y-2 mt-2">
          {sortedTasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const pendingCount = allTasks.filter(t => t.status !== "completed").length;

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Visão geral de todas as tarefas e projetos do workspace
            </p>
          </div>
          
          {/* Member Filter */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os membros</SelectItem>
                {workspaceMembers?.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name || "Usuário"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow" 
            onClick={() => setActiveTab("all")}
          >
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

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow" 
            onClick={() => setActiveTab("completed")}
          >
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

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow" 
            onClick={() => setActiveTab("pending")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">
                A fazer + em progresso
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer hover:shadow-md transition-shadow ${overdueTasks > 0 ? "border-destructive" : ""}`}
            onClick={() => setActiveTab("overdue")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className={`text-xs sm:text-sm font-medium ${overdueTasks > 0 ? "text-destructive" : ""}`}>Atrasadas</CardTitle>
              <AlertCircle className={`h-3 w-3 sm:h-4 sm:w-4 ${overdueTasks > 0 ? "text-destructive" : "text-red-600"}`} />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              <div className={`text-xl sm:text-2xl font-bold ${overdueTasks > 0 ? "text-destructive" : ""}`}>{overdueTasks}</div>
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

        {/* Task List Section */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Tarefas</CardTitle>
            <CardDescription>
              Visualize todas as tarefas separadas por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4">
                <TabsTrigger value="all" className="text-xs sm:text-sm">
                  Todas ({totalTasks})
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm">
                  Concluídas ({completedTasks})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs sm:text-sm">
                  Pendentes ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="overdue" className="text-xs sm:text-sm">
                  Atrasadas ({overdueTasks})
                </TabsTrigger>
              </TabsList>

              {["all", "completed", "pending", "overdue"].map(tab => (
                <TabsContent key={tab} value={tab} className="space-y-4">
                  {filteredTasks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma tarefa encontrada
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Projects */}
                      {Object.entries(groupedTasks.projects)
                        .sort(([, a], [, b]) => naturalSort(a.name, b.name))
                        .map(([projectId, group]) => (
                          <CollapsibleTaskGroup
                            key={projectId}
                            title={group.name}
                            icon={FolderOpen}
                            iconColor="text-blue-500"
                            tasks={group.tasks}
                          />
                        ))
                      }

                      {/* Standalone Tasks */}
                      <CollapsibleTaskGroup
                        title="Tarefas Avulsas"
                        icon={User}
                        iconColor="text-purple-500"
                        tasks={groupedTasks.standalone}
                      />

                      {/* Routine Tasks */}
                      <CollapsibleTaskGroup
                        title="Tarefas de Rotina"
                        icon={RefreshCw}
                        iconColor="text-green-500"
                        tasks={groupedTasks.routine}
                      />
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}