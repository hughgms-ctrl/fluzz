import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Repeat, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { CreateRecurringTaskDialog } from "@/components/positions/CreateRecurringTaskDialog";
import { RecurringTaskCard } from "@/components/positions/RecurringTaskCard";
import { AssignUserDialog } from "@/components/positions/AssignUserDialog";
import { AssignedUsersList } from "@/components/positions/AssignedUsersList";

export default function PositionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [assignUserDialogOpen, setAssignUserDialogOpen] = useState(false);

  const { data: position, isLoading: positionLoading } = useQuery({
    queryKey: ["position", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: recurringTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["recurring-tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_tasks")
        .select("*, process_documentation(id, title), projects(id, name)")
        .eq("position_id", id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (positionLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!position) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargo não encontrado</p>
          <Button onClick={() => navigate("/positions")} className="mt-4">
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/positions")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{position.name}</h1>
            {position.description && (
              <p className="text-muted-foreground mt-1">{position.description}</p>
            )}
          </div>
        </div>

        <Tabs defaultValue="routines" className="space-y-4">
          <TabsList>
            <TabsTrigger value="routines" className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Rotinas
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários Atribuídos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="routines" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setCreateTaskDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Rotina
              </Button>
            </div>

            {tasksLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full mt-2" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : recurringTasks && recurringTasks.length > 0 ? (
              <div className="space-y-4">
                {recurringTasks.map((task) => (
                  <RecurringTaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Nenhuma rotina cadastrada</CardTitle>
                  <CardDescription>
                    Crie rotinas para automatizar tarefas recorrentes
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setAssignUserDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Atribuir Usuário
              </Button>
            </div>

            <AssignedUsersList positionId={id!} />
          </TabsContent>
        </Tabs>

        <CreateRecurringTaskDialog
          positionId={id!}
          open={createTaskDialogOpen}
          onOpenChange={setCreateTaskDialogOpen}
        />

        <AssignUserDialog
          positionId={id!}
          open={assignUserDialogOpen}
          onOpenChange={setAssignUserDialogOpen}
        />
      </div>
    </AppLayout>
  );
}
