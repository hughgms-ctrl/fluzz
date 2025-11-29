import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";

interface CreateStandaloneTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateStandaloneTaskDialog = ({ open, onOpenChange }: CreateStandaloneTaskDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);

  const { data: positions } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: positionUsers } = useQuery({
    queryKey: ["position-users", selectedPositionId],
    queryFn: async () => {
      if (!selectedPositionId) return [];
      
      const { data: userPositions, error: upError } = await supabase
        .from("user_positions")
        .select("user_id")
        .eq("position_id", selectedPositionId);
      
      if (upError) throw upError;
      if (!userPositions || userPositions.length === 0) return [];

      const userIds = userPositions.map(up => up.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      
      if (profilesError) throw profilesError;
      return profiles;
    },
    enabled: !!selectedPositionId,
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
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Get position name if position is selected
      let positionName = null;
      if (selectedPositionId) {
        const { data: position, error: positionError } = await supabase
          .from("positions")
          .select("name")
          .eq("id", selectedPositionId)
          .single();
        
        if (positionError) throw positionError;
        positionName = position.name;
      }

      const { data: newTask, error: taskError } = await supabase
        .from("tasks")
        .insert([
          {
            title,
            description: description || null,
            priority,
            status: "todo",
            due_date: dueDate || null,
            assigned_to: user!.id,
            project_id: null,
            setor: positionName,
          },
        ])
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
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      toast.success("Tarefa avulsa criada com sucesso!");
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error creating task:", error);
      toast.error("Erro ao criar tarefa");
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setSelectedPositionId("");
    setSelectedProcesses([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título da tarefa é obrigatório");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Tarefa Avulsa</DialogTitle>
          <DialogDescription>
            Crie uma tarefa pessoal que não está vinculada a nenhum projeto
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Organizar documentos"
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
              <Label htmlFor="due_date">Data de Vencimento</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Cargo</Label>
            <Select value={selectedPositionId} onValueChange={setSelectedPositionId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cargo" />
              </SelectTrigger>
              <SelectContent>
                {positions?.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select value={user?.id} disabled>
              <SelectTrigger>
                <SelectValue placeholder="Você" />
              </SelectTrigger>
            </Select>
            <p className="text-xs text-muted-foreground">
              Tarefas avulsas são sempre atribuídas a você
            </p>
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
          <div className="flex justify-end gap-2">
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
