import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export default function WorkspaceSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      toast.error("Digite um nome para o workspace");
      return;
    }

    setLoading(true);
    try {
      // Criar workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          name: workspaceName,
          created_by: user!.id,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Adicionar usuário como admin do workspace
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: user!.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      toast.success("Workspace criado com sucesso!");
      navigate("/");
      window.location.reload(); // Recarregar para atualizar o contexto
    } catch (error: any) {
      console.error("Erro ao criar workspace:", error);
      toast.error("Erro ao criar workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao ProjectFlow!</CardTitle>
          <CardDescription>
            Configure seu workspace para começar a gerenciar seus projetos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Nome do Workspace</Label>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Ex: Minha Empresa"
                required
              />
              <p className="text-xs text-muted-foreground">
                Este será o nome da sua empresa ou equipe
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando..." : "Criar Workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
