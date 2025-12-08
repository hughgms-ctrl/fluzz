import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, FolderPlus, ArrowLeft, Check, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogStep = "choose" | "new" | "template";

export const CreateProjectDialog = ({ open, onOpenChange }: CreateProjectDialogProps) => {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<DialogStep>("choose");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["project-templates", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description")
        .eq("workspace_id", workspace.id)
        .eq("is_template", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspace?.id && open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) {
        toast.error("Workspace não encontrado");
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            user_id: user!.id,
            workspace_id: workspace.id,
            name,
            description,
            status: "active",
          },
        ])
        .select()
        .single();
      
      if (error) {
        console.error("Erro ao criar projeto:", error);
        throw error;
      }
      
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.refetchQueries({ queryKey: ["projects"] });
      toast.success("Projeto criado com sucesso!");
      handleClose();
    },
    onError: (error) => {
      console.error("Erro na mutation:", error);
      toast.error("Erro ao criar projeto");
    },
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!workspace || !user) {
        throw new Error("Workspace ou usuário não encontrado");
      }

      // Buscar o projeto template
      const { data: template, error: templateError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Criar novo projeto baseado no template
      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert([
          {
            name: `${template.name} (Cópia)`,
            description: template.description,
            status: "active",
            user_id: user.id,
            workspace_id: workspace.id,
            is_template: false,
          },
        ])
        .select()
        .single();

      if (projectError) throw projectError;

      // Buscar tarefas do template com subtasks
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*, subtasks(*)")
        .eq("project_id", templateId);

      if (tasksError) throw tasksError;

      // Buscar task_processes
      const { data: taskProcesses, error: tpError } = await supabase
        .from("task_processes")
        .select("*")
        .in("task_id", tasks?.map(t => t.id) || []);

      if (tpError) console.warn("Erro ao buscar task_processes:", tpError);

      if (tasks && tasks.length > 0) {
        const taskIdToIndex: Record<string, number> = {};
        tasks.forEach((task, index) => {
          taskIdToIndex[task.id] = index;
        });

        const newTasks = tasks.map((task) => ({
          title: task.title,
          description: task.description,
          status: "todo",
          priority: task.priority,
          assigned_to: task.assigned_to,
          setor: task.setor,
          documentation: task.documentation,
          process_id: task.process_id,
          completed_verified: false,
          project_id: newProject.id,
        }));

        const { data: insertedTasks, error: insertError } = await supabase
          .from("tasks")
          .insert(newTasks)
          .select();

        if (insertError) throw insertError;

        if (insertedTasks && insertedTasks.length > 0) {
          // Copiar subtasks
          const allSubtasks: any[] = [];
          for (let i = 0; i < tasks.length; i++) {
            const originalTask = tasks[i];
            const newTask = insertedTasks[i];
            if (originalTask.subtasks && originalTask.subtasks.length > 0) {
              const subtasksForTask = originalTask.subtasks.map((subtask: any) => ({
                title: subtask.title,
                completed: false,
                task_id: newTask.id,
              }));
              allSubtasks.push(...subtasksForTask);
            }
          }

          if (allSubtasks.length > 0) {
            await supabase.from("subtasks").insert(allSubtasks);
          }

          // Copiar task_processes
          if (taskProcesses && taskProcesses.length > 0) {
            const newTaskProcesses = taskProcesses
              .filter(tp => taskIdToIndex[tp.task_id] !== undefined)
              .map(tp => ({
                task_id: insertedTasks[taskIdToIndex[tp.task_id]].id,
                process_id: tp.process_id,
              }));

            if (newTaskProcesses.length > 0) {
              await supabase.from("task_processes").insert(newTaskProcesses);
            }
          }
        }
      }

      return newProject;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto criado a partir do modelo!");
      handleClose();
    },
    onError: (error) => {
      console.error("Erro ao criar projeto a partir do modelo:", error);
      toast.error("Erro ao criar projeto a partir do modelo");
    },
  });

  const handleClose = () => {
    setName("");
    setDescription("");
    setStep("choose");
    setSelectedTemplate(null);
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome do projeto é obrigatório");
      return;
    }
    createMutation.mutate();
  };

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) {
      toast.error("Selecione um modelo");
      return;
    }
    createFromTemplateMutation.mutate(selectedTemplate);
  };

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-templates"] });
      toast.success("Modelo excluído com sucesso!");
      setTemplateToDelete(null);
      setSelectedTemplate(null);
    },
    onError: () => {
      toast.error("Erro ao excluir modelo");
    },
  });

  return (
    <>
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Modelo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir este modelo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => templateToDelete && deleteTemplateMutation.mutate(templateToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {step === "choose" && (
          <>
            <DialogHeader>
              <DialogTitle>Novo Projeto</DialogTitle>
              <DialogDescription>
                Escolha como deseja criar seu projeto
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setStep("new")}
              >
                <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                  <FolderPlus className="h-10 w-10 text-primary" />
                  <div>
                    <h3 className="font-semibold">Novo Projeto</h3>
                    <p className="text-sm text-muted-foreground">
                      Criar projeto do zero
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card 
                className={cn(
                  "cursor-pointer hover:border-primary transition-colors",
                  (!templates || templates.length === 0) && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => templates && templates.length > 0 && setStep("template")}
              >
                <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                  <FileText className="h-10 w-10 text-primary" />
                  <div>
                    <h3 className="font-semibold">Usar Modelo</h3>
                    <p className="text-sm text-muted-foreground">
                      {templates && templates.length > 0 
                        ? `${templates.length} modelo(s) disponível(is)`
                        : "Nenhum modelo salvo"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {step === "new" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setStep("choose")}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle>Novo Projeto</DialogTitle>
                  <DialogDescription>
                    Crie um novo projeto para organizar suas tarefas
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Projeto *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Website Redesign"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo do projeto..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar Projeto"}
                </Button>
              </div>
            </form>
          </>
        )}

        {step === "template" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setStep("choose")}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle>Selecionar Modelo</DialogTitle>
                  <DialogDescription>
                    Escolha um modelo para criar seu projeto
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {templates?.map((template) => (
                <Card 
                  key={template.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedTemplate === template.id 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-primary/50"
                  )}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedTemplate === template.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplateToDelete(template.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateFromTemplate}
                disabled={!selectedTemplate || createFromTemplateMutation.isPending}
              >
                {createFromTemplateMutation.isPending ? "Criando..." : "Criar a partir do Modelo"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};