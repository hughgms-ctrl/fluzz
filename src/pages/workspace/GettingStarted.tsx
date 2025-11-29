import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { CreateSectionDialog } from "@/components/getting-started/CreateSectionDialog";
import { EditSectionDialog } from "@/components/getting-started/EditSectionDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { GettingStartedSidebar } from "@/components/getting-started/GettingStartedSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GettingStarted() {
  const { workspace, isAdmin, isGestor } = useWorkspace();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  
  const canEdit = isAdmin || isGestor;

  const { data: sections, isLoading } = useQuery({
    queryKey: ["getting-started-sections", workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("getting_started_sections")
        .select("*")
        .eq("workspace_id", workspace?.id!)
        .order("section_order", { ascending: true });
      
      if (error) throw error;
      
      // Auto-select first section if none selected
      if (data && data.length > 0 && !selectedSectionId) {
        setSelectedSectionId(data[0].id);
      }
      
      return data;
    },
    enabled: !!workspace?.id,
  });

  const selectedSection = sections?.find(s => s.id === selectedSectionId);

  const contentTypeLabels: Record<string, string> = {
    text: "Texto",
    video: "Vídeo",
    image: "Imagem",
    link: "Link",
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/workspace")}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Comece Aqui</h1>
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/workspace")}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Comece Aqui</h1>
          </div>
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">
              Nenhuma seção criada ainda
            </p>
            {canEdit && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                Criar Primeira Seção
              </Button>
            )}
          </div>
        </div>

        <CreateSectionDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </AppLayout>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <GettingStartedSidebar
          sections={sections}
          selectedSectionId={selectedSectionId}
          onSelectSection={setSelectedSectionId}
          canEdit={canEdit}
          onCreateSection={() => setCreateDialogOpen(true)}
        />

        <main className="flex-1 overflow-auto">
          <AppLayout>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/workspace")}>
                  <ArrowLeft size={20} />
                </Button>
                <SidebarTrigger className="-ml-1" />
                <div className="flex-1">
                  <h1 className="text-3xl font-bold tracking-tight">Comece Aqui</h1>
                  <p className="text-muted-foreground">
                    Tutoriais e guias para usar a plataforma
                  </p>
                </div>
              </div>

              {selectedSection ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl">{selectedSection.title}</CardTitle>
                        <Badge variant="secondary" className="mt-2">
                          {contentTypeLabels[selectedSection.content_type]}
                        </Badge>
                      </div>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSection(selectedSection)}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedSection.content_type === "text" && selectedSection.content && (
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap text-foreground">{selectedSection.content}</p>
                      </div>
                    )}

                    {selectedSection.content_type === "video" && selectedSection.video_url && (
                      <div className="aspect-video">
                        <iframe
                          src={selectedSection.video_url}
                          className="w-full h-full rounded-lg"
                          allowFullScreen
                          title={selectedSection.title}
                        />
                      </div>
                    )}

                    {selectedSection.content_type === "image" && selectedSection.image_url && (
                      <div className="flex justify-center">
                        <img
                          src={selectedSection.image_url}
                          alt={selectedSection.title}
                          className="max-w-full h-auto rounded-lg"
                        />
                      </div>
                    )}

                    {selectedSection.content_type === "link" && selectedSection.content && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Link de referência:
                        </p>
                        <a
                          href={selectedSection.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {selectedSection.content}
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Selecione uma seção no menu lateral
                  </p>
                </div>
              )}
            </div>
          </AppLayout>
        </main>
      </div>

      <CreateSectionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {editingSection && (
        <EditSectionDialog
          section={editingSection}
          open={!!editingSection}
          onOpenChange={(open) => !open && setEditingSection(null)}
        />
      )}
    </SidebarProvider>
  );
}
