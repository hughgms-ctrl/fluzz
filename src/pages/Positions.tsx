import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreatePositionDialog } from "@/components/positions/CreatePositionDialog";
import { PositionCard } from "@/components/positions/PositionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/contexts/WorkspaceContext";
export default function Positions() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const {
    isAdmin,
    isGestor,
    workspace
  } = useWorkspace();
  const {
    data: positions,
    isLoading
  } = useQuery({
    queryKey: ["positions", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const {
        data,
        error
      } = await supabase.from("positions").select("*").eq("workspace_id", workspace.id).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data;
    },
    enabled: !!workspace
  });
  return <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Setores</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie setores e suas rotinas
            </p>
          </div>
          {(isAdmin || isGestor) && <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Setor
            </Button>}
        </div>

        {isLoading ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>)}
          </div> : positions && positions.length > 0 ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {positions.map(position => <PositionCard key={position.id} position={position} />)}
          </div> : <Card>
            <CardHeader>
              <CardTitle>Nenhum cargo cadastrado</CardTitle>
              <CardDescription>
                Comece criando seu primeiro cargo ou setor
              </CardDescription>
            </CardHeader>
          </Card>}

        <CreatePositionDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </div>
    </AppLayout>;
}