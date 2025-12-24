import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { MoreVertical, Folder, Copy, Trash2, Archive, ArchiveRestore, Bookmark, FileEdit, CalendarDays } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateBR, formatDateShort } from "@/lib/utils";

interface ProjectListViewProps {
  projects: any[];
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  navigate: (path: string) => void;
  isArchived?: boolean;
  isStandaloneFolder?: boolean;
}

export function ProjectListView({ projects, onDelete, onArchive, navigate, isArchived, isStandaloneFolder }: ProjectListViewProps) {
  const { isAdmin, isGestor } = useWorkspace();
  const queryClient = useQueryClient();
  const navigateHook = useNavigate();
  const isMobile = useIsMobile();
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);

  const getProgress = (project: any) => {
    const tasks = project.tasks || [];
    if (tasks.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = tasks.filter((t: any) => t.status === "completed").length;
    return {
      completed,
      total: tasks.length,
      percentage: Math.round((completed / tasks.length) * 100),
    };
  };

  const formatEventDates = (project: any) => {
    if (!project.start_date && !project.end_date) return null;
    
    const start = project.start_date;
    const end = project.end_date;
    
    if (start && end && start !== end) {
      return `${formatDateShort(start)} - ${formatDateShort(end)}`;
    }
    
    return formatDateBR(end || start);
  };

  const saveAsTemplateMutation = useMutation({
    mutationFn: async (project: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: newTemplate, error: templateError } = await supabase
        .from("project_templates")
        .insert([
          {
            name: project.name,
            description: project.description,
            workspace_id: project.workspace_id,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (templateError) throw templateError;

      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*, subtasks(*)")
        .eq("project_id", project.id);

      if (tasksError) throw tasksError;

      const { data: taskProcesses } = await supabase
        .from("task_processes")
        .select("*")
        .in("task_id", tasks?.map(t => t.id) || []);

      if (tasks && tasks.length > 0) {
        const taskIdToIndex: Record<string, number> = {};
        tasks.forEach((task, index) => {
          taskIdToIndex[task.id] = index;
        });

        const newTemplateTasks = tasks.map((task, index) => ({
          template_id: newTemplate.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          setor: task.setor,
          documentation: null,
          process_id: task.process_id,
          task_order: index,
        }));

        const { data: insertedTasks, error: insertError } = await supabase
          .from("template_tasks")
          .insert(newTemplateTasks)
          .select();

        if (insertError) throw insertError;

        if (insertedTasks && insertedTasks.length > 0) {
          const allSubtasks: any[] = [];
          for (let i = 0; i < tasks.length; i++) {
            const originalTask = tasks[i];
            const newTask = insertedTasks[i];
            if (originalTask.subtasks && originalTask.subtasks.length > 0) {
              const subtasksForTask = originalTask.subtasks.map((subtask: any, subIndex: number) => ({
                template_task_id: newTask.id,
                title: subtask.title,
                task_order: subIndex,
              }));
              allSubtasks.push(...subtasksForTask);
            }
          }

          if (allSubtasks.length > 0) {
            await supabase.from("template_subtasks").insert(allSubtasks);
          }

          if (taskProcesses && taskProcesses.length > 0) {
            const newTaskProcesses = taskProcesses
              .filter(tp => taskIdToIndex[tp.task_id] !== undefined)
              .map(tp => ({
                template_task_id: insertedTasks[taskIdToIndex[tp.task_id]].id,
                process_id: tp.process_id,
              }));

            if (newTaskProcesses.length > 0) {
              await supabase.from("template_task_processes").insert(newTaskProcesses);
            }
          }
        }
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-templates"] });
      toast.success("Projeto salvo como modelo!");
    },
    onError: () => {
      toast.error("Erro ao salvar como modelo");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (project: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert([
          {
            name: `Cópia de ${project.name}`,
            description: null,
            status: 'active',
            user_id: user.id,
            workspace_id: project.workspace_id,
            is_draft: true,
            pending_notifications: true,
          },
        ])
        .select()
        .single();

      if (projectError) throw projectError;

      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*, subtasks(*)")
        .eq("project_id", project.id);

      if (tasksError) throw tasksError;

      const { data: taskProcesses, error: tpError } = await supabase
        .from("task_processes")
        .select("*")
        .in("task_id", tasks?.map(t => t.id) || []);

      if (tpError) console.warn("Erro ao buscar task_processes:", tpError);

      if (tasks && tasks.length > 0) {
        const taskIdToIndex: Record<string, number> = {};
        tasks.forEach((task, index) => {
          taskIdToIndex[task.id] = index;
        });

        const newTasks = tasks.map((task) => ({
          title: task.title,
          description: task.description,
          status: 'todo',
          priority: task.priority,
          assigned_to: task.assigned_to,
          setor: task.setor,
          documentation: null,
          process_id: task.process_id,
          completed_verified: false,
          project_id: newProject.id,
          due_date: null,
          start_date: null,
        }));

        const { data: insertedTasks, error: insertError } = await supabase
          .from("tasks")
          .insert(newTasks)
          .select();

        if (insertError) throw insertError;

        if (insertedTasks && insertedTasks.length > 0) {
          const allSubtasks: any[] = [];
          
          for (let i = 0; i < tasks.length; i++) {
            const originalTask = tasks[i];
            const newTask = insertedTasks[i];
            
            if (originalTask.subtasks && originalTask.subtasks.length > 0) {
              const subtasksForTask = originalTask.subtasks.map((subtask: any) => ({
                title: subtask.title,
                completed: false,
                task_id: newTask.id,
              }));
              
              allSubtasks.push(...subtasksForTask);
            }
          }

          if (allSubtasks.length > 0) {
            const { error: subtasksError } = await supabase
              .from("subtasks")
              .insert(allSubtasks);
            
            if (subtasksError) console.warn("Erro ao copiar subtasks:", subtasksError);
          }

          if (taskProcesses && taskProcesses.length > 0) {
            const newTaskProcesses = taskProcesses
              .filter(tp => taskIdToIndex[tp.task_id] !== undefined)
              .map(tp => ({
                task_id: insertedTasks[taskIdToIndex[tp.task_id]].id,
                process_id: tp.process_id,
              }));

            if (newTaskProcesses.length > 0) {
              const { error: tpInsertError } = await supabase
                .from("task_processes")
                .insert(newTaskProcesses);
              
              if (tpInsertError) console.warn("Erro ao copiar task_processes:", tpInsertError);
            }
          }
        }
      }

      return newProject;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Rascunho criado! Edite e clique em 'Publicar' quando estiver pronto.");
      if (newProject) {
        navigateHook(`/projects/${newProject.id}`);
      }
    },
    onError: (error) => {
      console.error("Erro ao duplicar projeto:", error);
      toast.error("Erro ao duplicar projeto");
    },
  });

  const renderActionsDropdown = (project: any, e?: React.MouseEvent) => (
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
            duplicateMutation.mutate(project);
          }}
          disabled={duplicateMutation.isPending}
        >
          <Copy className="mr-2 h-4 w-4" />
          {duplicateMutation.isPending ? "Duplicando..." : "Duplicar"}
        </DropdownMenuItem>
        {!isStandaloneFolder && (
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              saveAsTemplateMutation.mutate(project);
            }}
            disabled={saveAsTemplateMutation.isPending}
          >
            <Bookmark className="mr-2 h-4 w-4" />
            {saveAsTemplateMutation.isPending ? "Salvando..." : "Salvar como Modelo"}
          </DropdownMenuItem>
        )}
        {!isStandaloneFolder && (
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onArchive(project.id);
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
        )}
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteDialog(project.id);
          }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir Projeto
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-3">
        {projects.map((project) => {
          const progress = getProgress(project);
          const eventDates = formatEventDates(project);
          
          return (
            <Card 
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {isStandaloneFolder && <Folder className="h-4 w-4 text-primary flex-shrink-0" />}
                      <h3 className="font-medium text-foreground truncate">{project.name}</h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {isStandaloneFolder && (
                        <Badge variant="outline" className="text-xs">Avulso</Badge>
                      )}
                      {project.is_draft && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                          <FileEdit className="h-3 w-3 mr-1" />
                          Rascunho
                        </Badge>
                      )}
                      {eventDates && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {eventDates}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span>{progress.completed}/{progress.total} tarefas</span>
                      </div>
                      <Progress value={progress.percentage} className="h-2" />
                    </div>
                  </div>
                  
                  {(isAdmin || isGestor) && (
                    <div onClick={(e) => e.stopPropagation()}>
                      {renderActionsDropdown(project)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Projeto</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza de que deseja excluir permanentemente este projeto? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.stopPropagation();
                  if (showDeleteDialog) {
                    onDelete(showDeleteDialog);
                  }
                  setShowDeleteDialog(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir Permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%]">{isStandaloneFolder ? "Pasta" : "Projeto"}</TableHead>
            <TableHead className="w-[20%]">Data</TableHead>
            <TableHead className="w-[30%]">Progresso</TableHead>
            <TableHead className="w-[15%] text-right">Tarefas</TableHead>
            {(isAdmin || isGestor) && <TableHead className="w-[50px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const progress = getProgress(project);
            const eventDates = formatEventDates(project);
            
            return (
              <TableRow
                key={project.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {isStandaloneFolder && <Folder className="h-4 w-4 text-primary" />}
                    <span className="truncate">{project.name}</span>
                    {isStandaloneFolder && <Badge variant="outline" className="text-xs">Avulso</Badge>}
                    {project.is_draft && (
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                        <FileEdit className="h-3 w-3 mr-1" />
                        Rascunho
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {eventDates ? (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {eventDates}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Progress value={progress.percentage} className="h-2" />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {progress.completed}/{progress.total}
                </TableCell>
                {(isAdmin || isGestor) && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {renderActionsDropdown(project)}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir permanentemente este projeto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                if (showDeleteDialog) {
                  onDelete(showDeleteDialog);
                }
                setShowDeleteDialog(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
