import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskActivityLogProps {
  taskId: string;
}

const actionLabels: Record<string, string> = {
  status_changed: "Status alterado",
  date_changed: "Data alterada",
  assignee_changed: "Responsável alterado",
  priority_changed: "Prioridade alterada",
};

export const TaskActivityLog = ({ taskId }: TaskActivityLogProps) => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["task-activity-logs", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_activity_logs")
        .select("*, profiles:user_id(full_name)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Alterações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs && logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="text-sm border-l-2 border-primary pl-3 py-1">
                <p className="font-medium">
                  {actionLabels[log.action] || log.action}
                </p>
                <p className="text-muted-foreground text-xs">
                  {log.old_value && `De "${log.old_value}" para "${log.new_value}"`}
                  {!log.old_value && `Novo valor: "${log.new_value}"`}
                </p>
                <p className="text-muted-foreground text-xs">
                  {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma alteração registrada</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
