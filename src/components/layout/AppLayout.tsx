import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, loading } = useAuth();
  const { workspace, workspaceMember, workspaces, loading: workspaceLoading, changeWorkspace } = useWorkspace();
  const navigate = useNavigate();

  if (loading || workspaceLoading) {
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 sm:h-16 border-b border-border bg-card flex items-center justify-between px-3 sm:px-6 sticky top-0 z-10">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <SidebarTrigger />
              <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">ProjectFlow</h1>
              {workspaceMember && workspaces.length > 0 && (
                <Select
                  value={workspace?.id}
                  onValueChange={(value) => {
                    void changeWorkspace(value);
                  }}
                >
                  <SelectTrigger className="w-[160px] sm:w-[220px] text-xs sm:text-sm">
                    <SelectValue placeholder="Selecionar workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
          <main className="flex-1 p-3 sm:p-6 animate-fade-in min-w-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};