import { AppLayout } from "@/components/layout/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigate, useNavigate } from "react-router-dom";
import { ChevronRight, UserPlus } from "lucide-react";
import { useState } from "react";
import { InviteMemberDialog } from "@/components/team/InviteMemberDialog";

interface WorkspaceMemberWithProfile {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  invited_by: string | null;
  profiles: {
    full_name: string | null;
  } | null;
  inviter_profile?: {
    full_name: string | null;
  } | null;
}

export default function TeamManagement() {
  const { workspace, isAdmin } = useWorkspace();
  const navigate = useNavigate();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["team-members", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data: membersData, error: membersError } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, created_at, invited_by")
        .eq("workspace_id", workspace.id);

      if (membersError) throw membersError;

      // Fetch profiles for members
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Fetch profiles for inviters
      const inviterIds = membersData?.map(m => m.invited_by).filter(Boolean) || [];
      const { data: inviterProfilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", inviterIds);

      // Merge data
      const result = membersData?.map(member => ({
        ...member,
        profiles: profilesData?.find(p => p.id === member.user_id) || null,
        inviter_profile: member.invited_by 
          ? inviterProfilesData?.find(p => p.id === member.invited_by) || null
          : null
      })) || [];

      return result as WorkspaceMemberWithProfile[];
    },
    enabled: !!workspace?.id,
  });


  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (membersLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando equipe...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestão de Equipe</h1>
            <p className="text-muted-foreground mt-2">
              Clique em um membro para gerenciar suas permissões
            </p>
          </div>
          <Button onClick={() => setIsInviteDialogOpen(true)} size="lg">
            <UserPlus className="mr-2 h-5 w-5" />
            Adicionar Membro
          </Button>
        </div>

        <div className="grid gap-3">
          {members?.map((member) => {
            const initials = member.profiles?.full_name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase() || "?";

            const memberSince = new Date(member.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });

            return (
              <Card 
                key={member.id} 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/team/${member.user_id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar>
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">
                          {member.profiles?.full_name || "Usuário"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                            {member.role}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Membro desde {memberSince}
                          </span>
                        </div>
                        {member.invited_by && member.inviter_profile && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Convidado por {member.inviter_profile.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
      />
    </AppLayout>
  );
}
