import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SectorDrawer } from "../tasks/SectorDrawer";
import { MemberDrawer } from "../tasks/MemberDrawer";
import { 
  Briefcase, 
  UserCircle, 
  ChevronRight, 
  FileText, 
  Plus
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { format } from "date-fns";

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
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  
  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [startDate, setStartDate] = useState("");
  const [documentation, setDocumentation] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [showProcessSheet, setShowProcessSheet] = useState(false);

  // Fetch projects
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
    enabled: open && !!workspace,
  });

  // Fetch sectors/positions
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
    enabled: !!workspace && open,
  });

  // Fetch workspace members
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
    enabled: !!workspace && open,
  });

  // Fetch processes based on sector
  const { data: processes } = useQuery({
    queryKey: ["processes", workspace?.id, sectorId],
    queryFn: async () => {
      if (!workspace) return [];
      
      let query = supabase
        .from("process_documentation")
        .select("id, title, area")
        .eq("workspace_id", workspace.id)
        .order("title");
      
      // If a specific sector is selected (not "Multiplos"), filter by area
      if (sectorId && sectorId !== "Multiplos") {
        const sectorName = sectors?.find(s => s.id === sectorId)?.name;
        if (sectorName) {
          query = query.eq("area", sectorName);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!workspace && open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: newTask, error: taskError } = await supabase
        .from("routine_tasks")
        .insert({
          routine_id: routineId,
          title,
          description: description || null,
          priority,
          status,
          setor: sectorId || null,
          documentation: documentation || null,
          project_id: projectId === "none" ? null : projectId,
          assigned_to: assignedTo || null,
          start_date: startDate || null,
          process_id: selectedProcesses.length > 0 ? selectedProcesses[0] : null,
        })
        .select()
        .single();

      if (taskError) throw taskError;
      return newTask;
    },
    onSuccess: () => {
      toast.success("Tarefa adicionada à rotina!");
      queryClient.invalidateQueries({ queryKey: ["routine-tasks", routineId] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error creating routine task:", error);
      toast.error("Erro ao criar tarefa");
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSectorId("");
    setAssignedTo("");
    setPriority("medium");
    setStatus("todo");
    setStartDate("");
    setDocumentation("");
    setProjectId("none");
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

  const getSectorName = (id: string) => {
    if (id === "Multiplos") return "Múltiplos";
    return sectors?.find(s => s.id === id)?.name || id;
  };

  const getMemberName = (userId: string) => {
    return workspaceMembers?.find(m => m.user_id === userId)?.profiles?.full_name || "Selecione um responsável";
  };

  const toggleProcess = (processId: string) => {
    setSelectedProcesses(prev => 
      prev.includes(processId) 
        ? prev.filter(id => id !== processId)
        : [...prev, processId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Tarefa à Rotina</DialogTitle>
          <DialogDescription>
            Esta tarefa será gerada automaticamente conforme a recorrência da rotina
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Conferir relatório financeiro"
              required
            />
          </div>

          {/* 2. Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os detalhes da tarefa..."
              className="min-h-[80px] resize-y"
            />
          </div>

          {/* 3. Setor */}
          <div className="space-y-2">
            <Label>Setor</Label>
            <SectorDrawer 
              value={sectorId} 
              onValueChange={(value) => {
                setSectorId(value);
                setAssignedTo("");
                setSelectedProcesses([]);
              }}
            >
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <Briefcase size={16} />
                  {sectorId ? getSectorName(sectorId) : "Selecione um setor"}
                </span>
                <ChevronRight size={16} />
              </Button>
            </SectorDrawer>
          </div>

          {/* 4. Responsável */}
          <div className="space-y-2">
            <Label>Responsável</Label>
            <MemberDrawer 
              value={assignedTo} 
              onValueChange={setAssignedTo}
              positionId={sectorId === "Multiplos" ? "Multiplos" : (sectorId || undefined)}
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

          {/* 5. Prioridade */}
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

          {/* 6. Status */}
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

          {/* 7. Datas */}
          <div className="space-y-2">
            <Label>Data de Início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* 8. Projeto */}
          <div className="space-y-2">
            <Label>Vincular a Projeto (Opcional)</Label>
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

          {/* 9. Documentação */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText size={16} />
              Documentação
            </Label>
            <Textarea
              value={documentation}
              onChange={(e) => setDocumentation(e.target.value)}
              placeholder="Adicione documentação, links ou anotações importantes..."
              className="min-h-[80px] resize-y"
            />
          </div>

          {/* 10. POPs Vinculados */}
          <div className="space-y-2">
            <Label>POP's Vinculados</Label>
            <Sheet open={showProcessSheet} onOpenChange={setShowProcessSheet}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full justify-between" type="button">
                  <span className="flex items-center gap-2">
                    <Plus size={16} />
                    {selectedProcesses.length > 0 
                      ? `${selectedProcesses.length} POP(s) selecionado(s)`
                      : "Vincular processos"}
                  </span>
                  <ChevronRight size={16} />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Selecionar POPs</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                  <div className="space-y-2">
                    {processes && processes.length > 0 ? (
                      processes.map((process) => (
                        <div
                          key={process.id}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleProcess(process.id)}
                        >
                          <Checkbox 
                            checked={selectedProcesses.includes(process.id)}
                            onCheckedChange={() => toggleProcess(process.id)}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{process.title}</p>
                            <p className="text-xs text-muted-foreground">{process.area}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Nenhum POP encontrado</p>
                        <p className="text-sm mt-2">
                          {sectorId ? "Nenhum processo cadastrado para este setor" : "Selecione um setor primeiro"}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* Show selected processes */}
            {selectedProcesses.length > 0 && (
              <div className="space-y-1">
                {selectedProcesses.map(processId => {
                  const process = processes?.find(p => p.id === processId);
                  return process ? (
                    <div key={processId} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>{process.title}</span>
                      <span className="text-muted-foreground">({process.area})</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Buttons */}
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
              {createMutation.isPending ? "Adicionando..." : "Adicionar Tarefa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
