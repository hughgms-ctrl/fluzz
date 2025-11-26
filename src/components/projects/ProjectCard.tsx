import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Copy, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  project: any;
  onDelete: () => void;
  onArchive: () => void;
  isArchived?: boolean;
}

export const ProjectCard = ({ project, onDelete, onArchive, isArchived = false }: ProjectCardProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState(project.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ name: newName })
        .eq("id", project.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Nome atualizado!");
      setIsEditingName(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar nome");
      setProjectName(project.name);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert([
          {
            name: `${project.name} (Cópia)`,
            description: project.description,
            status: project.status,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (projectError) throw projectError;

      // Copiar tarefas
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", project.id);

      if (tasksError) throw tasksError;

      if (tasks && tasks.length > 0) {
        const newTasks = tasks.map((task) => ({
          ...task,
          id: undefined,
          project_id: newProject.id,
          created_at: undefined,
          updated_at: undefined,
        }));

        const { error: insertError } = await supabase
          .from("tasks")
          .insert(newTasks);

        if (insertError) throw insertError;
      }

      return newProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto duplicado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao duplicar projeto");
    },
  });
  
  const totalTasks = project.tasks?.length || 0;
  const completedTasks = project.tasks?.filter((t: any) => t.status === "completed").length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleNameBlur = () => {
    if (projectName.trim() && projectName !== project.name) {
      updateNameMutation.mutate(projectName.trim());
    } else {
      setIsEditingName(false);
      setProjectName(project.name);
    }
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all hover:scale-[1.01] cursor-pointer relative"
    >
      <CardContent className="p-4" onClick={() => navigate(`/projects/${project.id}`)}>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            {isEditingName ? (
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNameBlur();
                  if (e.key === "Escape") {
                    setProjectName(project.name);
                    setIsEditingName(false);
                  }
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-lg h-8"
                autoFocus
              />
            ) : (
              <h3 
                className="font-semibold text-lg text-foreground line-clamp-1 hover:text-primary transition-colors flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                }}
              >
                {project.name}
              </h3>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50 bg-popover">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateMutation.mutate();
                  }}
                  disabled={duplicateMutation.isPending}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {duplicateMutation.isPending ? "Duplicando..." : "Duplicar"}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive();
                  }}
                >
                  {isArchived ? (
                    <>
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                      Restaurar Projeto
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" />
                      Arquivar Projeto
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Projeto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <div className="h-1.5 flex-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {completedTasks}/{totalTasks}
            </span>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir permanentemente o projeto <strong>{project.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};