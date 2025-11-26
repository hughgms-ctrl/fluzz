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
import { useQueryClient } from "@tanstack/react-query";

interface EditRoutineDialogProps {
  routine: {
    id: string;
    name: string;
    description: string | null;
    recurrence_type: string;
  };
  positionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRoutineDialog({
  routine,
  positionId,
  open,
  onOpenChange,
}: EditRoutineDialogProps) {
  const [name, setName] = useState(routine.name);
  const [description, setDescription] = useState(routine.description || "");
  const [recurrenceType, setRecurrenceType] = useState(routine.recurrence_type);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setName(routine.name);
      setDescription(routine.description || "");
      setRecurrenceType(routine.recurrence_type);
    }
  }, [open, routine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("routines")
        .update({
          name,
          description,
          recurrence_type: recurrenceType,
        })
        .eq("id", routine.id);

      if (error) throw error;

      toast.success("Rotina atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["routines", positionId] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating routine:", error);
      toast.error("Erro ao atualizar rotina");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Rotina</DialogTitle>
          <DialogDescription>
            Atualize as informações da rotina
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Rotina *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Rotina de Fechamento de Mês"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito desta rotina"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="recurrence">Recorrência *</Label>
            <Select value={recurrenceType} onValueChange={setRecurrenceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diária</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
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
