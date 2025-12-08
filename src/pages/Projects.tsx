import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectListView } from "@/components/projects/ProjectListView";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { formatDateBR } from "@/lib/utils";

export default function Projects() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "archived" | "standalone">("active");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { workspace, isAdmin, isGestor } = useWorkspace();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data, error } = await supabase
        .from("projects")
        .select("*, tasks(id, status)")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  const { data: standaloneTasks, isLoading: isLoadingStandalone } = useQuery({
    queryKey: ["standalone-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          profiles:assigned_to (
            id,
            full_name
          )
        `)
        .is("project_id", null)
        .is("routine_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const activeProjects = projects?.filter(p => !p.archived) || [];
  const archivedProjects = projects?.filter(p => p.archived) || [];

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

  if (isLoading || isLoadingStandalone) {
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
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
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
              <span className="hidden sm:inline">Tarefas Avulsas</span>
              <span className="sm:hidden">Avulsas</span>
              ({standaloneTasks?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {activeProjects.length === 0 ? (
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
            {!standaloneTasks || standaloneTasks.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">
                  Não há tarefas avulsas criadas.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {standaloneTasks.map((task: any) => (
                  <Card
                    key={task.id}
                    className="hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
                        <Badge variant={getPriorityVariant(task.priority)}>
                          {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="outline">
                          {getStatusLabel(task.status)}
                        </Badge>
                        {task.profiles?.full_name && (
                          <span className="text-muted-foreground">
                            {task.profiles.full_name}
                          </span>
                        )}
                      </div>
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Vencimento: {formatDateBR(task.due_date)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </AppLayout>
  );
}