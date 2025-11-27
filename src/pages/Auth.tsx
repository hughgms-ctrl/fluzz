import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Auth() {
  const { user, loading, signUp, signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [isInvitedUser, setIsInvitedUser] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");

  // ============================================================
  // 🔥 PROCESS INVITE - MOVIDO PARA CIMA (CORRIGE O ERRO)
  // ============================================================
  const processInvite = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Add user to workspace
      const { error: memberError } = await supabase.from("workspace_members").insert({
        workspace_id: inviteData.workspace_id,
        user_id: currentUser.id,
        role: inviteData.role,
        invited_by: inviteData.invited_by,
      });

      if (memberError) throw memberError;

      // Set permissions if not admin
      if (inviteData.role !== "admin" && inviteData.permissions) {
        const { error: permError } = await supabase.from("user_permissions").insert({
          workspace_id: inviteData.workspace_id,
          user_id: currentUser.id,
          ...inviteData.permissions,
        });

        if (permError) throw permError;
      }

      // Mark invite as accepted
      await supabase.from("workspace_invites").update({ accepted: true }).eq("token", inviteToken);

      // Create welcome notification
      await supabase.from("notifications").insert({
        user_id: currentUser.id,
        workspace_id: inviteData.workspace_id,
        type: "workspace_invite",
        title: `Bem-vindo ao ${(inviteData.workspaces as any)?.name || "workspace"}!`,
        message: `Você agora faz parte do workspace como ${
          inviteData.role === "admin" ? "Administrador" : inviteData.role === "gestor" ? "Gestor" : "Membro"
        }.`,
        link: "/",
        data: inviteData,
      });

      toast.success("Bem-vindo ao workspace!");
    } catch (error) {
      console.error("Erro ao processar convite:", error);
      toast.error("Erro ao processar convite");
    }
  };

  // ============================================================
  // CHECK INVITE
  // ============================================================
  useEffect(() => {
    const checkInvitedUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      const token = searchParams.get("invite");

      if (currentUser && token) {
        setIsInvitedUser(true);
        setInviteToken(token);
        loadInviteData(token);
      } else if (token) {
        setInviteToken(token);
        loadInviteData(token);
      }
    };

    checkInvitedUser();
  }, [searchParams]);

  const loadInviteData = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from("workspace_invites")
        .select("*, workspaces(name)")
        .eq("token", token)
        .eq("accepted", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error) throw error;

      if (data) {
        setInviteData(data);
        setSignupEmail(data.email);
        toast.info(`Convite para ${(data.workspaces as any).name}`);
      } else {
        toast.error("Convite inválido ou expirado");
      }
    } catch (error) {
      console.error("Erro ao carregar convite:", error);
      toast.error("Erro ao carregar convite");
    }
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // INVITED USER SET PASSWORD SCREEN
  // ============================================================
  if (user && isInvitedUser) {
    const handleSetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) throw error;

        await processInvite();

        toast.success("Senha definida com sucesso! Bem-vindo!");
        
        // Small delay to ensure workspace context updates
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setIsInvitedUser(false);
        window.location.href = "/";
      } catch (error: any) {
        toast.error(error.message || "Erro ao definir senha");
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
        <Card className="w-full max-w-md shadow-lg animate-fade-in">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold text-primary">Defina sua Senha</CardTitle>
            <CardDescription>
              {inviteData
                ? `Convite para ${(inviteData.workspaces as any)?.name}`
                : "Crie uma senha para acessar sua conta"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Definindo senha..." : "Definir Senha e Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // AUTHENTICATED → REDIRECT
  // ============================================================
  if (user) {
    return <Navigate to="/" replace />;
  }

  // ============================================================
  // LOGIN
  // ============================================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // SIGNUP
  // ============================================================
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signUp(signupEmail, signupPassword, signupFullName);

      if (inviteToken && inviteData) {
        setTimeout(async () => {
          await processInvite();
        }, 2000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // AUTH PAGE UI
  // ============================================================
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md shadow-lg animate-fade-in">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-primary">ProjectFlow</CardTitle>
          <CardDescription>
            {inviteData
              ? `Você foi convidado para ${(inviteData.workspaces as any).name}`
              : "Gerenciamento de projetos simplificado"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={inviteToken ? "signup" : "login"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Cadastro</TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
                <div className="text-center">
                  <Link to="/forgot-password">
                    <Button type="button" variant="link" className="text-sm">
                      Esqueceu a senha?
                    </Button>
                  </Link>
                </div>
              </form>
            </TabsContent>

            {/* SIGNUP */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="João Silva"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={!!inviteToken}
                    required
                  />
                  {inviteToken && <p className="text-xs text-muted-foreground">Email pré-preenchido pelo convite</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
