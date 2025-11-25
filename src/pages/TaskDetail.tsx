import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  FileText, 
  Plus,
  Trash2,
  Save,
  LinkIcon,
  Edit2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newSubtask, setNewSubtask] = useState("");
  const [isAddingProcess, setIsAddingProcess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState({
    title: "",
    description: "",
    priority: "",
    status: "",
    setor: "",
    due_date: "",
    documentation: ""
  });

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(name), subtasks(*), process_documentation(id, title)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        status: task.status || "todo",
        setor: task.setor || "",
        due_date: task.due_date || "",
        documentation: task.documentation || ""
      });
    }
  }, [task]);

  const { data: processes } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_documentation")
        .select("id, title, area")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const addSubtaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from("subtasks")
        .insert([{ task_id: id!, title }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      setNewSubtask("");
      toast.success("Subtarefa adicionada!");
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId, completed }: { subtaskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from("subtasks")
        .update({ completed })
        .eq("id", subtaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (subtaskId: string) => {
      const { error } = await supabase
        .from("subtasks")
        .delete()
        .eq("id", subtaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      toast.success("Subtarefa removida!");
    },
  });

  const linkProcessMutation = useMutation({
    mutationFn: async (processId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ process_id: processId })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      setIsAddingProcess(false);
      toast.success("Processo vinculado!");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      setIsEditing(false);
      toast.success("Tarefa atualizada!");
    },
    onError: () => {
      toast.error("Erro ao atualizar tarefa");
    }
  });

  const handleSave = () => {
    updateTaskMutation.mutate(editedTask);
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
        </div>
      </AppLayout>
    );
  }

  const priorityColors = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  };

  const statusLabels = {
    todo: "A Fazer",
    in_progress: "Em Progresso",
    completed: "Concluído",
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={editedTask.title}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                className="text-3xl font-bold h-auto py-2"
              />
            ) : (
              <h1 className="text-3xl font-bold text-foreground">{task.title}</h1>
            )}
            <p className="text-muted-foreground mt-1">
              Projeto: {task.projects?.name || "Sem projeto"}
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleSave} disabled={updateTaskMutation.isPending}>
                  <Save size={16} className="mr-2" />
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setEditedTask({
                    title: task.title || "",
                    description: task.description || "",
                    priority: task.priority || "medium",
                    status: task.status || "todo",
                    setor: task.setor || "",
                    due_date: task.due_date || "",
                    documentation: task.documentation || ""
                  });
                }}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit2 size={16} className="mr-2" />
                Editar
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Descrição</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedTask.description}
                      onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                      placeholder="Adicione uma descrição..."
                      className="mt-2"
                    />
                  ) : (
                    <p className="text-muted-foreground mt-2">
                      {task.description || "Sem descrição"}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Setor</Label>
                  {isEditing ? (
                    <Input
                      value={editedTask.setor}
                      onChange={(e) => setEditedTask({ ...editedTask, setor: e.target.value })}
                      placeholder="Ex: Vendas, Marketing..."
                      className="mt-2"
                    />
                  ) : (
                    <p className="text-muted-foreground mt-2">
                      {task.setor || "Sem setor definido"}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Prioridade</Label>
                  {isEditing ? (
                    <Select
                      value={editedTask.priority}
                      onValueChange={(value) => setEditedTask({ ...editedTask, priority: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-2">
                      <Badge variant={priorityColors[task.priority as keyof typeof priorityColors] as any}>
                        {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                      </Badge>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Status</Label>
                  {isEditing ? (
                    <Select
                      value={editedTask.status}
                      onValueChange={(value) => setEditedTask({ ...editedTask, status: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">A Fazer</SelectItem>
                        <SelectItem value="in_progress">Em Progresso</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-2">
                      <Badge variant="outline">
                        {statusLabels[task.status as keyof typeof statusLabels]}
                      </Badge>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Prazo</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedTask.due_date}
                      onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value })}
                      className="mt-2"
                    />
                  ) : (
                    <div className="mt-2">
                      {task.due_date ? (
                        <Badge variant={isOverdue ? "destructive" : "secondary"}>
                          <Calendar size={12} className="mr-1" />
                          {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </Badge>
                      ) : (
                        <p className="text-muted-foreground">Sem prazo definido</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <FileText size={16} />
                    Documentação
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={editedTask.documentation}
                      onChange={(e) => setEditedTask({ ...editedTask, documentation: e.target.value })}
                      placeholder="Adicione documentação adicional..."
                      className="mt-2"
                    />
                  ) : (
                    task.documentation ? (
                      <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded mt-2">
                        {task.documentation}
                      </p>
                    ) : (
                      <p className="text-muted-foreground mt-2">Sem documentação</p>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Subtarefas</CardTitle>
                  <Badge variant="secondary">
                    {task.subtasks?.filter((s: any) => s.completed).length || 0} de {task.subtasks?.length || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.subtasks?.map((subtask: any) => (
                  <div key={subtask.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      checked={subtask.completed}
                      onCheckedChange={(checked) =>
                        toggleSubtaskMutation.mutate({ subtaskId: subtask.id, completed: !!checked })
                      }
                    />
                    <span className={`flex-1 ${subtask.completed ? "line-through text-muted-foreground" : ""}`}>
                      {subtask.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteSubtaskMutation.mutate(subtask.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Nova subtarefa..."
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && newSubtask.trim()) {
                        addSubtaskMutation.mutate(newSubtask);
                      }
                    }}
                  />
                  <Button
                    onClick={() => newSubtask.trim() && addSubtaskMutation.mutate(newSubtask)}
                    disabled={!newSubtask.trim()}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Processo Vinculado</CardTitle>
              </CardHeader>
              <CardContent>
                {task.process_documentation ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-muted/50 rounded">
                      <p className="font-medium">{task.process_documentation.title}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/workspace/processes`)}
                    >
                      Ver Processo
                    </Button>
                  </div>
                ) : (
                  <Dialog open={isAddingProcess} onOpenChange={setIsAddingProcess}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2">
                        <LinkIcon size={16} />
                        Vincular Processo
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Vincular Processo</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Selecione um processo</Label>
                          <Select onValueChange={(value) => linkProcessMutation.mutate(value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Escolher processo..." />
                            </SelectTrigger>
                            <SelectContent>
                              {processes?.map((process) => (
                                <SelectItem key={process.id} value={process.id}>
                                  {process.title} ({process.area})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setIsAddingProcess(false);
                            navigate("/workspace/processes");
                          }}
                        >
                          Criar Novo Processo
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
