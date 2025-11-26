import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Projects() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, tasks(id, status)")
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

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Projetos</h1>
            <p className="text-muted-foreground">Gerencie todos os seus projetos</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus size={20} />
            Novo Projeto
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived")}>
          <TabsList>
            <TabsTrigger value="active">
              Ativos ({activeProjects.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Arquivados ({archivedProjects.length})
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
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeProjects.map((project: any) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onDelete={() => deleteMutation.mutate(project.id)}
                    onArchive={() => archiveMutation.mutate({ id: project.id, archived: true })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived" className="mt-6">
            {archivedProjects.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">
                  Você não tem projetos arquivados.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {archivedProjects.map((project: any) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onDelete={() => deleteMutation.mutate(project.id)}
                    onArchive={() => archiveMutation.mutate({ id: project.id, archived: false })}
                    isArchived={true}
                  />
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