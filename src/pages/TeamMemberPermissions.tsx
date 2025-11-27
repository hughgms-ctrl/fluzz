import { AppLayout } from "@/components/layout/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface WorkspaceMemberWithProfile {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string | null;
  } | null;
}

interface UserPermissions {
  id: string;
  user_id: string;
  can_view_projects: boolean;
  can_view_tasks: boolean;
  can_view_positions: boolean;
  can_view_analytics: boolean;
  can_view_briefings: boolean;
  can_view_culture: boolean;
  can_view_vision: boolean;
  can_view_processes: boolean;
}

export default function TeamMemberPermissions() {
  const { userId } = useParams<{ userId: string }>();
  const { workspace, isAdmin } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ["team-member", workspace?.id, userId],
    queryFn: async () => {
      if (!workspace?.id || !userId) return null;
      
      const { data: membersData, error: membersError } = await supabase
        .from("workspace_members")
        .select("id, user_id, role")
        .eq("workspace_id", workspace.id)
        .eq("user_id", userId)
        .single();

      if (membersError) throw membersError;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", userId)
        .single();

      return {
        ...membersData,
        profiles: profileData
      } as WorkspaceMemberWithProfile;
    },
    enabled: !!workspace?.id && !!userId,
  });

  const { data: permissions } = useQuery({
    queryKey: ["user-permissions", workspace?.id, userId],
    queryFn: async () => {
      if (!workspace?.id || !userId) return null;
      
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data as UserPermissions | null;
    },
    enabled: !!workspace?.id && !!userId,
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({
      permission,
      value,
    }: {
      permission: keyof Omit<UserPermissions, "id" | "user_id" | "workspace_id" | "created_at" | "updated_at">;
      value: boolean;
    }) => {
      const { error } = await supabase
        .from("user_permissions")
        .update({ [permission]: value })
        .eq("user_id", userId!)
        .eq("workspace_id", workspace!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
      toast.success("Permissão atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar permissão");
    },
  });

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (memberLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!member) {
    return <Navigate to="/team" replace />;
  }

  const permissionLabels: Record<string, string> = {
    can_view_projects: "Acesso a Projetos",
    can_view_tasks: "Acesso a Tarefas",
    can_view_positions: "Acesso a Cargos",
    can_view_analytics: "Acesso a Analytics",
    can_view_briefings: "Acesso a Briefings",
    can_view_culture: "Acesso a Cultura",
    can_view_vision: "Acesso a Visão",
    can_view_processes: "Acesso a Processos",
  };

  const initials = member.profiles?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/team")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para equipe
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Permissões</h1>
          <p className="text-muted-foreground mt-2">
            Configure as permissões de acesso do membro
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">
                  {member.profiles?.full_name || "Usuário"}
                </CardTitle>
                <CardDescription className="mt-2">
                  <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                    {member.role}
                  </Badge>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">Permissões de Acesso</h3>
                {member.role === "admin" && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Administradores têm acesso total a todas as áreas da plataforma.
                  </p>
                )}
                <div className="space-y-4">
                  {Object.entries(permissionLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={key}
                          checked={member.role === "admin" ? true : Boolean(permissions?.[key as keyof UserPermissions] ?? true)}
                          onCheckedChange={(checked) => {
                            updatePermissionMutation.mutate({
                              permission: key as keyof Omit<UserPermissions, "id" | "user_id" | "workspace_id" | "created_at" | "updated_at">,
                              value: checked === true,
                            });
                          }}
                          disabled={member.role === "admin"}
                        />
                        <Label
                          htmlFor={key}
                          className="text-base font-normal cursor-pointer"
                        >
                          {label}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
