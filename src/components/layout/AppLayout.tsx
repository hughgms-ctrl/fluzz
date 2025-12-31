import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { User, Shield } from "lucide-react";
import { AIFloatingButton } from "@/components/ai/AIFloatingButton";
import { AdminViewBanner } from "@/components/admin/AdminViewBanner";

interface AppLayoutProps {
  children: React.ReactNode;
}
export const AppLayout = ({
  children
}: AppLayoutProps) => {
  const {
    user,
    loading
  } = useAuth();
  const {
    workspace,
    workspaceMember,
    workspaces,
    loading: workspaceLoading,
    changeWorkspace,
    isAdminViewMode
  } = useWorkspace();
  const navigate = useNavigate();

  // Evita "desmontar" a tela inteira depois que já carregou uma vez.
  // Isso previne perda de texto em formulários quando o workspace faz refetch em background.
  const shouldBlockForBootstrap =
    loading || (user && workspaceLoading && workspaces.length === 0 && !workspaceMember);

  if (shouldBlockForBootstrap) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // IMPORTANTE: Apenas redireciona para setup se o usuário não tem NENHUM workspace
  // Usuários convidados devem ter workspaces carregados pelo WorkspaceContext
  if (user && !workspaceLoading && workspaces.length === 0) {
    console.log("Redirecionando para setup - sem workspaces");
    return <Navigate to="/workspace/setup" replace />;
  }
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return <SidebarProvider>
      <div 
        className="min-h-screen flex flex-col w-full bg-background"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Admin View Banner - always visible at top when active */}
        <AdminViewBanner />
        
        <div className="flex flex-1 w-full">
          {/* Barra fixa que cobre a safe area do iOS */}
          <div 
            className="fixed top-0 left-0 right-0 bg-card z-[60]"
            style={{ height: 'env(safe-area-inset-top, 0px)' }}
          />
          <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header 
            className="border-b border-border bg-card flex items-center justify-between px-3 sm:px-6 fixed left-0 right-0 z-50 h-14"
            style={{ 
              top: 'env(safe-area-inset-top, 0px)',
              paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
              paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))'
            }}
          >
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <SidebarTrigger />
              <h1 className="text-base sm:text-xl font-semibold text-primary truncate">Fluzz</h1>
              {workspaceMember && workspaces.length > 0 && <Select value={workspace?.id} onValueChange={value => {
              void changeWorkspace(value);
            }}>
                  <SelectTrigger className={`w-[160px] sm:w-[220px] text-xs sm:text-sm ${isAdminViewMode ? 'border-orange-500 bg-orange-500/10' : ''}`}>
                    <SelectValue placeholder="Selecionar workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map(ws => (
                      <SelectItem key={ws.id} value={ws.id}>
                        <div className="flex items-center gap-2">
                          {ws.isAdminView && (
                            <Shield className="h-3 w-3 text-orange-500" />
                          )}
                          <span>{ws.name}</span>
                          {ws.isAdminView && (
                            <span className="text-[10px] text-orange-500 font-medium">(Admin)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/profile")}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="sr-only">Perfil</span>
              </Button>
            </div>
          </header>
          {/* Spacer para compensar o header fixo */}
          <div className="h-14 shrink-0" />
          <main className="flex-1 p-3 sm:p-6 animate-fade-in min-w-0">
            {children}
            </main>
          </div>
          <AIFloatingButton />
        </div>
      </div>
    </SidebarProvider>;
};