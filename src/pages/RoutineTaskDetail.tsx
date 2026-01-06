import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { renderDocumentation } from "@/lib/linkify";
import { ArrowLeft, Calendar, User, FileText, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { MemberDrawer } from "@/components/tasks/MemberDrawer";
import { UserCircle, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

export default function RoutineTaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { workspace, isAdmin, isGestor } = useWorkspace();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const canEdit = isAdmin || isGestor;

  const [editedTask, setEditedTask] = useState({
    title: "",
    description: "",
    priority: "",
    status: "",
    documentation: "",
    assigned_to: "",
    start_date: "",
    project_id: "",
  });

  const { data: task, isLoading } = useQuery({
    queryKey: ["routine-task", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routine_tasks")
        .select("*, projects(id, name), process_documentation(id, title), routines(id, name, position_id)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: sectorData } = useQuery({
    queryKey: ["position-name", task?.setor],
    queryFn: async () => {
      if (!task?.setor) return null;
      const { data, error } = await supabase
        .from("positions")
        .select("id, name")
        .eq("id", task.setor)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!task?.setor,
  });

  const { data: assignee } = useQuery({
    queryKey: ["profile", task?.assigned_to],
    queryFn: async () => {
      if (!task?.assigned_to) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", task.assigned_to)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!task?.assigned_to,
  });

  const { data: projects } = useQuery({
    queryKey: ["projects", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("workspace_id", workspace.id)
        .eq("archived", false)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!workspace && isEditing,
  });

  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        status: task.status || "todo",
        documentation: task.documentation || "",
        assigned_to: task.assigned_to || "",
        start_date: task.start_date || "",
        project_id: task.project_id || "",
      });
    }
  }, [task]);

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("routine_tasks")
        .update(updates)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routine-task", id] });
      queryClient.invalidateQueries({ queryKey: ["routine-tasks"] });
      setIsEditing(false);
      toast.success("Tarefa atualizada!");
    },
    onError: () => {
      toast.error("Erro ao atualizar tarefa");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("routine_tasks")
        .delete()
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa excluída!");
      navigate(-1);
    },
    onError: () => {
      toast.error("Erro ao excluir tarefa");
    },
  });

  const handleSave = () => {
    updateTaskMutation.mutate({
      ...editedTask,
      project_id: editedTask.project_id || null,
      assigned_to: editedTask.assigned_to || null,
      start_date: editedTask.start_date || null,
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!task) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Tarefa não encontrada</p>
          <Button onClick={() => navigate(-1)} className="mt-4">Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  const priorityLabels: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };
  const statusLabels: Record<string, string> = { todo: "A Fazer", in_progress: "Em Progresso", completed: "Concluído" };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{task.title}</h1>
              <p className="text-sm text-muted-foreground">
                Rotina: {task.routines?.name}
              </p>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                <Edit2 className="h-4 w-4 mr-2" />
                {isEditing ? "Cancelar" : "Editar"}
              </Button>
              <Button variant="destructive" size="icon" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={editedTask.title}
                      onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={editedTask.description}
                      onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select value={editedTask.priority} onValueChange={(v) => setEditedTask({ ...editedTask, priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={editedTask.status} onValueChange={(v) => setEditedTask({ ...editedTask, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">A Fazer</SelectItem>
                          <SelectItem value="in_progress">Em Progresso</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Documentação</Label>
                    <Textarea
                      value={editedTask.documentation}
                      onChange={(e) => setEditedTask({ ...editedTask, documentation: e.target.value })}
                      className="min-h-[100px]"
                    />
                  </div>
                  <Button onClick={handleSave} disabled={updateTaskMutation.isPending}>
                    {updateTaskMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-muted-foreground">Descrição</Label>
                    <p className="mt-1">{task.description || "Sem descrição"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Setor</Label>
                    <p className="mt-1">{sectorData?.name || "Não definido"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Responsável</Label>
                    <p className="mt-1">{assignee?.full_name || "Não definido"}</p>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <Label className="text-muted-foreground">Prioridade</Label>
                      <div className="mt-1">
                        <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>
                          {priorityLabels[task.priority || "medium"]}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge variant="outline">{statusLabels[task.status || "todo"]}</Badge>
                      </div>
                    </div>
                  </div>
                  {task.documentation && (
                    <div>
                      <Label className="text-muted-foreground">Documentação</Label>
                      <div className="mt-1 prose prose-sm dark:prose-invert max-w-none">
                        {renderDocumentation(task.documentation)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4">
            {task.projects && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Projeto Vinculado</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">{task.projects.name}</Badge>
                </CardContent>
              </Card>
            )}
            {task.process_documentation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">POP Vinculado</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="gap-1">
                    <FileText className="h-3 w-3" />
                    {task.process_documentation.title}
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa da rotina?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTaskMutation.mutate()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
