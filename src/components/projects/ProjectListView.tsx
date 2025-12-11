import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { MoreVertical, Folder } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";

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

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">{isStandaloneFolder ? "Pasta" : "Projeto"}</TableHead>
            <TableHead className="w-[40%]">Progresso</TableHead>
            <TableHead className="w-[20%] text-right">Tarefas</TableHead>
            {(isAdmin || isGestor) && <TableHead className="w-[50px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const progress = getProgress(project);
            return (
              <TableRow
                key={project.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {isStandaloneFolder && <Folder className="h-4 w-4 text-primary" />}
                    {project.name}
                    {isStandaloneFolder && <Badge variant="outline" className="text-xs">Avulso</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <Progress value={progress.percentage} className="h-2" />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {progress.completed}/{progress.total}
                </TableCell>
                {(isAdmin || isGestor) && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!isStandaloneFolder && (
                          <DropdownMenuItem onClick={() => onArchive(project.id)}>
                            {isArchived ? "Restaurar" : "Arquivar"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(project.id)}
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}