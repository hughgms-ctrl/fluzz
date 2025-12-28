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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SectorDrawer } from "./SectorDrawer";
import { MemberDrawer } from "./MemberDrawer";
import { Briefcase, UserCircle, ChevronRight, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface CreateMyTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateMyTaskDialog = ({ open, onOpenChange }: CreateMyTaskDialogProps) => {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [setor, setSetor] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [approvalReviewerId, setApprovalReviewerId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showReviewerSheet, setShowReviewerSheet] = useState(false);

  const { data: sectors } = useQuery({
    queryKey: ["positions", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!workspace,
  });

  const { data: workspaceMembers } = useQuery({
    queryKey: ["workspace-members", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      
      const { data: members, error: membersError } = await supabase
        .from("workspace_members")
        .select("user_id, role")
        .eq("workspace_id", workspace.id);
      
      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      
      if (profilesError) throw profilesError;

      return members.map(member => ({
        user_id: member.user_id,
        role: member.role,
        profiles: profiles?.find(p => p.id === member.user_id)
      }));
    },
    enabled: !!workspace,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      const taskData = {
        title,
        description: description || null,
        setor: setor || null,
        assigned_to: assignedTo || user.id,
        priority,
        status,
        requires_approval: requiresApproval,
        approval_reviewer_id: requiresApproval ? approvalReviewerId : null,
        approval_status: requiresApproval ? 'pending' : null,
        start_date: startDate || null,
        due_date: dueDate || null,
        project_id: null,
      };
      
      const { data, error } = await supabase
        .from("tasks")
        .insert([taskData])
        .select();
        
      if (error) throw error;

      // Add assignee to task_assignees table
      if (data && data[0]) {
        const assigneeId = assignedTo || user.id;
        await supabase
          .from("task_assignees")
          .insert([{ task_id: data[0].id, user_id: assigneeId }]);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      toast.success("Tarefa criada com sucesso!");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error creating task:", error);
      toast.error(`Erro ao criar tarefa: ${error.message || 'Erro desconhecido'}`);
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSetor("");
    setAssignedTo("");
    setPriority("medium");
    setStatus("todo");
    setRequiresApproval(false);
    setApprovalReviewerId(null);
    setStartDate("");
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

  const getSectorName = (sectorId: string) => {
    if (sectorId === "Multiplos") return "Múltiplos";
    return sectors?.find(s => s.id === sectorId)?.name || sectorId;
  };

  const getMemberName = (userId: string) => {
    return workspaceMembers?.find(m => m.user_id === userId)?.profiles?.full_name || "Selecione um responsável";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>
            Crie uma tarefa pessoal para você
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
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

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma descrição..."
              className="min-h-[100px] resize-y"
            />
          </div>

          {/* Setor */}
          <div className="space-y-2">
            <Label>Setor</Label>
            <SectorDrawer 
              value={setor} 
              onValueChange={(value) => {
                setSetor(value);
                setAssignedTo("");
              }}
            >
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <Briefcase size={16} />
                  {setor ? getSectorName(setor) : "Selecione um setor"}
                </span>
                <ChevronRight size={16} />
              </Button>
            </SectorDrawer>
          </div>

          {/* Responsável */}
          <div className="space-y-2">
            <Label>Responsável</Label>
            <MemberDrawer 
              value={assignedTo} 
              onValueChange={setAssignedTo}
              positionId={setor === "Multiplos" ? "Multiplos" : (setor || undefined)}
            >
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <UserCircle size={16} />
                  {assignedTo ? getMemberName(assignedTo) : "Selecione um responsável"}
                </span>
                <ChevronRight size={16} />
              </Button>
            </MemberDrawer>
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <Label>Prioridade</Label>
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

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
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

          {/* Aprovação */}
          <div className="border-t pt-4 space-y-4">
            <Label className="flex items-center gap-2">
              <Shield size={16} />
              Aprovação
            </Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="requires-approval" className="text-sm font-normal">
                Requer aprovação de outra pessoa
              </Label>
              <Switch
                id="requires-approval"
                checked={requiresApproval}
                onCheckedChange={(checked) => {
                  setRequiresApproval(checked);
                  if (checked) {
                    setShowReviewerSheet(true);
                  } else {
                    setApprovalReviewerId(null);
                  }
                }}
              />
            </div>

            {requiresApproval && (
              <Sheet open={showReviewerSheet} onOpenChange={setShowReviewerSheet}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" type="button">
                    <span className="flex items-center gap-2">
                      <UserCircle size={16} />
                      {approvalReviewerId 
                        ? getMemberName(approvalReviewerId)
                        : "Selecionar quem deve aprovar"}
                    </span>
                    <ChevronRight size={16} />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Selecionar Revisor</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-2">
                    {workspaceMembers?.filter(m => m.user_id !== user?.id).map((member) => (
                      <Button
                        key={member.user_id}
                        variant={approvalReviewerId === member.user_id ? "default" : "outline"}
                        className="w-full justify-start"
                        type="button"
                        onClick={() => {
                          setApprovalReviewerId(member.user_id);
                          setShowReviewerSheet(false);
                        }}
                      >
                        <UserCircle size={16} className="mr-2" />
                        {member.profiles?.full_name || "Usuário"}
                      </Button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Fim (Prazo)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
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
