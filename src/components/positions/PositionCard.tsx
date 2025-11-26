import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Repeat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PositionCardProps {
  position: {
    id: string;
    name: string;
    description: string | null;
  };
}

export function PositionCard({ position }: PositionCardProps) {
  const navigate = useNavigate();

  const { data: recurringTasksCount } = useQuery({
    queryKey: ["recurring-tasks-count", position.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("recurring_tasks")
        .select("*", { count: "exact", head: true })
        .eq("position_id", position.id);
      
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: assignedUsersCount } = useQuery({
    queryKey: ["assigned-users-count", position.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_positions")
        .select("*", { count: "exact", head: true })
        .eq("position_id", position.id);
      
      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate(`/positions/${position.id}`)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Briefcase className="h-6 w-6 text-primary" />
          <div className="flex gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {recurringTasksCount || 0}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {assignedUsersCount || 0}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-lg mt-2">{position.name}</CardTitle>
        {position.description && (
          <CardDescription className="line-clamp-2">
            {position.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" className="w-full" onClick={(e) => {
          e.stopPropagation();
          navigate(`/positions/${position.id}`);
        }}>
          Gerenciar
        </Button>
      </CardContent>
    </Card>
  );
}
