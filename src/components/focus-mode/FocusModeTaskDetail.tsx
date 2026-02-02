import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  X, 
  Calendar, 
  Flag, 
  User, 
  FileText, 
  CheckCircle2, 
  Clock, 
  PlayCircle,
  ChevronRight,
  ExternalLink,
  Plus,
  Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn, formatDateBR, isTaskOverdue, isTaskDueSoon } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FocusModeTaskDetailProps {
  task: any;
  profiles: any[];
  onClose: () => void;
  queryKeyToInvalidate?: string[];
}

const statusConfig = {
  todo: { label: "A fazer", icon: Clock, color: "hsl(0, 68%, 72%)" },
  in_progress: { label: "Fazendo", icon: PlayCircle, color: "hsl(30, 100%, 65%)" },
  completed: { label: "Feito", icon: CheckCircle2, color: "hsl(152, 69%, 53%)" },
};

const priorityConfig = {
  high: { label: "Alta", color: "text-destructive bg-destructive/10" },
  medium: { label: "Média", color: "text-warning bg-warning/10" },
  low: { label: "Baixa", color: "text-info bg-info/10" },
};

export function FocusModeTaskDetail({ 
  task, 
  profiles, 
  onClose,
  queryKeyToInvalidate = ["my-tasks", "tasks"] 
}: FocusModeTaskDetailProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { workspace } = useWorkspace();
  
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status || "todo");
  const [priority, setPriority] = useState(task.priority || "medium");
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [documentation, setDocumentation] = useState(task.documentation || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showAssigneeSelect, setShowAssigneeSelect] = useState(false);

  // Fetch all workspace members for assignee selection
  const { data: workspaceMembers } = useQuery({
    queryKey: ["workspace-members-focus", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id, role")
        .eq("workspace_id", workspace.id);
      
      if (!members || members.length === 0) return [];
      
      const userIds = members.map(m => m.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);
      
      return members.map(m => ({
        ...m,
        profile: profilesData?.find(p => p.id === m.user_id)
      }));
    },
    enabled: !!workspace?.id,
  });

  // Fetch current task assignees
  const { data: currentAssignees, refetch: refetchAssignees } = useQuery({
    queryKey: ["task-assignees-focus", task.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_assignees")
        .select("user_id")
        .eq("task_id", task.id);
      return data?.map(a => a.user_id) || [];
    },
    enabled: !!task.id,
  });

  const taskAssignees = task.task_assignees || [];
  const assigneeProfiles = taskAssignees
    .map((ta: any) => profiles?.find(p => p.id === ta.user_id))
    .filter(Boolean);

  const isOverdue = isTaskOverdue(task.due_date, task.status);
  const isDueSoon = isTaskDueSoon(task.due_date, task.status);

  // Update local state when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setStatus(task.status || "todo");
    setPriority(task.priority || "medium");
    setDueDate(task.due_date ? new Date(task.due_date) : undefined);
    setDocumentation(task.documentation || "");
  }, [task]);

  const handleSave = async (field: string, value: any) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ [field]: value })
        .eq("id", task.id);
      
      if (error) throw error;
      
      queryKeyToInvalidate.forEach(key => 
        queryClient.invalidateQueries({ queryKey: [key] })
      );
      toast.success("Salvo!");
    } catch (error) {
      toast.error("Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    handleSave("status", newStatus);
  };

  const handlePriorityChange = (newPriority: string) => {
    setPriority(newPriority);
    handleSave("priority", newPriority);
  };

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      handleSave("title", title.trim());
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== task.description) {
      handleSave("description", description);
    }
  };

  const handleDueDateChange = (date: Date | undefined) => {
    setDueDate(date);
    handleSave("due_date", date ? format(date, "yyyy-MM-dd") : null);
  };

  const handleDocumentationBlur = () => {
    if (documentation !== task.documentation) {
      handleSave("documentation", documentation);
    }
  };

  const handleAddAssignee = async (userId: string) => {
    try {
      // Check if already assigned
      if (currentAssignees?.includes(userId)) {
        toast.info("Usuário já é responsável");
        return;
      }

      const { error } = await supabase
        .from("task_assignees")
        .insert({
          task_id: task.id,
          user_id: userId,
        });
      
      if (error) throw error;
      
      refetchAssignees();
      queryKeyToInvalidate.forEach(key => 
        queryClient.invalidateQueries({ queryKey: [key] })
      );
      toast.success("Responsável adicionado!");
      setShowAssigneeSelect(false);
    } catch (error) {
      toast.error("Erro ao adicionar responsável");
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("task_assignees")
        .delete()
        .eq("task_id", task.id)
        .eq("user_id", userId);
      
      if (error) throw error;
      
      refetchAssignees();
      queryKeyToInvalidate.forEach(key => 
        queryClient.invalidateQueries({ queryKey: [key] })
      );
      toast.success("Responsável removido!");
    } catch (error) {
      toast.error("Erro ao remover responsável");
    }
  };

  const StatusIcon = statusConfig[status as keyof typeof statusConfig]?.icon || Clock;

  return (
    <div className={cn(
      "flex flex-col h-full bg-card",
      isMobile ? "fixed inset-0 z-50" : "border-l"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2 min-w-0">
          {task.projects?.name && (
            <>
              <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                {task.projects.name}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </>
          )}
          <span className="text-sm font-medium truncate">Detalhes</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
            placeholder="Título da tarefa"
          />

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Descrição
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Adicione uma descrição..."
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Attributes Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <StatusIcon className="h-4 w-4" />
                Status
              </label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" style={{ color: config.color }} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Prioridade
              </label>
              <Select value={priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <Badge variant="secondary" className={cn("text-xs", config.color)}>
                        {config.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date - Editable */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Prazo
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      isOverdue && "border-destructive text-destructive",
                      isDueSoon && !isOverdue && "border-amber-500 text-amber-500"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar prazo"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dueDate}
                    onSelect={handleDueDateChange}
                    initialFocus
                    locale={ptBR}
                  />
                  {dueDate && (
                    <div className="p-2 border-t">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-destructive"
                        onClick={() => handleDueDateChange(undefined)}
                      >
                        Remover prazo
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Assignees - Editable */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Responsáveis
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                {assigneeProfiles.length > 0 ? (
                  assigneeProfiles.map((profile: any) => (
                    <div 
                      key={profile.id} 
                      className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-full cursor-pointer hover:bg-destructive/20 group transition-colors"
                      onClick={() => handleRemoveAssignee(profile.id)}
                      title="Clique para remover"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {profile.full_name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate max-w-[60px] group-hover:text-destructive">
                        {profile.full_name?.split(' ')[0]}
                      </span>
                    </div>
                  ))
                ) : null}
                <Popover open={showAssigneeSelect} onOpenChange={setShowAssigneeSelect}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1">
                      <Plus className="h-3 w-3" />
                      Adicionar
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <ScrollArea className="max-h-48">
                      <div className="space-y-1">
                        {workspaceMembers?.filter(m => !currentAssignees?.includes(m.user_id)).map((member) => (
                          <Button
                            key={member.user_id}
                            variant="ghost"
                            className="w-full justify-start gap-2 h-auto py-2"
                            onClick={() => handleAddAssignee(member.user_id)}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.profile?.avatar_url} />
                              <AvatarFallback className="text-[10px]">
                                {member.profile?.full_name?.charAt(0)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate">
                              {member.profile?.full_name || "Sem nome"}
                            </span>
                          </Button>
                        ))}
                        {workspaceMembers?.filter(m => !currentAssignees?.includes(m.user_id)).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Todos os membros já foram adicionados
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Documentation Tab */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Documentação
              </label>
            </div>
            <Textarea
              value={documentation}
              onChange={(e) => setDocumentation(e.target.value)}
              onBlur={handleDocumentationBlur}
              placeholder="Adicione links, arquivos ou informações importantes..."
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Cole links de documentos, vídeos ou qualquer referência útil
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
        <Button onClick={() => navigate(`/tasks/${task.id}`)}>
          Ver Completo
        </Button>
      </div>
    </div>
  );
}
