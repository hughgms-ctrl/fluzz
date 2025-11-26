import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AssignUserDialogProps {
  positionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignUserDialog({ positionId, open, onOpenChange }: AssignUserDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name");
      
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Assign user to position
      const { error: assignError } = await supabase.from("user_positions").insert({
        user_id: selectedUserId,
        position_id: positionId,
        assigned_by: user.id,
      });

      if (assignError) throw assignError;

      // Call edge function to generate recurring tasks
      const { error: functionError } = await supabase.functions.invoke("generate-recurring-tasks", {
        body: { userId: selectedUserId, positionId },
      });

      if (functionError) throw functionError;

      toast.success("Usuário atribuído com sucesso! Tarefas recorrentes foram geradas.");
      queryClient.invalidateQueries({ queryKey: ["assigned-users", positionId] });
      queryClient.invalidateQueries({ queryKey: ["assigned-users-count", positionId] });
      setSelectedUserId("");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atribuir usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Usuário ao Cargo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user">Selecionar Usuário *</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
              <SelectTrigger id="user">
                <SelectValue placeholder="Escolha um usuário" />
              </SelectTrigger>
              <SelectContent>
                {profiles?.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || "Usuário sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !selectedUserId}>
              {loading ? "Atribuindo..." : "Atribuir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
