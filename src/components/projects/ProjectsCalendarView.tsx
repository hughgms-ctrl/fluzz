import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Project {
  id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  is_standalone_folder?: boolean;
}

interface ProjectsCalendarViewProps {
  projects: Project[];
  onCreateProject?: (date: Date) => void;
  canEdit?: boolean;
}

export const ProjectsCalendarView = ({ 
  projects, 
  onCreateProject,
  canEdit = false 
}: ProjectsCalendarViewProps) => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group projects by date
  const projectsByDate = useMemo(() => {
    const map = new Map<string, Project[]>();
    projects
      .filter(p => !p.is_standalone_folder)
      .forEach(project => {
        const dates: string[] = [];
        if (project.start_date) dates.push(project.start_date);
        if (project.end_date && project.end_date !== project.start_date) dates.push(project.end_date);
        
        dates.forEach(date => {
          const key = date;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(project);
        });
      });
    return map;
  }, [projects]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold capitalize ml-2">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoje
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayProjects = projectsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[100px] border-b border-r p-1 transition-colors",
                  !isCurrentMonth && "bg-muted/30",
                  canEdit && "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => canEdit && onCreateProject?.(day)}
              >
                <div className={cn(
                  "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                  !isCurrentMonth && "text-muted-foreground",
                  isTodayDate && "bg-primary text-primary-foreground"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayProjects.slice(0, 3).map(project => (
                    <div
                      key={`${project.id}-${dateKey}`}
                      className="text-xs truncate px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}`);
                      }}
                    >
                      {project.name}
                    </div>
                  ))}
                  {dayProjects.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1.5">
                      +{dayProjects.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legend/hint */}
      {canEdit && (
        <p className="text-xs text-muted-foreground text-center">
          Clique em um dia para criar um novo projeto
        </p>
      )}
    </div>
  );
};
