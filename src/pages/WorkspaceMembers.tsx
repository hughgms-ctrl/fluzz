import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRoutinesDialog } from "@/components/positions/UserRoutinesDialog";
import { useState } from "react";

export default function WorkspaceMembers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: workspaceId } = useQuery({
    queryKey: ["user-workspace", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data.workspace_id;
    },
    enabled: !!user,
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ["workspace-members-positions", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select(`
          id,
          user_id,
          role,
          profiles!inner(full_name)
        `)
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Get positions for each user
      const membersWithPositions = await Promise.all(
        data.map(async (member) => {
          const { data: positions } = await supabase
            .from("user_positions")
            .select(`
              position_id,
              positions!inner(id, name)
            `)
            .eq("user_id", member.user_id);

          return {
            ...member,
            positions: positions || [],
          };
        })
      );

      return membersWithPositions;
    },
    enabled: !!workspaceId,
  });

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    gestor: "Gestor",
    membro: "Membro",
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/workspace")}>
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Membros e Cargos</h1>
              <p className="text-muted-foreground mt-1">
                Visualize os membros do workspace e seus cargos
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Membros e Cargos</h1>
            <p className="text-muted-foreground mt-1">
              Visualize os membros do workspace e seus cargos
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {members && members.length > 0 ? (
            members.map((member: any) => (
              <Card 
                key={member.id} 
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedUserId(member.user_id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {member.profiles?.full_name || "Sem nome"}
                        </CardTitle>
                        <CardDescription>
                          {roleLabels[member.role] || member.role}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-sm font-medium mb-2">Cargos:</p>
                    {member.positions && member.positions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {member.positions.map((pos: any) => (
                          <Badge key={pos.position_id} variant="secondary">
                            {pos.positions.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum cargo atribuído</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Nenhum membro encontrado</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {selectedUserId && (
        <UserRoutinesDialog
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(open) => !open && setSelectedUserId(null)}
        />
      )}
    </AppLayout>
  );
}
