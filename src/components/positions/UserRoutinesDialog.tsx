import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileText, Flag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

interface UserRoutinesDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const recurrenceLabels: Record<string, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
  custom: "Personalizada",
};

const priorityLabels: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const priorityColors = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

export function UserRoutinesDialog({ userId, open, onOpenChange }: UserRoutinesDialogProps) {
  const { user } = useAuth();
  const canEdit = user?.id === userId;

  const { data: userName } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data.full_name;
    },
    enabled: open,
  });

  const { data: userPositions, isLoading: loadingPositions } = useQuery({
    queryKey: ["user-positions-with-routines", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_positions")
        .select(`
          position_id,
          positions!inner(
            id,
            name,
            description
          )
        `)
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: routines, isLoading: loadingRoutines } = useQuery({
    queryKey: ["user-routines", userId, userPositions],
    queryFn: async () => {
      if (!userPositions || userPositions.length === 0) return [];

      const positionIds = userPositions.map((up: any) => up.position_id);

      const { data, error } = await supabase
        .from("routines")
        .select(`
          id,
          name,
          description,
          recurrence_type,
          start_date,
          position_id,
          positions!inner(name)
        `)
        .in("position_id", positionIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get routine tasks for each routine
      const routinesWithTasks = await Promise.all(
        data.map(async (routine) => {
          const { data: tasks } = await supabase
            .from("routine_tasks")
            .select(`
              id,
              title,
              description,
              priority,
              status,
              setor,
              documentation,
              projects(id, name),
              process_documentation(id, title)
            `)
            .eq("routine_id", routine.id)
            .order("task_order");

          return {
            ...routine,
            tasks: tasks || [],
          };
        })
      );

      return routinesWithTasks;
    },
    enabled: open && !!userPositions && userPositions.length > 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Rotinas de {userName || "Carregando..."}
          </DialogTitle>
          {!canEdit && (
            <p className="text-sm text-muted-foreground">
              Modo visualização - você não pode editar estas rotinas
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {loadingPositions || loadingRoutines ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : routines && routines.length > 0 ? (
            routines.map((routine: any) => (
              <Card key={routine.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{routine.name}</CardTitle>
                      <CardDescription>
                        {routine.positions.name} • {recurrenceLabels[routine.recurrence_type]}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar size={14} />
                      {format(new Date(routine.start_date), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                  {routine.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {routine.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-sm font-medium mb-3">Tarefas da Rotina:</p>
                    {routine.tasks && routine.tasks.length > 0 ? (
                      <div className="space-y-3">
                        {routine.tasks.map((task: any) => (
                          <div
                            key={task.id}
                            className="p-3 border rounded-lg bg-muted/30"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium">{task.title}</h4>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={priorityColors[task.priority as keyof typeof priorityColors] as any}
                                >
                                  <Flag size={12} className="mr-1" />
                                  {priorityLabels[task.priority]}
                                </Badge>
                              </div>
                            </div>
                            
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {task.description}
                              </p>
                            )}

                            {task.setor && (
                              <p className="text-xs text-muted-foreground mb-1">
                                Setor: {task.setor}
                              </p>
                            )}

                            {task.projects && (
                              <p className="text-xs text-muted-foreground mb-1">
                                Projeto: {task.projects.name}
                              </p>
                            )}

                            {task.process_documentation && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                                <FileText size={12} />
                                <span>Processo: {task.process_documentation.title}</span>
                              </div>
                            )}

                            {task.documentation && (
                              <div className="mt-2 p-2 bg-background/50 rounded text-xs text-muted-foreground">
                                {task.documentation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma tarefa nesta rotina
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Este usuário não possui rotinas atribuídas
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
