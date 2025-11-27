import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateUnifiedTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateUnifiedTaskDialog = ({ 
  open, 
  onOpenChange 
}: CreateUnifiedTaskDialogProps) => {
  const { user } = useAuth();
  const { workspace, canCreateTasks } = useWorkspace();
  const queryClient = useQueryClient();
  
  // Task type: "standalone", "project", "routine"
  const [taskType, setTaskType] = useState<"standalone" | "project" | "routine">("standalone");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(user?.id || "");
  const [documentation, setDocumentation] = useState("");
  const [setor, setSetor] = useState("");
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedRoutineId, setSelectedRoutineId] = useState("");

  const { data: workspaceMembers } = useQuery({
    queryKey: ["workspace-members", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("workspace_members")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name
          )
        `)
        .eq("workspace_id", workspace.id);
      if (error) throw error;
      return data;
    },
    enabled: !!workspace,
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
    enabled: !!workspace && taskType === "project",
  });

  const { data: routines } = useQuery({
    queryKey: ["routines", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("routines")
        .select("id, name")
        .eq("workspace_id", workspace.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!workspace && taskType === "routine",
  });

  const { data: processes } = useQuery({
    queryKey: ["processes", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("process_documentation")
        .select("id, title, area")
        .eq("workspace_id", workspace.id)
        .order("title");
      if (error) throw error;
      return data;
    },
    enabled: !!workspace,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const taskData: any = {
        title,
        description,
        priority,
        status,
        due_date: dueDate || null,
        assigned_to: assignedTo || user?.id,
        documentation: documentation || null,
        setor: setor || null,
        project_id: null,
        routine_id: null,
      };

      if (taskType === "project") {
        if (!selectedProjectId) {
          toast.error("Selecione um projeto");
          return;
        }
        taskData.project_id = selectedProjectId;
      } else if (taskType === "routine") {
        if (!selectedRoutineId) {
          toast.error("Selecione uma rotina");
          return;
        }
        taskData.routine_id = selectedRoutineId;
      }

      const { data: newTask, error: taskError } = await supabase
        .from("tasks")
        .insert([taskData])
        .select()
        .single();
      if (taskError) throw taskError;

      // Link selected processes
      if (selectedProcesses.length > 0) {
        const { error: processError } = await supabase
          .from("task_processes")
          .insert(
            selectedProcesses.map((processId) => ({
              task_id: newTask.id,
              process_id: processId,
            }))
          );
        if (processError) throw processError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["home-tasks"] });
      toast.success("Tarefa criada com sucesso!");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Erro ao criar tarefa:", error);
      toast.error("Erro ao criar tarefa");
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setStatus("todo");
    setDueDate("");
    setAssignedTo(user?.id || "");
    setDocumentation("");
    setSetor("");
    setSelectedProcesses([]);
    setSelectedProjectId("");
    setSelectedRoutineId("");
    setTaskType("standalone");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título da tarefa é obrigatório");
      return;
    }
    createMutation.mutate();
  };

  if (!canCreateTasks) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>
            Crie uma nova tarefa e escolha o tipo e responsável
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Tipo de Tarefa *</Label>
            <RadioGroup value={taskType} onValueChange={(v) => setTaskType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standalone" id="standalone" />
                <Label htmlFor="standalone" className="font-normal cursor-pointer">
                  Tarefa Avulsa (sem vínculo)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="project" id="project" />
                <Label htmlFor="project" className="font-normal cursor-pointer">
                  Tarefa de Projeto
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="routine" id="routine" />
                <Label htmlFor="routine" className="font-normal cursor-pointer">
                  Tarefa de Rotina
                </Label>
              </div>
            </RadioGroup>
          </div>

          {taskType === "project" && (
            <div className="space-y-2">
              <Label htmlFor="project_id">Projeto *</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {taskType === "routine" && (
            <div className="space-y-2">
              <Label htmlFor="routine_id">Rotina *</Label>
              <Select value={selectedRoutineId} onValueChange={setSelectedRoutineId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma rotina" />
                </SelectTrigger>
                <SelectContent>
                  {routines?.map((routine) => (
                    <SelectItem key={routine.id} value={routine.id}>
                      {routine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Responsável</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Eu mesmo" />
              </SelectTrigger>
              <SelectContent>
                {workspaceMembers?.map((member: any) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.profiles?.full_name || "Sem nome"}
                    {member.user_id === user?.id ? " (Você)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Deixe em branco ou selecione você mesmo para atribuir a tarefa a você
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Revisar documento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os detalhes da tarefa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">A Fazer</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setor">Setor</Label>
            <Input
              id="setor"
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              placeholder="Ex: Marketing, Vendas, TI..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Data de Vencimento</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentation">Documentação</Label>
            <Textarea
              id="documentation"
              value={documentation}
              onChange={(e) => setDocumentation(e.target.value)}
              placeholder="Adicione documentação, links ou anotações importantes..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Processos Vinculados</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {processes?.map((process) => (
                <div key={process.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`process-${process.id}`}
                    checked={selectedProcesses.includes(process.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedProcesses([...selectedProcesses, process.id]);
                      } else {
                        setSelectedProcesses(selectedProcesses.filter((id) => id !== process.id));
                      }
                    }}
                  />
                  <Label htmlFor={`process-${process.id}`} className="text-sm font-normal cursor-pointer flex-1">
                    {process.title} <span className="text-muted-foreground">({process.area})</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Tarefa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
