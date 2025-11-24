import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, Clock, PlayCircle } from "lucide-react";

export default function MyTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

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
  });

  const { data: projects } = useQuery({
    queryKey: ["my-projects-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
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
      queryClient.invalidateQueries({ queryKey: ["my-tasks", user?.id] });
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
      toast.success("Status atualizado!");
    },
  });

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

    return matchesSearch && matchesPriority && matchesStatus && matchesDueDate && matchesProject;
  }) || [];

  const todoTasks = filteredTasks.filter((t) => t.status === "todo");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Minhas Tarefas</h1>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie todas as tarefas atribuídas a você
          </p>
        </div>

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
        />

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">
              Todas ({filteredTasks.length})
            </TabsTrigger>
            <TabsTrigger value="todo" className="gap-2">
              <Clock size={16} />
              A Fazer ({todoTasks.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="gap-2">
              <PlayCircle size={16} />
              Em Progresso ({inProgressTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle2 size={16} />
              Concluídas ({completedTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                {filteredTasks.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onDelete={() => deleteTaskMutation.mutate(task.id)}
                        onStatusChange={(status) =>
                          updateTaskStatusMutation.mutate({ taskId: task.id, status })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma tarefa atribuída a você ainda
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="todo" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>A Fazer</CardTitle>
              </CardHeader>
              <CardContent>
                {todoTasks.length > 0 ? (
                  <div className="space-y-3">
                    {todoTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onDelete={() => deleteTaskMutation.mutate(task.id)}
                        onStatusChange={(status) =>
                          updateTaskStatusMutation.mutate({ taskId: task.id, status })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma tarefa para fazer
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="in_progress" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Em Progresso</CardTitle>
              </CardHeader>
              <CardContent>
                {inProgressTasks.length > 0 ? (
                  <div className="space-y-3">
                    {inProgressTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onDelete={() => deleteTaskMutation.mutate(task.id)}
                        onStatusChange={(status) =>
                          updateTaskStatusMutation.mutate({ taskId: task.id, status })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma tarefa em progresso
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Concluídas</CardTitle>
              </CardHeader>
              <CardContent>
                {completedTasks.length > 0 ? (
                  <div className="space-y-3">
                    {completedTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onDelete={() => deleteTaskMutation.mutate(task.id)}
                        onStatusChange={(status) =>
                          updateTaskStatusMutation.mutate({ taskId: task.id, status })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma tarefa concluída
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
