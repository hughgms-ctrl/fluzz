import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InviteMemberDialog = ({
  open,
  onOpenChange,
}: InviteMemberDialogProps) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "gestor" | "membro">("membro");
  const [permissions, setPermissions] = useState({
    can_view_projects: true,
    can_view_tasks: true,
    can_view_positions: true,
    can_view_analytics: false,
    can_view_culture: true,
    can_view_vision: true,
    can_view_processes: true,
    can_view_briefings: true,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!workspace?.id || !email) {
        throw new Error("Workspace ou email não definido");
      }

      // Check if user exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", email)
        .single();

      if (!existingUser) {
        // If user doesn't exist, we'll need to send an invite
        // For now, show error message
        throw new Error("Usuário não encontrado. O convite por email ainda não está implementado.");
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspace.id)
        .eq("user_id", existingUser.id)
        .single();

      if (existingMember) {
        throw new Error("Este usuário já é membro do workspace");
      }

      // Add to workspace
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: existingUser.id,
          role: role,
        });

      if (memberError) throw memberError;

      // Set permissions (only if not admin)
      if (role !== "admin") {
        const { error: permissionsError } = await supabase
          .from("user_permissions")
          .insert({
            workspace_id: workspace.id,
            user_id: existingUser.id,
            ...permissions,
          });

        if (permissionsError) throw permissionsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Membro adicionado com sucesso!");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Erro ao adicionar membro:", error);
      toast.error(error.message || "Erro ao adicionar membro");
    },
  });

  const resetForm = () => {
    setEmail("");
    setRole("membro");
    setPermissions({
      can_view_projects: true,
      can_view_tasks: true,
      can_view_positions: true,
      can_view_analytics: false,
      can_view_culture: true,
      can_view_vision: true,
      can_view_processes: true,
      can_view_briefings: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("O email é obrigatório");
      return;
    }
    inviteMutation.mutate();
  };

  const handleRoleChange = (newRole: "admin" | "gestor" | "membro") => {
    setRole(newRole);
    // Reset permissions based on role
    if (newRole === "admin") {
      setPermissions({
        can_view_projects: true,
        can_view_tasks: true,
        can_view_positions: true,
        can_view_analytics: true,
        can_view_culture: true,
        can_view_vision: true,
        can_view_processes: true,
        can_view_briefings: true,
      });
    } else if (newRole === "gestor") {
      setPermissions({
        can_view_projects: true,
        can_view_tasks: true,
        can_view_positions: true,
        can_view_analytics: true,
        can_view_culture: true,
        can_view_vision: true,
        can_view_processes: true,
        can_view_briefings: true,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
          <DialogDescription>
            Convide um novo membro e defina suas permissões
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@exemplo.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              Digite o email do usuário que deseja adicionar
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Cargo *</Label>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="membro">Membro</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Administrador:</strong> Acesso total ao workspace</p>
              <p><strong>Gestor:</strong> Pode gerenciar projetos e equipe</p>
              <p><strong>Membro:</strong> Acesso limitado baseado em permissões</p>
            </div>
          </div>

          {role !== "admin" && (
            <div className="space-y-3 border-t pt-4">
              <Label>Permissões</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="can_view_projects"
                    checked={permissions.can_view_projects}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, can_view_projects: !!checked })
                    }
                  />
                  <Label htmlFor="can_view_projects" className="text-sm font-normal cursor-pointer">
                    Acesso a Projetos
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="can_view_tasks"
                    checked={permissions.can_view_tasks}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, can_view_tasks: !!checked })
                    }
                  />
                  <Label htmlFor="can_view_tasks" className="text-sm font-normal cursor-pointer">
                    Acesso a Tarefas
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="can_view_positions"
                    checked={permissions.can_view_positions}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, can_view_positions: !!checked })
                    }
                  />
                  <Label htmlFor="can_view_positions" className="text-sm font-normal cursor-pointer">
                    Acesso a Cargos
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="can_view_analytics"
                    checked={permissions.can_view_analytics}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, can_view_analytics: !!checked })
                    }
                  />
                  <Label htmlFor="can_view_analytics" className="text-sm font-normal cursor-pointer">
                    Acesso a Analytics
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="can_view_culture"
                    checked={permissions.can_view_culture}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, can_view_culture: !!checked })
                    }
                  />
                  <Label htmlFor="can_view_culture" className="text-sm font-normal cursor-pointer">
                    Acesso a Cultura
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="can_view_vision"
                    checked={permissions.can_view_vision}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, can_view_vision: !!checked })
                    }
                  />
                  <Label htmlFor="can_view_vision" className="text-sm font-normal cursor-pointer">
                    Acesso a Visão & Valores
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="can_view_processes"
                    checked={permissions.can_view_processes}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, can_view_processes: !!checked })
                    }
                  />
                  <Label htmlFor="can_view_processes" className="text-sm font-normal cursor-pointer">
                    Acesso a Processos
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="can_view_briefings"
                    checked={permissions.can_view_briefings}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, can_view_briefings: !!checked })
                    }
                  />
                  <Label htmlFor="can_view_briefings" className="text-sm font-normal cursor-pointer">
                    Acesso a Briefings
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Administradores têm acesso total automaticamente
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Adicionando..." : "Adicionar Membro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
