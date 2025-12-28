import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Users, Briefcase } from "lucide-react";

interface MultiAssigneeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  currentAssignees: { user_id: string }[];
}

export function MultiAssigneeDialog({
  open,
  onOpenChange,
  taskId,
  currentAssignees,
}: MultiAssigneeDialogProps) {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [allowMultipleSectors, setAllowMultipleSectors] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    currentAssignees.map(a => a.user_id)
  );

  // Reset selected users when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedUsers(currentAssignees.map(a => a.user_id));
    }
  }, [open, currentAssignees]);

  // Fetch positions/sectors
  const { data: positions } = useQuery({
    queryKey: ["positions", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("positions")
        .select("id, name")
        .eq("workspace_id", workspace.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!workspace,
  });

  // Fetch workspace members with their positions
  const { data: workspaceMembers } = useQuery({
    queryKey: ["workspace-members-with-positions", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      
      // First fetch workspace members
      const { data: members, error: membersError } = await supabase
        .from("workspace_members")
        .select("id, user_id, role")
        .eq("workspace_id", workspace.id);
      
      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      // Fetch profiles separately
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      
      if (profilesError) throw profilesError;

      // Fetch user positions
      const { data: userPositions, error: positionsError } = await supabase
        .from("user_positions")
        .select("user_id, position_id")
        .in("user_id", userIds);
      
      if (positionsError) throw positionsError;

      // Combine members with their profiles and positions
      return members.map(member => ({
        ...member,
        profiles: profiles?.find(p => p.id === member.user_id) || null,
        positionIds: userPositions
          ?.filter(up => up.user_id === member.user_id)
          .map(up => up.position_id) || [],
      }));
    },
    enabled: !!workspace,
  });

  // Filter members based on sector selection
  const filteredMembers = useMemo(() => {
    if (!workspaceMembers) return [];
    
    if (allowMultipleSectors || selectedSector === "all") {
      return workspaceMembers;
    }
    
    return workspaceMembers.filter(member => 
      member.positionIds.includes(selectedSector)
    );
  }, [workspaceMembers, selectedSector, allowMultipleSectors]);

  // Mutation to update assignees
  const updateAssigneesMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      // First, delete all existing assignees for this task
      const { error: deleteError } = await supabase
        .from("task_assignees")
        .delete()
        .eq("task_id", taskId);
      
      if (deleteError) throw deleteError;

      // Then insert new assignees
      if (userIds.length > 0) {
        const { error: insertError } = await supabase
          .from("task_assignees")
          .insert(
            userIds.map(userId => ({
              task_id: taskId,
              user_id: userId,
            }))
          );
        
        if (insertError) throw insertError;
      }

      // Update the main assigned_to field to the first assignee (for backwards compatibility)
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ assigned_to: userIds.length > 0 ? userIds[0] : null })
        .eq("id", taskId);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Responsáveis atualizados!");
      queryClient.invalidateQueries({ queryKey: ["task-assignees"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar responsáveis");
    },
  });

  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = () => {
    updateAssigneesMutation.mutate(selectedUsers);
  };

  const getInitials = (name: string | null) => {
    if (!name) return null;
    return name.charAt(0).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Administrador";
      case "gestor": return "Gestor";
      case "membro": return "Membro";
      default: return role;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={18} />
            Gerenciar Responsáveis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sector filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Filtrar por setor</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="multi-sector"
                  checked={allowMultipleSectors}
                  onCheckedChange={(checked) => {
                    setAllowMultipleSectors(checked);
                    if (checked) setSelectedSector("all");
                  }}
                />
                <Label htmlFor="multi-sector" className="text-xs text-muted-foreground cursor-pointer">
                  Múltiplos setores
                </Label>
              </div>
            </div>
            
            {!allowMultipleSectors && (
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users size={14} />
                      Todos os setores
                    </div>
                  </SelectItem>
                  {positions?.map(position => (
                    <SelectItem key={position.id} value={position.id}>
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} />
                        {position.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Members list */}
          <div className="border rounded-lg">
            <ScrollArea className="h-[280px]">
              <div className="p-2 space-y-1">
                {filteredMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum membro encontrado neste setor
                  </p>
                ) : (
                  filteredMembers.map(member => {
                    const profile = member.profiles as any;
                    const isSelected = selectedUsers.includes(member.user_id);
                    
                    return (
                      <label
                        key={member.user_id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/10" : "hover:bg-muted"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleUser(member.user_id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(profile?.full_name) || <User className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {profile?.full_name || "Usuário"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getRoleLabel(member.role)}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Selected count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{selectedUsers.length} responsável(is) selecionado(s)</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateAssigneesMutation.isPending}
            >
              {updateAssigneesMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
