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

  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!workspace?.id || !email) {
        throw new Error("Workspace ou email não definido");
      }

      // Generate unique token
      const token = crypto.randomUUID();

      // Create invite
      const { error: inviteError } = await supabase
        .from("workspace_invites")
        .insert({
          workspace_id: workspace.id,
          email: email,
          role: role,
          permissions: role !== "admin" ? permissions : null,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
          token: token,
        });

      if (inviteError) throw inviteError;

      // Generate invite link - use production URL
      // Remove editor/preview domains and use the published app domain
      let baseUrl = window.location.origin;
      
      // If we're in the Lovable editor/preview, construct the production URL
      if (baseUrl.includes('lovable.app') && !baseUrl.includes('//gptengineer-')) {
        // Extract project name from editor URL and create production URL
        const projectMatch = window.location.hostname.match(/^([^.]+)\.lovable\.app$/);
        if (projectMatch) {
          baseUrl = `https://${projectMatch[1]}.lovable.app`;
        }
      }
      
      const link = `${baseUrl}/auth?invite=${token}`;
      setInviteLink(link);

      return link;
    },
    onSuccess: (link) => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Convite criado! Copie o link abaixo.");
    },
    onError: (error: any) => {
      console.error("Erro ao adicionar membro:", error);
      toast.error(error.message || "Erro ao adicionar membro");
    },
  });

  const resetForm = () => {
    setEmail("");
    setRole("membro");
    setInviteLink(null);
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

          {inviteLink && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <Label className="text-sm font-semibold">Link de Convite Gerado</Label>
              <p className="text-xs text-muted-foreground">
                Envie este link para o novo membro se cadastrar e entrar automaticamente no workspace. O link expira em 7 dias.
              </p>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    toast.success("Link copiado!");
                  }}
                >
                  Copiar
                </Button>
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-500 space-y-1">
                <p className="font-semibold">⚠️ Importante:</p>
                <p>Este link deve ser usado no seu app <strong>publicado</strong>, não no editor Lovable.</p>
                <p>Se você ainda não publicou, publique o app primeiro clicando no botão "Publish" no topo.</p>
              </div>
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
              {inviteLink ? "Fechar" : "Cancelar"}
            </Button>
            {!inviteLink && (
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "Gerando convite..." : "Gerar Convite"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
