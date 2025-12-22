import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, differenceInDays, addDays, isToday, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Task {
  id: string;
  title: string;
  start_date?: string | null;
  due_date?: string | null;
  status?: string | null;
  priority?: string | null;
  assigned_to?: string | null;
}

interface TimelineViewProps {
  tasks: Task[];
  onUpdateTaskDates: (taskId: string, startDate: string | null, dueDate: string | null) => void;
}

type DragMode = 'move' | 'resize-start' | 'resize-end' | null;

export const TimelineView = ({ tasks, onUpdateTaskDates }: TimelineViewProps) => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dragState, setDragState] = useState<{
    taskId: string;
    mode: DragMode;
    startX: number;
    initialStartDate: string | null;
    initialDueDate: string | null;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible date range (current month view)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const viewStart = startOfWeek(monthStart, { locale: ptBR });
  const viewEnd = endOfWeek(monthEnd, { locale: ptBR });
  
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd });
  const totalDays = days.length;

  // Filter tasks that have dates within the visible range
  const visibleTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.start_date && !task.due_date) return false;
      const taskStart = task.start_date ? new Date(task.start_date) : null;
      const taskEnd = task.due_date ? new Date(task.due_date) : taskStart;
      if (!taskStart && !taskEnd) return false;
      
      // Check if task overlaps with visible range
      const start = taskStart || taskEnd!;
      const end = taskEnd || taskStart!;
      return end >= viewStart && start <= viewEnd;
    });
  }, [tasks, viewStart, viewEnd]);

  // Get day position as percentage
  const getDayPosition = (date: Date): number => {
    const daysDiff = differenceInDays(date, viewStart);
    return (daysDiff / totalDays) * 100;
  };

  // Get task bar position and width
  const getTaskBar = (task: Task) => {
    const startDate = task.start_date ? new Date(task.start_date) : task.due_date ? new Date(task.due_date) : null;
    const endDate = task.due_date ? new Date(task.due_date) : startDate;
    
    if (!startDate || !endDate) return null;

    // Clamp dates to visible range
    const clampedStart = startDate < viewStart ? viewStart : startDate;
    const clampedEnd = endDate > viewEnd ? viewEnd : endDate;

    const left = getDayPosition(clampedStart);
    const duration = differenceInDays(clampedEnd, clampedStart) + 1;
    const width = (duration / totalDays) * 100;

    return { left, width };
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, taskId: string, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setDragState({
      taskId,
      mode,
      startX: e.clientX,
      initialStartDate: task.start_date || null,
      initialDueDate: task.due_date || null,
    });
  };

  // Handle drag move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !containerRef.current) return;

    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const deltaX = e.clientX - dragState.startX;
    const dayWidth = containerWidth / totalDays;
    const daysDelta = Math.round(deltaX / dayWidth);

    if (daysDelta === 0) return;

    const initialStart = dragState.initialStartDate ? new Date(dragState.initialStartDate) : null;
    const initialEnd = dragState.initialDueDate ? new Date(dragState.initialDueDate) : null;

    let newStartDate = initialStart;
    let newDueDate = initialEnd;

    if (dragState.mode === 'move') {
      if (initialStart) newStartDate = addDays(initialStart, daysDelta);
      if (initialEnd) newDueDate = addDays(initialEnd, daysDelta);
    } else if (dragState.mode === 'resize-start' && initialStart) {
      newStartDate = addDays(initialStart, daysDelta);
      // Don't allow start date to be after end date
      if (newDueDate && newStartDate > newDueDate) {
        newStartDate = newDueDate;
      }
    } else if (dragState.mode === 'resize-end' && initialEnd) {
      newDueDate = addDays(initialEnd, daysDelta);
      // Don't allow end date to be before start date
      if (newStartDate && newDueDate < newStartDate) {
        newDueDate = newStartDate;
      }
    }

    onUpdateTaskDates(
      dragState.taskId,
      newStartDate ? format(newStartDate, 'yyyy-MM-dd') : null,
      newDueDate ? format(newDueDate, 'yyyy-MM-dd') : null
    );
  }, [dragState, totalDays, onUpdateTaskDates]);

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  // Add/remove event listeners
  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  // Get status color
  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'blocked': return 'bg-red-500';
      default: return 'bg-primary';
    }
  };

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

      {/* Timeline */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Date header */}
        <div className="flex border-b bg-muted/50 sticky top-0 z-10">
          <div className="w-48 shrink-0 p-2 border-r font-medium text-sm">
            Tarefa
          </div>
          <div className="flex-1 flex">
            {days.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 min-w-[30px] text-center py-1 border-r text-xs",
                  !isSameMonth(day, currentMonth) && "bg-muted/30 text-muted-foreground",
                  isToday(day) && "bg-primary/10"
                )}
              >
                <div className={cn(
                  "font-medium",
                  isToday(day) && "text-primary"
                )}>
                  {format(day, "d")}
                </div>
                <div className="text-muted-foreground text-[10px]">
                  {format(day, "EEE", { locale: ptBR })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task rows */}
        <div ref={containerRef}>
          {visibleTasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma tarefa com datas definidas neste período.
            </div>
          ) : (
            visibleTasks.map(task => {
              const bar = getTaskBar(task);
              
              return (
                <div key={task.id} className="flex border-b hover:bg-muted/30 transition-colors relative h-12">
                  {/* Task name */}
                  <div 
                    className="w-48 shrink-0 p-2 border-r flex items-center gap-2 cursor-pointer hover:text-primary"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <span className="text-sm truncate">{task.title}</span>
                  </div>
                  
                  {/* Timeline area */}
                  <div className="flex-1 relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {days.map((day, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "flex-1 border-r",
                            isToday(day) && "bg-primary/5"
                          )} 
                        />
                      ))}
                    </div>

                    {/* Task bar */}
                    {bar && (
                      <div
                        className={cn(
                          "absolute top-2 h-8 rounded flex items-center group transition-shadow",
                          getStatusColor(task.status),
                          dragState?.taskId === task.id && "shadow-lg ring-2 ring-primary"
                        )}
                        style={{
                          left: `${bar.left}%`,
                          width: `${Math.max(bar.width, 2)}%`,
                        }}
                      >
                        {/* Resize handle - start */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-l flex items-center justify-center"
                          onMouseDown={(e) => handleDragStart(e, task.id, 'resize-start')}
                        >
                          <div className="w-0.5 h-3 bg-white/50 rounded" />
                        </div>

                        {/* Move handle */}
                        <div 
                          className="flex-1 h-full flex items-center justify-center cursor-grab active:cursor-grabbing px-2"
                          onMouseDown={(e) => handleDragStart(e, task.id, 'move')}
                        >
                          <span className="text-xs font-medium text-white truncate">
                            {task.title}
                          </span>
                        </div>

                        {/* Resize handle - end */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-r flex items-center justify-center"
                          onMouseDown={(e) => handleDragStart(e, task.id, 'resize-end')}
                        >
                          <div className="w-0.5 h-3 bg-white/50 rounded" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Today indicator line */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-destructive z-20 pointer-events-none"
          style={{ left: `calc(12rem + ${getDayPosition(new Date())}%)` }}
        />
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground text-center">
        Arraste as barras para mover ou redimensione pelas bordas para alterar as datas
      </p>
    </div>
  );
};
