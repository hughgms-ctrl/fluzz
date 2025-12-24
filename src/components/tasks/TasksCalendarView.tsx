import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { parseDateOnly, formatUserName } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  due_date?: string | null;
  status?: string | null;
  priority?: string | null;
  assigned_to?: string | null;
  project_id?: string | null;
  projects?: {
    id: string;
    name: string;
  } | null;
}

interface Member {
  id: string;
  full_name: string | null;
}

interface TasksCalendarViewProps {
  tasks: Task[];
  members: Member[];
}

// Get priority color
const getPriorityColor = (priority: string | null) => {
  switch (priority) {
    case "high":
      return { bg: "bg-destructive/20", text: "text-destructive", border: "border-destructive/40" };
    case "medium":
      return { bg: "bg-orange-500/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/40" };
    default:
      return { bg: "bg-primary/20", text: "text-primary", border: "border-primary/40" };
  }
};

export const TasksCalendarView = ({ 
  tasks, 
  members 
}: TasksCalendarViewProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getMemberName = (userId: string | null) => {
    if (!userId) return "Não atribuído";
    const member = members.find(m => m.id === userId);
    return formatUserName(member?.full_name) || "Usuário";
  };

  // Get tasks for a specific day
  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const dueDate = parseDateOnly(task.due_date);
      return dueDate && isSameDay(dueDate, day);
    });
  };

  const weekDays = isMobile 
    ? ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
    : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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
          <h2 className="text-base sm:text-lg font-semibold capitalize ml-2">
            {format(currentMonth, isMobile ? "MMM yyyy" : "MMMM yyyy", { locale: ptBR })}
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
          {weekDays.map((day, i) => (
            <div key={i} className="p-1.5 sm:p-2 text-center text-xs sm:text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayTasks = getTasksForDay(day);
            const pendingTasks = dayTasks.filter(t => t.status !== "completed");
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);
            const hasOverload = pendingTasks.length > 4;

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[80px] sm:min-h-[110px] border-b border-r p-0.5 sm:p-1 transition-colors relative",
                  !isCurrentMonth && "bg-muted/30",
                  hasOverload && "bg-orange-500/5"
                )}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                  <div className={cn(
                    "text-xs sm:text-sm font-medium w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full",
                    !isCurrentMonth && "text-muted-foreground",
                    isTodayDate && "bg-primary text-primary-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                  {pendingTasks.length > 0 && (
                    <Badge 
                      variant={hasOverload ? "destructive" : "secondary"} 
                      className="text-[10px] h-4 px-1"
                    >
                      {pendingTasks.length}
                    </Badge>
                  )}
                </div>
                
                {/* Tasks */}
                <div className="space-y-0.5">
                  {pendingTasks.slice(0, isMobile ? 2 : 3).map(task => {
                    const colors = getPriorityColor(task.priority);
                    
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "text-[10px] sm:text-xs truncate py-0.5 px-1 sm:px-1.5 rounded cursor-pointer transition-colors",
                          colors.bg,
                          colors.text,
                          `hover:opacity-80`
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks/${task.id}`);
                        }}
                        title={`${task.title} - ${getMemberName(task.assigned_to)}`}
                      >
                        <span className="font-medium">{task.title}</span>
                      </div>
                    );
                  })}
                  {pendingTasks.length > (isMobile ? 2 : 3) && (
                    <div className="text-[10px] sm:text-xs text-muted-foreground px-1 sm:px-1.5">
                      +{pendingTasks.length - (isMobile ? 2 : 3)} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-destructive/20" />
          <span className="text-muted-foreground">Alta prioridade</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-orange-500/20" />
          <span className="text-muted-foreground">Média prioridade</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-primary/20" />
          <span className="text-muted-foreground">Baixa prioridade</span>
        </div>
      </div>
    </div>
  );
};
