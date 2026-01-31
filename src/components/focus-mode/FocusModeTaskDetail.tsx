import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
  StickyNote
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
import { cn, formatDateBR, isTaskOverdue, isTaskDueSoon } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

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
  
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status || "todo");
  const [priority, setPriority] = useState(task.priority || "medium");
  const [isSaving, setIsSaving] = useState(false);

  const taskAssignees = task.task_assignees || [];
  const assigneeProfiles = taskAssignees
    .map((ta: any) => profiles?.find(p => p.id === ta.user_id))
    .filter(Boolean);

  const isOverdue = isTaskOverdue(task.due_date, task.status);
  const isDueSoon = isTaskDueSoon(task.due_date, task.status);

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/tasks/${task.id}`)}
            className="gap-1 text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Abrir</span>
          </Button>
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
              className="min-h-[100px] resize-none"
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

            {/* Due Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Prazo
              </label>
              <div className={cn(
                "px-3 py-2 rounded-md border text-sm",
                isOverdue && "border-destructive text-destructive",
                isDueSoon && !isOverdue && "border-amber-500 text-amber-500"
              )}>
                {task.due_date ? formatDateBR(task.due_date) : "Sem prazo"}
              </div>
            </div>

            {/* Assignees */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Responsáveis
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                {assigneeProfiles.length > 0 ? (
                  assigneeProfiles.map((profile: any) => (
                    <div key={profile.id} className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-full">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {profile.full_name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate max-w-[80px]">{profile.full_name}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Não atribuído</span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs for Documentation and Notes */}
          <Tabs defaultValue="documentation" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="documentation" className="gap-2 text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5" />
                Documentação
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-2 text-xs sm:text-sm">
                <StickyNote className="h-3.5 w-3.5" />
                Notas
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="documentation" className="mt-4">
              {task.documentation ? (
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: task.documentation }}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma documentação adicionada
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="notes" className="mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Central de notas - Em breve
              </p>
            </TabsContent>
          </Tabs>
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
