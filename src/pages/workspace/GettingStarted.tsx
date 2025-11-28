import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { CreateSectionDialog } from "@/components/getting-started/CreateSectionDialog";
import { EditSectionDialog } from "@/components/getting-started/EditSectionDialog";
import { SectionCard } from "@/components/getting-started/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function GettingStarted() {
  const { workspace, isAdmin, isGestor } = useWorkspace();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  
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
      return data;
    },
    enabled: !!workspace?.id,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Comece Aqui</h1>
              <p className="text-muted-foreground">
                Tutoriais e guias para usar a plataforma
              </p>
            </div>
            {canEdit && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Seção
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : !sections || sections.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">
              Nenhuma seção criada ainda
            </p>
            {canEdit && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Seção
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                canEdit={canEdit}
                onEdit={() => setEditingSection(section)}
              />
            ))}
          </div>
        )}
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
    </AppLayout>
  );
}
