import { AppLayout } from "@/components/layout/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

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

export default function TeamManagement() {
  const { workspace, isAdmin } = useWorkspace();
  const queryClient = useQueryClient();

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["team-members", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data: membersData, error: membersError } = await supabase
        .from("workspace_members")
        .select("id, user_id, role")
        .eq("workspace_id", workspace.id);

      if (membersError) throw membersError;

      // Fetch profiles separately
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Merge data
      const result = membersData?.map(member => ({
        ...member,
        profiles: profilesData?.find(p => p.id === member.user_id) || null
      })) || [];

      return result as WorkspaceMemberWithProfile[];
    },
    enabled: !!workspace?.id,
  });

  const { data: permissions } = useQuery({
    queryKey: ["user-permissions", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("workspace_id", workspace.id);

      if (error) throw error;
      return data as UserPermissions[];
    },
    enabled: !!workspace?.id,
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({
      userId,
      permission,
      value,
    }: {
      userId: string;
      permission: keyof Omit<UserPermissions, "id" | "user_id" | "workspace_id" | "created_at" | "updated_at">;
      value: boolean;
    }) => {
      const { error } = await supabase
        .from("user_permissions")
        .update({ [permission]: value })
        .eq("user_id", userId)
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Equipe</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os membros e suas permissões no workspace
          </p>
        </div>

        <div className="grid gap-4">
          {members?.map((member) => {
            const memberPermissions = permissions?.find((p) => p.user_id === member.user_id);
            const initials = member.profiles?.full_name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase() || "?";

            return (
              <Card key={member.id}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {member.profiles?.full_name || "Usuário"}
                      </CardTitle>
                      <CardDescription>
                        <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                          {member.role}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-foreground">Permissões</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(permissionLabels).map(([key, label]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${member.id}-${key}`}
                            checked={Boolean(memberPermissions?.[key as keyof UserPermissions] ?? true)}
                            onCheckedChange={(checked) => {
                              updatePermissionMutation.mutate({
                                userId: member.user_id,
                                permission: key as keyof Omit<UserPermissions, "id" | "user_id" | "workspace_id" | "created_at" | "updated_at">,
                                value: checked === true,
                              });
                            }}
                            disabled={member.role === "admin"}
                          />
                          <Label
                            htmlFor={`${member.id}-${key}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {member.role === "admin" && (
                      <p className="text-xs text-muted-foreground">
                        Administradores têm acesso total a todas as áreas
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
