import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreVertical, Trash2, Calendar, User, FileText } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskCardProps {
  task: any;
  onDelete: () => void;
  onStatusChange?: (status: string) => void;
}

export const TaskCard = ({ task, onDelete, onStatusChange }: TaskCardProps) => {
  const [verified, setVerified] = useState(task.completed_verified || false);
  const [showDoc, setShowDoc] = useState(false);
  
  const priorityColors = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  };

  const handleVerifyToggle = async (checked: boolean) => {
    const { error } = await supabase
      .from("tasks")
      .update({ completed_verified: checked })
      .eq("id", task.id);
    
    if (error) {
      toast.error("Erro ao atualizar certificação");
      return;
    }
    
    setVerified(checked);
    toast.success(checked ? "Tarefa certificada!" : "Certificação removida");
  };

  const statusLabels = {
    todo: "A Fazer",
    in_progress: "Em Progresso",
    completed: "Concluído",
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 ml-2">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onStatusChange && (
                <>
                  <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onStatusChange("todo")}>
                    A Fazer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange("in_progress")}>
                    Em Progresso
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange("completed")}>
                    Concluído
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2" size={16} />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant={priorityColors[task.priority as keyof typeof priorityColors] as any}>
            {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
          </Badge>
          {!onStatusChange && (
            <Badge variant="outline">
              {statusLabels[task.status as keyof typeof statusLabels]}
            </Badge>
          )}
          {task.due_date && (
            <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
              <Calendar size={12} />
              {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
            </div>
          )}
        </div>

        {task.assigned_to && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User size={12} />
            <span>Responsável atribuído</span>
          </div>
        )}

        {task.status === "completed" && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Checkbox
              id={`verify-${task.id}`}
              checked={verified}
              onCheckedChange={handleVerifyToggle}
            />
            <label
              htmlFor={`verify-${task.id}`}
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Certificar conclusão
            </label>
          </div>
        )}

        {task.documentation && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDoc(!showDoc)}
              className="gap-2 h-8"
            >
              <FileText size={14} />
              {showDoc ? "Ocultar" : "Ver"} Documentação
            </Button>
            {showDoc && (
              <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                {task.documentation}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};