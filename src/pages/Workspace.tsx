import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Target, Heart, FileText, Briefcase, Clipboard, Users, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function Workspace() {
  const {
    isAdmin,
    isGestor,
    permissions
  } = useWorkspace();

  // Helper function to check permission - respects explicit permissions for ALL users
  const canView = (permissionKey: keyof typeof permissions): boolean => {
    if (permissions && permissionKey in permissions) {
      return permissions[permissionKey] === true;
    }
    // Default for admin/gestor if no explicit permission set
    return isAdmin || isGestor;
  };

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Workspace</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Centro de informações e recursos da empresa
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/workspace/getting-started">
            <Card className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full border-l-4 border-l-primary">
              <CardHeader className="p-4">
                <GraduationCap className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Comece Aqui</CardTitle>
                <CardDescription className="text-sm">
                  Tutoriais e guias sobre como usar a plataforma
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {canView('can_view_culture') && (
            <Link to="/workspace/culture">
              <Card className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full border-l-4 border-l-primary">
                <CardHeader className="p-4">
                  <Heart className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Cultura</CardTitle>
                  <CardDescription className="text-sm">
                    Conheça os valores e a cultura da nossa empresa
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {canView('can_view_vision') && (
            <Link to="/workspace/vision">
              <Card className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full border-l-4 border-l-primary">
                <CardHeader className="p-4">
                  <Target className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Visão, Missão e Valores</CardTitle>
                  <CardDescription className="text-sm">
                    Entenda nossos objetivos e princípios fundamentais
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {canView('can_view_processes') && (
            <Link to="/workspace/processes">
              <Card className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full border-l-4 border-l-primary">
                <CardHeader className="p-4">
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">POPs</CardTitle>
                  <CardDescription className="text-sm">
                    Procedimentos Operacionais Padrão organizados por área
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {(isAdmin || isGestor) && (
            <Link to="/team">
              <Card className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full border-l-4 border-l-primary">
                <CardHeader className="p-4">
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Equipe</CardTitle>
                  <CardDescription className="text-sm">
                    Gerencie membros e suas permissões
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {canView('can_view_projects') && (
            <Link to="/projects">
              <Card className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full border-l-4 border-l-primary">
                <CardHeader className="p-4">
                  <BookOpen className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Projetos</CardTitle>
                  <CardDescription className="text-sm">
                    Gerencie todos os projetos da empresa
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {canView('can_view_positions') && (
            <Link to="/positions">
              <Card className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full border-l-4 border-l-primary">
                <CardHeader className="p-4">
                  <Briefcase className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Setores</CardTitle>
                  <CardDescription className="text-sm">Gerencie setores e tarefas recorrentes</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {canView('can_view_briefings') && (
            <Link to="/briefings">
              <Card className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full border-l-4 border-l-primary">
                <CardHeader className="p-4">
                  <Clipboard className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Painel de Briefings</CardTitle>
                  <CardDescription className="text-sm">
                    Repositório centralizado de todos os briefings e debriefings
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
