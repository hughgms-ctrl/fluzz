import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2, Eye, Copy } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProjectCardProps {
  project: any;
  onDelete: () => void;
}

export const ProjectCard = ({ project, onDelete }: ProjectCardProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      // 1. Duplicar projeto
      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert([{
          name: `${project.name} (Cópia)`,
          description: project.description,
          status: project.status,
          user_id: project.user_id,
        }])
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Buscar todas as tarefas do projeto original
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", project.id);

      if (tasksError) throw tasksError;

      if (tasks && tasks.length > 0) {
        // 3. Duplicar tarefas
        const tasksToInsert = tasks.map((task) => ({
          project_id: newProject.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assigned_to: task.assigned_to,
          due_date: task.due_date,
          process_id: task.process_id,
          documentation: task.documentation,
        }));

        const { data: newTasks, error: insertTasksError } = await supabase
          .from("tasks")
          .insert(tasksToInsert)
          .select();

        if (insertTasksError) throw insertTasksError;

        // 4. Para cada tarefa, duplicar subtarefas
        for (let i = 0; i < tasks.length; i++) {
          const originalTask = tasks[i];
          const newTask = newTasks[i];

          const { data: subtasks, error: subtasksError } = await supabase
            .from("subtasks")
            .select("*")
            .eq("task_id", originalTask.id);

          if (subtasksError) throw subtasksError;

          if (subtasks && subtasks.length > 0) {
            const subtasksToInsert = subtasks.map((subtask) => ({
              task_id: newTask.id,
              title: subtask.title,
              completed: false,
            }));

            const { error: insertSubtasksError } = await supabase
              .from("subtasks")
              .insert(subtasksToInsert);

            if (insertSubtasksError) throw insertSubtasksError;
          }
        }
      }

      return newProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto duplicado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao duplicar projeto:", error);
      toast.error("Erro ao duplicar projeto");
    },
  });
  
  const totalTasks = project.tasks?.length || 0;
  const completedTasks = project.tasks?.filter((t: any) => t.status === "completed").length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const statusColors = {
    active: "default",
    completed: "default",
    archived: "secondary",
  };

  const statusLabels = {
    active: "Ativo",
    completed: "Concluído",
    archived: "Arquivado",
  };

  return (
    <Card className="hover:shadow-md transition-all hover:scale-[1.02]">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl font-semibold text-foreground line-clamp-1">
            {project.name}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
                <Eye className="mr-2" size={16} />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => duplicateMutation.mutate()}
                disabled={duplicateMutation.isPending}
              >
                <Copy className="mr-2" size={16} />
                Duplicar Projeto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2" size={16} />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
          {project.description || "Sem descrição"}
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {completedTasks} de {totalTasks} tarefas concluídas
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <Badge variant={statusColors[project.status as keyof typeof statusColors] as any}>
          {statusLabels[project.status as keyof typeof statusLabels]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {format(new Date(project.created_at), "dd/MM/yyyy", { locale: ptBR })}
        </span>
      </CardFooter>
    </Card>
  );
};