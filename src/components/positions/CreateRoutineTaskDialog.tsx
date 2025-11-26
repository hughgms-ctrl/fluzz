import { useState } from "react";
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

interface CreateRoutineTaskDialogProps {
  routineId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoutineTaskDialog({
  routineId,
  open,
  onOpenChange,
}: CreateRoutineTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [setor, setSetor] = useState("");
  const [documentation, setDocumentation] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [processId, setProcessId] = useState<string>("none");
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
        .select("id, title")
        .order("title");
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("routine_tasks").insert({
        routine_id: routineId,
        title,
        description,
        priority,
        status,
        setor: setor || null,
        documentation: documentation || null,
        project_id: projectId === "none" ? null : projectId,
        process_id: processId === "none" ? null : processId,
      });

      if (error) throw error;

      toast.success("Tarefa adicionada à rotina!");
      queryClient.invalidateQueries({ queryKey: ["routine-tasks", routineId] });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating routine task:", error);
      toast.error("Erro ao criar tarefa");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setStatus("todo");
    setSetor("");
    setDocumentation("");
    setProjectId("none");
    setProcessId("none");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Tarefa à Rotina</DialogTitle>
          <DialogDescription>
            Esta tarefa será gerada automaticamente conforme a recorrência da rotina
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
            <Label htmlFor="process">Vincular a Processo (Opcional)</Label>
            <Select value={processId} onValueChange={setProcessId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um processo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {processes?.map((process) => (
                  <SelectItem key={process.id} value={process.id}>
                    {process.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="documentation">Documentação</Label>
            <Textarea
              id="documentation"
              value={documentation}
              onChange={(e) => setDocumentation(e.target.value)}
              placeholder="Adicione documentação, links ou anotações importantes..."
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
              {loading ? "Adicionando..." : "Adicionar Tarefa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
