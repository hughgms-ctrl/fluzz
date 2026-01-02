import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Users, Plus } from "lucide-react";

interface ExistingWorkspaceInfo {
  workspaceId: string;
  workspaceName: string;
  invitedByName: string | null;
}

const ONBOARDING_COMPLETED_KEY = "fluzz_onboarding_completed";

export default function WorkspaceSetup() {
  const { user } = useAuth();
  const { workspaces, loading: workspaceLoading, changeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingWorkspace, setExistingWorkspace] = useState<ExistingWorkspaceInfo | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Verifica se já completou o onboarding anteriormente
  const hasCompletedOnboarding = () => {
    if (!user) return false;
    const completed = localStorage.getItem(`${ONBOARDING_COMPLETED_KEY}_${user.id}`);
    return completed === "true";
  };

  // Marca o onboarding como completado
  const markOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_COMPLETED_KEY}_${user.id}`, "true");
    }
  };

  useEffect(() => {
    const checkExistingWorkspace = async () => {
      if (!user || workspaceLoading) return;
      
      // Se já completou o onboarding e tem workspaces, redireciona direto
      if (hasCompletedOnboarding() && workspaces.length > 0) {
        setCheckingExisting(false);
        return;
      }
      
      // Se já tem workspaces, busca informações do primeiro
      if (workspaces.length > 0) {
        try {
          const firstWorkspace = workspaces[0];
          
          // Busca o membro do workspace para pegar quem convidou
          const { data: memberData } = await supabase
            .from("workspace_members")
            .select("invited_by")
            .eq("workspace_id", firstWorkspace.id)
            .eq("user_id", user.id)
            .single();

          let invitedByName: string | null = null;
          
          if (memberData?.invited_by) {
            // Busca o nome de quem convidou
            const { data: inviterProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", memberData.invited_by)
              .single();
            
            invitedByName = inviterProfile?.full_name || null;
          }

          setExistingWorkspace({
            workspaceId: firstWorkspace.id,
            workspaceName: firstWorkspace.name,
            invitedByName
          });
        } catch (error) {
          console.error("Erro ao buscar informações do workspace:", error);
        }
      }
      
      setCheckingExisting(false);
    };

    checkExistingWorkspace();
  }, [user, workspaces, workspaceLoading]);

  // Se está carregando, mostra loading
  if (workspaceLoading || checkingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Se já completou o onboarding e tem workspaces, redireciona para home
  if (hasCompletedOnboarding() && workspaces.length > 0) {
    return <Navigate to="/" replace />;
  }

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

      // Marcar onboarding como completo
      markOnboardingComplete();
      
      toast.success("Workspace criado com sucesso!");
      await changeWorkspace(workspace.id);
      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Erro ao criar workspace:", error);
      toast.error("Erro ao criar workspace");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToWorkspace = async () => {
    if (existingWorkspace) {
      // Marcar onboarding como completo
      markOnboardingComplete();
      
      await changeWorkspace(existingWorkspace.workspaceId);
      navigate("/", { replace: true });
    }
  };

  // Se usuário já foi adicionado a um workspace, mostra opções
  if (existingWorkspace && !showCreateForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Bem-vindo ao Fluzz!</CardTitle>
            <CardDescription className="text-base mt-2">
              Você foi adicionado ao workspace <strong>{existingWorkspace.workspaceName}</strong>
              {existingWorkspace.invitedByName && (
                <> por <strong>{existingWorkspace.invitedByName}</strong></>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              O que você gostaria de fazer?
            </p>
            
            <Button 
              onClick={handleContinueToWorkspace} 
              className="w-full"
              size="lg"
            >
              <Users className="mr-2 h-4 w-4" />
              Continuar para {existingWorkspace.workspaceName}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowCreateForm(true)} 
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar meu próprio workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formulário de criação de workspace
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao Fluzz!</CardTitle>
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
            
            {existingWorkspace && (
              <Button 
                type="button"
                variant="ghost" 
                className="w-full"
                onClick={() => setShowCreateForm(false)}
              >
                Voltar
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}