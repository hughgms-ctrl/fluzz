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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Mail, Link as LinkIcon } from "lucide-react";

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
  const [sendMethod, setSendMethod] = useState<"link" | "email">("link");
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
      if (!workspace?.id) {
        throw new Error("Workspace não definido");
      }
      
      if (sendMethod === "email" && !email) {
        throw new Error("Email é obrigatório para envio por email");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

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
          invited_by: user.id,
          token: token,
        });

      if (inviteError) throw inviteError;

      // Generate invite link - always use production URL
      const hostname = window.location.hostname;
      let baseUrl = window.location.origin;
      
      // If in Lovable editor (edit- or preview-), construct production URL
      if (hostname.includes('lovable.app') && (hostname.startsWith('edit-') || hostname.startsWith('preview-'))) {
        // Extract project name from edit-xxx.lovable.app or preview-xxx.lovable.app
        const projectName = hostname.split('.')[0].replace(/^(edit-|preview-)/, '');
        baseUrl = `https://${projectName}.lovable.app`;
      }
      
      const link = `${baseUrl}/auth?invite=${token}`;
      
      if (sendMethod === "email") {
        // Send email via edge function
        const { error: emailError } = await supabase.functions.invoke(
          "send-invite-email",
          {
            body: {
              email,
              inviteLink: link,
              workspaceName: workspace.name,
              role,
            },
          }
        );

        if (emailError) {
          console.error("Erro ao enviar email:", emailError);
          toast.warning(
            "Convite criado, mas não foi possível enviar o email. Use o link abaixo."
          );
        }
      }

      // Create notification for existing users (check by email in auth.users)
      // Note: We can only create notifications after they sign up, so this is for future reference
      // The notification will be created when they accept the invite through the auth flow

      setInviteLink(link);
      return link;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      if (sendMethod === "email") {
        toast.success("Convite enviado por email!");
      } else {
        toast.success("Link de convite gerado! Copie o link abaixo.");
      }
    },
    onError: (error: any) => {
      console.error("Erro ao criar convite:", error);
      toast.error(error.message || "Erro ao criar convite");
    },
  });

  const resetForm = () => {
    setEmail("");
    setRole("membro");
    setSendMethod("link");
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
    if (sendMethod === "email" && !email.trim()) {
      toast.error("O email é obrigatório para envio por email");
      return;
    }
    inviteMutation.mutate();
  };

  const handleRoleChange = (newRole: "admin" | "gestor" | "membro") => {
    setRole(newRole);
    if (newRole === "admin" || newRole === "gestor") {
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
            <Label htmlFor="email">
              Email {sendMethod === "email" && "*"}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={sendMethod === "link" ? "opcional@exemplo.com" : "usuario@exemplo.com"}
              required={sendMethod === "email"}
            />
            {sendMethod === "link" && (
              <p className="text-xs text-muted-foreground">
                Email opcional ao gerar link. Recomendado para registro do convite.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Método de Envio</Label>
            <RadioGroup
              value={sendMethod}
              onValueChange={(value: "link" | "email") => setSendMethod(value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="link" id="link" />
                <Label htmlFor="link" className="font-normal cursor-pointer flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Gerar Link
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email-method" />
                <Label htmlFor="email-method" className="font-normal cursor-pointer flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Enviar por Email
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {sendMethod === "link" 
                ? "Gere um link e envie manualmente para o convidado"
                : "Envie automaticamente um email com o convite"}
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
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="can_view_projects"
                    checked={permissions.can_view_projects}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, can_view_projects: !!checked })
                    }
                  />
                  <Label htmlFor="can_view_projects" className="text-sm font-normal cursor-pointer">
                    Projetos
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
                    Tarefas
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
                    Cargos
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
                    Analytics
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
                    Cultura
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
                    Visão & Valores
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
                    Processos
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
                    Briefings
                  </Label>
                </div>
              </div>
            </div>
          )}

          {inviteLink && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <Label className="text-sm font-semibold">
                {sendMethod === "email" ? "Email Enviado!" : "Link de Convite Gerado"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {sendMethod === "email"
                  ? "Um email foi enviado para o convidado com as instruções de acesso."
                  : "Copie este link e envie para o novo membro. O link é válido por 7 dias."}
              </p>
              {sendMethod === "link" && (
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
              )}
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
                {inviteMutation.isPending
                  ? "Criando..."
                  : sendMethod === "email"
                  ? "Enviar Convite"
                  : "Gerar Link"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
