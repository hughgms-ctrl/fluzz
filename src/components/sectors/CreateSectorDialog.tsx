import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CreateSectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateSectorDialog = ({ open, onOpenChange }: CreateSectorDialogProps) => {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !workspace) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("sectors")
        .insert([{
          name,
          description,
          workspace_id: workspace.id,
          created_by: user.id,
        }]);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["sectors"] });
      toast.success("Setor criado com sucesso!");
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating sector:", error);
      toast.error("Erro ao criar setor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Setor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Marketing, Vendas, TI..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o setor..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Setor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
