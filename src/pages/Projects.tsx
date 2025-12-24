import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, Folder, CalendarDays } from "lucide-react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectListView } from "@/components/projects/ProjectListView";
import { ProjectsCalendarView } from "@/components/projects/ProjectsCalendarView";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { formatDateBR } from "@/lib/utils";
import { format } from "date-fns";

export default function Projects() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "archived" | "standalone">("active");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "calendar">("list");
  const [defaultProjectDate, setDefaultProjectDate] = useState<Date | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { workspace, isAdmin, isGestor } = useWorkspace();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data, error } = await supabase
        .from("projects")
        .select("*, tasks(id, status), start_date, end_date")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  // Separate projects vs standalone folders
  // Sort projects by event date (end_date or start_date), undated projects at the end
  const sortByEventDate = (projects: any[]) => {
    return [...projects].sort((a, b) => {
      const dateA = a.end_date || a.start_date;
      const dateB = b.end_date || b.start_date;
      
      // Undated projects go to the end
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      // Sort by date ascending (closest dates first)
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  };

  const { activeProjects, archivedProjects, standaloneFolders } = useMemo(() => {
    // Members (non-admin/gestor) should not see draft projects
    const canSeeDrafts = isAdmin || isGestor;
    
    const filterDrafts = (projectList: any[]) => {
      if (canSeeDrafts) return projectList;
      // Filter out drafts (is_draft = true or pending_notifications = true)
      return projectList.filter(p => !p.is_draft && !p.pending_notifications);
    };
    
    const active = sortByEventDate(filterDrafts(projects?.filter(p => !p.archived && !p.is_standalone_folder) || []));
    const archived = sortByEventDate(filterDrafts(projects?.filter(p => p.archived && !p.is_standalone_folder) || []));
    const standalone = filterDrafts(projects?.filter(p => p.is_standalone_folder) || []);
    return { activeProjects: active, archivedProjects: archived, standaloneFolders: standalone };
  }, [projects, isAdmin, isGestor]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir projeto");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from("projects")
        .update({ archived })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(variables.archived ? "Projeto arquivado com sucesso!" : "Projeto restaurado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar projeto");
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "todo": return "A Fazer";
      case "in_progress": return "Em Progresso";
      case "completed": return "Concluído";
      default: return status;
    }
  };

  const getPriorityVariant = (priority: string): "default" | "secondary" | "destructive" => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "default";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Projetos</h1>
            <p className="text-sm md:text-base text-muted-foreground">Gerencie todos os seus projetos</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
                title="Visualização em grade"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                title="Visualização em lista"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("calendar")}
                className="rounded-l-none"
                title="Visualização de calendário"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
            {(isAdmin || isGestor) && (
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2 flex-1 sm:flex-initial">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Novo Projeto</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived" | "standalone")}>
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="active" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Ativos</span>
              <span className="sm:hidden">Ativo</span>
              ({activeProjects.length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Arquivados</span>
              <span className="sm:hidden">Arq.</span>
              ({archivedProjects.length})
            </TabsTrigger>
            <TabsTrigger value="standalone" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Avulsos</span>
              <span className="sm:hidden">Avulso</span>
              ({standaloneFolders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {viewMode === "calendar" ? (
              <ProjectsCalendarView
                projects={activeProjects}
                onCreateProject={(date) => {
                  setDefaultProjectDate(date);
                  setIsCreateOpen(true);
                }}
                canEdit={isAdmin || isGestor}
              />
            ) : activeProjects.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">
                  Você ainda não tem projetos ativos. Comece criando um!
                </p>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <Plus size={20} />
                  Criar Primeiro Projeto
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {activeProjects.map((project: any) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onDelete={() => deleteMutation.mutate(project.id)}
                    onArchive={() => archiveMutation.mutate({ id: project.id, archived: true })}
                    canEdit={isAdmin || isGestor}
                  />
                ))}
              </div>
            ) : (
              <ProjectListView
                projects={activeProjects}
                onDelete={(id) => deleteMutation.mutate(id)}
                onArchive={(id) => archiveMutation.mutate({ id, archived: true })}
                navigate={navigate}
              />
            )}
          </TabsContent>

          <TabsContent value="archived" className="mt-6">
            {archivedProjects.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">
                  Você não tem projetos arquivados.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {archivedProjects.map((project: any) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onDelete={() => deleteMutation.mutate(project.id)}
                    onArchive={() => archiveMutation.mutate({ id: project.id, archived: false })}
                    isArchived={true}
                    canEdit={isAdmin || isGestor}
                  />
                ))}
              </div>
            ) : (
              <ProjectListView
                projects={archivedProjects}
                onDelete={(id) => deleteMutation.mutate(id)}
                onArchive={(id) => archiveMutation.mutate({ id, archived: false })}
                navigate={navigate}
                isArchived
              />
            )}
          </TabsContent>

          <TabsContent value="standalone" className="mt-6">
            {standaloneFolders.length === 0 ? (
              <div className="text-center py-16">
                <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Você não tem pastas de tarefas avulsas.
                </p>
                {(isAdmin || isGestor) && (
                  <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <Plus size={20} />
                    Criar Pasta Avulsa
                  </Button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {standaloneFolders.map((folder: any) => (
                  <Card
                    key={folder.id}
                    className="hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => navigate(`/projects/${folder.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Folder className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg line-clamp-2">{folder.name}</CardTitle>
                        </div>
                        <Badge variant="outline">Avulso</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {folder.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {folder.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {folder.tasks?.length || 0} tarefas
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <ProjectListView
                projects={standaloneFolders}
                onDelete={(id) => deleteMutation.mutate(id)}
                onArchive={(id) => archiveMutation.mutate({ id, archived: true })}
                navigate={navigate}
                isStandaloneFolder
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateProjectDialog 
        open={isCreateOpen} 
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setDefaultProjectDate(null);
        }}
        defaultDate={defaultProjectDate}
      />
    </AppLayout>
  );
}