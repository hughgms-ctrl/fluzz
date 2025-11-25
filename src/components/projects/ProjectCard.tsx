import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface ProjectCardProps {
  project: any;
  onDelete: () => void;
}

export const ProjectCard = ({ project, onDelete }: ProjectCardProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState(project.name);

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
      className="hover:shadow-lg transition-all hover:scale-[1.01] cursor-pointer"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
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
              }}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-lg h-8"
              autoFocus
            />
          ) : (
            <h3 
              className="font-semibold text-lg text-foreground line-clamp-1 hover:text-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingName(true);
              }}
            >
              {project.name}
            </h3>
          )}
          
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
    </Card>
  );
};