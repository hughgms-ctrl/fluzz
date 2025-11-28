import { AppLayout } from "@/components/layout/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigate, useNavigate } from "react-router-dom";
import { ChevronRight, UserPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { InviteMemberDialog } from "@/components/team/InviteMemberDialog";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { workspace, isAdmin, isGestor } = useWorkspace();
  const navigate = useNavigate();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    
    try {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberToDelete);

      if (error) throw error;

      toast.success("Membro removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["team-members", workspace?.id] });
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    } catch (error) {
      console.error("Error deleting member:", error);
      toast.error("Erro ao remover membro");
    }
  };

  const { data: pendingInvites, isLoading: invitesLoading } = useQuery({
    queryKey: ["pending-invites", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data, error } = await supabase
        .from("workspace_invites")
        .select("id, email, role, created_at, invited_by, expires_at, accepted")
        .eq("workspace_id", workspace.id)
        .eq("accepted", false)
        .gt("expires_at", new Date().toISOString());

      if (error) throw error;

      // Fetch inviter profiles
      const inviterIds = data?.map(i => i.invited_by).filter(Boolean) || [];
      const { data: inviterProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", inviterIds);

      return data?.map(invite => ({
        ...invite,
        inviter_profile: invite.invited_by 
          ? inviterProfiles?.find(p => p.id === invite.invited_by) || null
          : null
      })) || [];
    },
    enabled: !!workspace?.id,
  });


  if (!isAdmin && !isGestor) {
    return <Navigate to="/" replace />;
  }

  if (membersLoading || invitesLoading) {
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
          {isAdmin && (
            <Button onClick={() => setIsInviteDialogOpen(true)} size="lg">
              <UserPlus className="mr-2 h-5 w-5" />
              Adicionar Membro
            </Button>
          )}
        </div>

        {pendingInvites && pendingInvites.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Convites Pendentes</h2>
            <div className="grid gap-3">
              {pendingInvites.map((invite) => {
                const initials = invite.email.substring(0, 2).toUpperCase();
                const invitedAt = new Date(invite.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });
                const expiresAt = new Date(invite.expires_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <Card key={invite.id} className="border-dashed">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Avatar>
                            <AvatarFallback className="bg-muted">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">{invite.email}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant="outline">{invite.role}</Badge>
                              <span className="text-xs text-muted-foreground">
                                Aguardando aceitação
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>Convidado em {invitedAt}</span>
                              <span>•</span>
                              <span>Expira em {expiresAt}</span>
                            </div>
                            {invite.inviter_profile && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Convidado por {invite.inviter_profile.full_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Membros Ativos</h2>
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
                <Card key={member.id}>
                  <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-4 flex-1 cursor-pointer"
                        onClick={() => navigate(`/team/${member.user_id}`)}
                      >
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
                      <div className="flex items-center gap-2">
                        {isAdmin && member.role !== "admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMemberToDelete(member.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este membro do workspace?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
