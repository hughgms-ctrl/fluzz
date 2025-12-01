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
import { Checkbox } from "@/components/ui/checkbox";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { SectorDrawer } from "../tasks/SectorDrawer";
import { MemberDrawer } from "../tasks/MemberDrawer";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Briefcase, UserCircle, ChevronRight } from "lucide-react";

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
  const [sectorId, setSectorId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [documentation, setDocumentation] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

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

  const { data: processes } = useQuery({
    queryKey: ["processes", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("process_documentation")
        .select("id, title, area")
        .eq("workspace_id", workspace.id)
        .order("title");
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!workspace,
  });

  const { data: sectors } = useQuery({
    queryKey: ["sectors", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("sectors")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!workspace && open,
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
    enabled: !!workspace && open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: newTask, error: taskError } = await supabase
        .from("routine_tasks")
        .insert({
          routine_id: routineId,
          title,
          description,
          priority,
          status,
          setor: sectorId || null,
          documentation: documentation || null,
          project_id: projectId === "none" ? null : projectId,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Link selected processes
      if (selectedProcesses.length > 0) {
        // We'll store this in a way that can be used when generating tasks
        const { error: processError } = await supabase
          .from("routine_tasks")
          .update({
            process_id: selectedProcesses[0], // Keep the first for backward compatibility
          })
          .eq("id", newTask.id);

        if (processError) throw processError;
      }

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
    setSectorId("");
    setAssignedTo("");
    setDocumentation("");
    setProjectId("none");
    setSelectedProcesses([]);
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
            <Label>Setor</Label>
            <SectorDrawer value={sectorId} onValueChange={(value) => {
              setSectorId(value);
              setAssignedTo("");
            }}>
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <Briefcase size={16} />
                  {sectorId && sectors?.find(s => s.id === sectorId)?.name || "Selecione um setor"}
                </span>
                <ChevronRight size={16} />
              </Button>
            </SectorDrawer>
          </div>

          <div>
            <Label>Responsável (Opcional)</Label>
            <MemberDrawer 
              value={assignedTo} 
              onValueChange={setAssignedTo}
              positionId={sectorId || undefined}
            >
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <UserCircle size={16} />
                  {assignedTo && workspaceMembers?.find(m => m.user_id === assignedTo)?.profiles?.full_name || "Selecione um responsável"}
                </span>
                <ChevronRight size={16} />
              </Button>
            </MemberDrawer>
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
