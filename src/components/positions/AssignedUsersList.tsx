import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserMinus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface AssignedUsersListProps {
  positionId: string;
}

export function AssignedUsersList({ positionId }: AssignedUsersListProps) {
  const queryClient = useQueryClient();

  const { data: assignedUsers, isLoading } = useQuery({
    queryKey: ["assigned-users", positionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_positions")
        .select("id, user_id, assigned_at, profiles!inner(id, full_name)")
        .eq("position_id", positionId)
        .order("assigned_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleUnassign = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("user_positions")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast.success("Usuário removido do cargo");
      queryClient.invalidateQueries({ queryKey: ["assigned-users", positionId] });
      queryClient.invalidateQueries({ queryKey: ["assigned-users-count", positionId] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover usuário");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!assignedUsers || assignedUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhum usuário atribuído</CardTitle>
          <CardDescription>
            Atribua usuários para gerar automaticamente suas tarefas recorrentes
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assignedUsers.map((assignment: any) => (
        <Card key={assignment.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {assignment.profiles?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{assignment.profiles?.full_name || "Usuário sem nome"}</p>
                <p className="text-sm text-muted-foreground">
                  Atribuído em {new Date(assignment.assigned_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleUnassign(assignment.id)}
            >
              <UserMinus className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
