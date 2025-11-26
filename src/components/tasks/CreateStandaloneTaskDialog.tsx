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

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
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
          },
        ]);
      if (error) throw error;
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
