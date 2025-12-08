import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Calendar, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { renderDocumentation } from "@/lib/linkify";

interface ProjectNotesProps {
  projectId: string;
  tasks: any[];
}

export function ProjectNotes({ projectId, tasks }: ProjectNotesProps) {
  const navigate = useNavigate();

  // Fetch profiles for assigned users
  const { data: profiles } = useQuery({
    queryKey: ["task-profiles", projectId],
    queryFn: async () => {
      const userIds = [...new Set(tasks?.filter(t => t.assigned_to).map(t => t.assigned_to))];
      if (userIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      
      if (error) throw error;
      
      return data?.reduce((acc, profile) => {
        acc[profile.id] = profile.full_name;
        return acc;
      }, {} as Record<string, string>) || {};
    },
    enabled: !!tasks && tasks.length > 0,
  });

  // Filter tasks that have documentation
  const tasksWithNotes = tasks?.filter(task => task.documentation && task.documentation.trim() !== "") || [];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "todo": return "A Fazer";
      case "in_progress": return "Em Progresso";
      case "review": return "Em Revisão";
      case "completed": return "Concluída";
      default: return status;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "todo": return "secondary";
      case "in_progress": return "default";
      case "review": return "outline";
      case "completed": return "default";
      default: return "secondary";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-500";
      case "medium": return "text-yellow-500";
      case "low": return "text-green-500";
      default: return "text-muted-foreground";
    }
  };

  if (tasksWithNotes.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma nota encontrada</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          As notas aparecerão aqui quando os membros adicionarem informações no campo 
          "Informações Gerais" das tarefas deste projeto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Notas do Projeto</h2>
          <p className="text-sm text-muted-foreground">
            {tasksWithNotes.length} {tasksWithNotes.length === 1 ? "tarefa com notas" : "tarefas com notas"}
          </p>
        </div>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {tasksWithNotes.map((task) => (
            <Card 
              key={task.id} 
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/tasks/${task.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-medium text-foreground line-clamp-2">
                    {task.title}
                  </CardTitle>
                  <Badge variant={getStatusVariant(task.status) as any} className="flex-shrink-0">
                    {getStatusLabel(task.status)}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                  {task.assigned_to && profiles?.[task.assigned_to] && (
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      <span>{profiles[task.assigned_to]}</span>
                    </div>
                  )}
                  {task.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{new Date(task.due_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                  {task.setor && (
                    <Badge variant="outline" className="text-xs">
                      {task.setor}
                    </Badge>
                  )}
                  {task.priority && (
                    <span className={`${getPriorityColor(task.priority)} capitalize`}>
                      {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap">
                  {renderDocumentation(task.documentation)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
