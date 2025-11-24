import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Trash2, User, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProjectMembersProps {
  projectId: string;
  isOwner: boolean;
}

export const ProjectMembers = ({ projectId, isOwner }: ProjectMembersProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: membersData } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["member-profiles", membersData],
    enabled: !!membersData && membersData.length > 0,
    queryFn: async () => {
      if (!membersData) return [];
      const userIds = membersData.map(m => m.user_id);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      return data || [];
    },
  });

  const { data: projectData } = useQuery({
    queryKey: ["project-with-owner", projectId],
    queryFn: async () => {
      const { data: proj, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", proj.user_id)
        .maybeSingle();
      
      return { project: proj, ownerProfile };
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", inviteEmail)
        .single();

      if (existingUser) {
        // Add directly as member
        const { error } = await supabase
          .from("project_members")
          .insert([
            {
              project_id: projectId,
              user_id: existingUser.id,
              invited_by: user!.id,
            },
          ]);
        if (error) throw error;
      } else {
        // Create invite
        const { error } = await supabase
          .from("project_invites")
          .insert([
            {
              project_id: projectId,
              email: inviteEmail,
              invited_by: user!.id,
            },
          ]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
      toast.success("Convite enviado com sucesso!");
      setInviteEmail("");
      setIsInviteOpen(false);
    },
    onError: () => {
      toast.error("Erro ao enviar convite");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
      toast.success("Membro removido!");
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Membros da Equipe</CardTitle>
              <CardDescription>
                Gerencie os membros deste projeto
              </CardDescription>
            </div>
            {isOwner && (
              <Button onClick={() => setIsInviteOpen(true)} size="sm" className="gap-2">
                <UserPlus size={16} />
                Convidar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Project Owner */}
            {projectData?.project && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={projectData.ownerProfile?.avatar_url || ""} />
                    <AvatarFallback>
                      <User size={16} />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{projectData.ownerProfile?.full_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">Proprietário</p>
                  </div>
                </div>
                <Badge>Dono</Badge>
              </div>
            )}

            {/* Members */}
            {membersData?.map((member) => {
              const profile = profiles?.find(p => p.id === member.user_id);
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback>
                        <User size={16} />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{profile?.full_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">Membro</p>
                    </div>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMemberMutation.mutate(member.id)}
                    >
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}

            {!membersData?.length && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum membro adicional neste projeto
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
            <DialogDescription>
              Digite o email do usuário que deseja convidar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setInviteEmail("");
                  setIsInviteOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => inviteMutation.mutate()}
                disabled={!inviteEmail || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Enviando..." : "Enviar Convite"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
