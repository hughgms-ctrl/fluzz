import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderKanban, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RoutineTaskCardProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string | null;
    routine_id: string;
    projects?: { id: string; name: string } | null;
    process_documentation?: { id: string; title: string } | null;
  };
}

const priorityColors: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-red-500/10 text-red-500 border-red-500/20",
};

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export function RoutineTaskCard({ task }: RoutineTaskCardProps) {
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("routine_tasks")
        .delete()
        .eq("id", task.id);

      if (error) throw error;

      toast.success("Tarefa removida da rotina!");
      queryClient.invalidateQueries({ queryKey: ["routine-tasks", task.routine_id] });
    } catch (error) {
      console.error("Error deleting routine task:", error);
      toast.error("Erro ao remover tarefa");
    }
  };

  return (
    <Card className="bg-muted/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{task.title}</h4>
              {task.priority && (
                <Badge
                  variant="outline"
                  className={priorityColors[task.priority]}
                >
                  {priorityLabels[task.priority]}
                </Badge>
              )}
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {task.projects && (
                <Badge variant="secondary" className="gap-1">
                  <FolderKanban className="h-3 w-3" />
                  {task.projects.name}
                </Badge>
              )}
              {task.process_documentation && (
                <Badge variant="secondary" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {task.process_documentation.title}
                </Badge>
              )}
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover esta tarefa da rotina?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
