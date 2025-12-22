import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { format, addDays, differenceInDays, isToday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ArrowDownAZ, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
  sortMode?: "az" | "manual";
  onSortModeChange?: (mode: "az" | "manual") => void;
}

type DragMode = 'move' | 'resize-start' | 'resize-end' | null;

// Natural sort function - recognizes numbers in strings
const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
};

export const TimelineView = ({ 
  tasks, 
  onUpdateTaskDates,
  sortMode = "az",
  onSortModeChange
}: TimelineViewProps) => {
  const navigate = useNavigate();
  const today = startOfDay(new Date());
  
  // View spans 60 days - 30 before today, 30 after
  const [viewOffset, setViewOffset] = useState(0);
  const viewStart = addDays(today, -30 + viewOffset);
  const totalDays = 90;
  const viewEnd = addDays(viewStart, totalDays - 1);
  
  const days = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => addDays(viewStart, i));
  }, [viewStart, totalDays]);

  const [dragState, setDragState] = useState<{
    taskId: string;
    mode: DragMode;
    startX: number;
    initialStartDate: string | null;
    initialDueDate: string | null;
    currentDaysDelta: number;
  } | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // All tasks sorted - including those without dates
  const allTasksSorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (sortMode === "az") {
        return naturalSort(a.title, b.title);
      }
      // Manual - by start_date (tasks without dates go to the end)
      const aStart = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const bStart = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      return aStart - bStart;
    });
  }, [tasks, sortMode]);

  // Filter tasks with dates that are visible in current view
  const visibleTasks = useMemo(() => {
    return allTasksSorted.filter(task => {
      // Tasks without dates are always visible (as ghost bars)
      if (!task.start_date && !task.due_date) return true;
      
      const taskStart = task.start_date ? new Date(task.start_date) : null;
      const taskEnd = task.due_date ? new Date(task.due_date) : taskStart;
      if (!taskStart && !taskEnd) return true;
      
      const start = taskStart || taskEnd!;
      const end = taskEnd || taskStart!;
      return end >= viewStart && start <= viewEnd;
    });
  }, [allTasksSorted, viewStart, viewEnd]);

  const dayWidth = 40; // Fixed pixel width per day for smooth scrolling

  // Get task bar position and width - with optional drag offset
  const getTaskBar = (task: Task, dragInfo: { offset: number; mode: DragMode; initialStart: string | null; initialEnd: string | null } | null) => {
    // Use initial dates from drag state if dragging, otherwise use task dates
    let startDateStr = task.start_date;
    let endDateStr = task.due_date;
    
    if (dragInfo) {
      // Use the initial dates from when drag started
      startDateStr = dragInfo.initialStart;
      endDateStr = dragInfo.initialEnd;
    }
    
    // If we have neither date, return null (ghost bar will be shown instead)
    if (!startDateStr && !endDateStr) return null;
    
    // Handle cases with only one date - use that date for both start and end
    let startDate = startDateStr ? new Date(startDateStr) : new Date(endDateStr!);
    let endDate = endDateStr ? new Date(endDateStr) : new Date(startDateStr!);

    // Apply drag offset based on mode
    if (dragInfo && dragInfo.offset !== 0) {
      if (dragInfo.mode === 'move') {
        startDate = addDays(startDate, dragInfo.offset);
        endDate = addDays(endDate, dragInfo.offset);
      } else if (dragInfo.mode === 'resize-start') {
        const newStart = addDays(startDate, dragInfo.offset);
        startDate = newStart > endDate ? endDate : newStart;
      } else if (dragInfo.mode === 'resize-end') {
        const newEnd = addDays(endDate, dragInfo.offset);
        endDate = newEnd < startDate ? startDate : newEnd;
      }
    }

    const clampedStart = startDate < viewStart ? viewStart : startDate;
    const clampedEnd = endDate > viewEnd ? viewEnd : endDate;

    const left = differenceInDays(clampedStart, viewStart) * dayWidth;
    const duration = differenceInDays(clampedEnd, clampedStart) + 1;
    const width = duration * dayWidth;

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
      currentDaysDelta: 0,
    });
  };

  // Handle drag move - update visual state in real-time
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState) return;

    const deltaX = e.clientX - dragState.startX;
    const daysDelta = Math.round(deltaX / dayWidth);

    // Update visual state immediately
    setDragState(prev => prev ? { ...prev, currentDaysDelta: daysDelta } : null);
  }, [dragState, dayWidth]);

  // Handle drag end - commit changes
  const handleMouseUp = useCallback(() => {
    if (!dragState || dragState.currentDaysDelta === 0) {
      setDragState(null);
      return;
    }

    const initialStartStr = dragState.initialStartDate;
    const initialEndStr = dragState.initialDueDate;
    const daysDelta = dragState.currentDaysDelta;

    // Handle cases where we only have one date
    const initialStart = initialStartStr ? new Date(initialStartStr) : initialEndStr ? new Date(initialEndStr) : null;
    const initialEnd = initialEndStr ? new Date(initialEndStr) : initialStartStr ? new Date(initialStartStr) : null;

    if (!initialStart || !initialEnd) {
      setDragState(null);
      return;
    }

    let newStartDate = initialStart;
    let newDueDate = initialEnd;

    if (dragState.mode === 'move') {
      newStartDate = addDays(initialStart, daysDelta);
      newDueDate = addDays(initialEnd, daysDelta);
    } else if (dragState.mode === 'resize-start') {
      newStartDate = addDays(initialStart, daysDelta);
      if (newStartDate > newDueDate) {
        newStartDate = newDueDate;
      }
    } else if (dragState.mode === 'resize-end') {
      newDueDate = addDays(initialEnd, daysDelta);
      if (newDueDate < newStartDate) {
        newDueDate = newStartDate;
      }
    }

    onUpdateTaskDates(
      dragState.taskId,
      format(newStartDate, 'yyyy-MM-dd'),
      format(newDueDate, 'yyyy-MM-dd')
    );

    setDragState(null);
  }, [dragState, onUpdateTaskDates]);

  useEffect(() => {
    if (dragState) {
      document.body.style.cursor = dragState.mode === 'move' ? 'grabbing' : 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
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

  // Get day of week abbreviation in Portuguese
  const getDayOfWeek = (date: Date) => {
    const dayIndex = date.getDay();
    const weekDays = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    return weekDays[dayIndex];
  };

  const goToToday = () => setViewOffset(0);

  // Calculate today indicator position
  const todayIndex = differenceInDays(today, viewStart);
  const todayPosition = todayIndex * dayWidth;
  const showTodayLine = todayIndex >= 0 && todayIndex < totalDays;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewOffset(offset => offset - 30)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewOffset(offset => offset + 30)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>
        
        {/* Sort Toggle */}
        {onSortModeChange && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortModeChange(sortMode === "manual" ? "az" : "manual")}
            className="gap-2"
          >
            {sortMode === "az" ? (
              <>
                <ArrowDownAZ size={16} />
                A-Z
              </>
            ) : (
              <>
                <GripVertical size={16} />
                Manual
              </>
            )}
          </Button>
        )}
      </div>

      {/* Timeline Container */}
      <div className="border rounded-lg overflow-hidden bg-card" ref={containerRef}>
        <div className="flex">
          {/* Task names column - fixed */}
          <div className="w-48 shrink-0 border-r bg-card z-20">
            {/* Header */}
            <div className="h-14 p-2 border-b bg-muted/50 font-medium text-sm flex items-center">
              Tarefa
            </div>
            {/* Task rows */}
            {visibleTasks.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Nenhuma tarefa
              </div>
            ) : (
              visibleTasks.map(task => (
                <div 
                  key={task.id} 
                  className="h-12 p-2 border-b flex items-center cursor-pointer hover:bg-muted/30 hover:text-primary transition-colors"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <span className="text-sm truncate">{task.title}</span>
                </div>
              ))
            )}
          </div>

          {/* Scrollable timeline area */}
          <ScrollArea className="flex-1" type="always">
            <div 
              ref={timelineRef}
              className="relative"
              style={{ width: totalDays * dayWidth }}
            >
              {/* Date header */}
              <div className="h-14 flex border-b bg-muted/50 sticky top-0 z-10">
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col items-center justify-center border-r text-xs",
                      isToday(day) && "bg-primary/10"
                    )}
                    style={{ width: dayWidth }}
                  >
                    <div className={cn(
                      "font-medium",
                      isToday(day) && "text-primary font-bold"
                    )}>
                      {format(day, "d")}
                    </div>
                    <div className={cn(
                      "text-[10px] text-muted-foreground",
                      isToday(day) && "text-primary"
                    )}>
                      {getDayOfWeek(day)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Task rows with bars */}
              {visibleTasks.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  Nenhuma tarefa neste projeto.
                </div>
              ) : (
                visibleTasks.map(task => {
                  const isDragging = dragState?.taskId === task.id;
                  const dragInfo = isDragging ? {
                    offset: dragState.currentDaysDelta,
                    mode: dragState.mode,
                    initialStart: dragState.initialStartDate,
                    initialEnd: dragState.initialDueDate,
                  } : null;
                  const bar = getTaskBar(task, dragInfo);
                  const hasNoDates = !task.start_date && !task.due_date;
                  
                  // For ghost bars - position centered on today
                  const todayIdx = differenceInDays(today, viewStart);
                  const ghostLeft = todayIdx * dayWidth;
                  const ghostWidth = dayWidth * 3; // 3 days default width
                  
                  return (
                    <div key={task.id} className="h-12 relative border-b">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {days.map((day, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "border-r",
                              isToday(day) && "bg-primary/5"
                            )}
                            style={{ width: dayWidth }}
                          />
                        ))}
                      </div>

                      {/* Ghost bar for tasks without dates */}
                      {hasNoDates && !isDragging && (
                        <div
                          className="absolute top-2 h-8 rounded-md flex items-center justify-center cursor-pointer
                            bg-muted/40 border-2 border-dashed border-muted-foreground/30 
                            hover:bg-muted/60 hover:border-muted-foreground/50 transition-all"
                          style={{
                            left: ghostLeft,
                            width: ghostWidth,
                          }}
                          onClick={() => {
                            // Set dates starting from today with 3 day duration
                            const startDate = format(today, 'yyyy-MM-dd');
                            const endDate = format(addDays(today, 2), 'yyyy-MM-dd');
                            onUpdateTaskDates(task.id, startDate, endDate);
                          }}
                          title="Clique para definir datas"
                        >
                          <span className="text-xs text-muted-foreground/70 select-none">
                            Clique para definir
                          </span>
                        </div>
                      )}

                      {/* Task bar - real or being dragged */}
                      {bar && (
                        <div
                          className={cn(
                            "absolute top-2 h-8 rounded-md flex items-center group transition-all duration-75",
                            getStatusColor(task.status),
                            isDragging 
                              ? "shadow-xl ring-2 ring-primary/50 opacity-90 scale-[1.02]" 
                              : "shadow-sm hover:shadow-md"
                          )}
                          style={{
                            left: bar.left,
                            width: Math.max(bar.width, dayWidth),
                          }}
                        >
                          {/* Resize handle - start */}
                          <div
                            className={cn(
                              "absolute left-0 top-0 bottom-0 w-3 cursor-col-resize rounded-l-md transition-all z-10",
                              "flex items-center justify-center",
                              "bg-black/20 hover:bg-white/40",
                              isDragging && dragInfo?.mode === 'resize-start' && "bg-white/50"
                            )}
                            onMouseDown={(e) => handleDragStart(e, task.id, 'resize-start')}
                          >
                            <div className="w-[2px] h-4 bg-white/90 rounded-full" />
                          </div>

                          {/* Move handle - main area */}
                          <div 
                            className={cn(
                              "flex-1 h-full flex items-center justify-center px-4 cursor-grab",
                              isDragging && dragInfo?.mode === 'move' && "cursor-grabbing"
                            )}
                            onMouseDown={(e) => handleDragStart(e, task.id, 'move')}
                          >
                            <span className="text-xs font-medium text-white truncate select-none">
                              {task.title}
                            </span>
                          </div>

                          {/* Resize handle - end */}
                          <div
                            className={cn(
                              "absolute right-0 top-0 bottom-0 w-3 cursor-col-resize rounded-r-md transition-all z-10",
                              "flex items-center justify-center",
                              "bg-black/20 hover:bg-white/40",
                              isDragging && dragInfo?.mode === 'resize-end' && "bg-white/50"
                            )}
                            onMouseDown={(e) => handleDragStart(e, task.id, 'resize-end')}
                          >
                            <div className="w-[2px] h-4 bg-white/90 rounded-full" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Today indicator line - inside the timeline only */}
              {showTodayLine && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-destructive/60 z-30 pointer-events-none"
                  style={{ left: todayPosition + dayWidth / 2 }}
                >
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-destructive rounded-full shadow-sm" />
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground text-center">
        Arraste as barras para mover ou redimensione pelas bordas • Clique nas barras tracejadas para definir datas
      </p>
    </div>
  );
};