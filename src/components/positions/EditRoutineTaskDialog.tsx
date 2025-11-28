import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";

interface EditRoutineTaskDialogProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string | null;
    status: string | null;
    setor: string | null;
    documentation: string | null;
    project_id: string | null;
    process_id: string | null;
  };
  routineId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRoutineTaskDialog({
  task,
  routineId,
  open,
  onOpenChange,
}: EditRoutineTaskDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority || "medium");
  const [status, setStatus] = useState(task.status || "todo");
  const [setor, setSetor] = useState(task.setor || "");
  const [documentation, setDocumentation] = useState(task.documentation || "");
  const [projectId, setProjectId] = useState<string>(task.project_id || "none");
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>(
    task.process_id ? [task.process_id] : []
  );
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("archived", false)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

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
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority || "medium");
      setStatus(task.status || "todo");
      setSetor(task.setor || "");
      setDocumentation(task.documentation || "");
      setProjectId(task.project_id || "none");
      setSelectedProcesses(task.process_id ? [task.process_id] : []);
    }
  }, [open, task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("routine_tasks")
        .update({
          title,
          description,
          priority,
          status,
          setor: setor || null,
          documentation: documentation || null,
          project_id: projectId === "none" ? null : projectId,
          process_id: selectedProcesses.length > 0 ? selectedProcesses[0] : null,
        })
        .eq("id", task.id);

      if (error) throw error;

      toast.success("Tarefa atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["routine-tasks", routineId] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating routine task:", error);
      toast.error("Erro ao atualizar tarefa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Tarefa da Rotina</DialogTitle>
          <DialogDescription>
            Atualize as informações da tarefa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Nome da Tarefa *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Conferir relatório financeiro"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os detalhes da tarefa"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
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

            <div>
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

          <div>
            <Label htmlFor="setor">Setor</Label>
            <Input
              id="setor"
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              placeholder="Ex: Marketing, Vendas, TI..."
            />
          </div>

          <div>
            <Label htmlFor="project">Vincular a Projeto (Opcional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Processos Vinculados (Opcional)</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {processes && processes.length > 0 ? (
                processes.map((process) => (
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
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum processo disponível</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="documentation">INFORMAÇÕES GERAIS</Label>
            <Textarea
              id="documentation"
              value={documentation}
              onChange={(e) => setDocumentation(e.target.value)}
              placeholder="Adicione informações gerais, links ou anotações importantes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
