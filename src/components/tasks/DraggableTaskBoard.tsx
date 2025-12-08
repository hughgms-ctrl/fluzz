import React, { useState } from "react";
import { TaskCard } from "./TaskCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  PointerSensor, 
  TouchSensor,
  useSensor, 
  useSensors, 
  closestCorners,
  DragOverEvent,
  useDroppable
} from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DraggableTaskBoardProps {
  tasks: any[];
  onDeleteTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: string) => void;
}

const columns = [
  { id: "todo", title: "A Fazer", color: "border-l-4 border-l-status-todo" },
  { id: "in_progress", title: "Em Progresso", color: "border-l-4 border-l-status-in-progress" },
  { id: "completed", title: "Concluído", color: "border-l-4 border-l-status-completed" },
];

function DroppableColumn({ column, children, taskCount }: { column: any; children: React.ReactNode; taskCount: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <Card 
      ref={setNodeRef} 
      className={`${column.color} transition-all duration-200 ${isOver ? 'ring-2 ring-primary ring-offset-2 bg-accent/50' : ''}`}
    >
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          {column.title}
          <span className="text-sm font-normal text-muted-foreground">
            {taskCount}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2 min-h-[200px]">
        {children}
      </CardContent>
    </Card>
  );
}

function SortableTask({ task, onDelete }: { task: any; onDelete: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    data: {
      type: 'task',
      task,
      status: task.status,
    }
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...attributes}
      {...listeners}
      className={`${isDragging ? 'z-50 cursor-grabbing' : 'cursor-grab'}`}
    >
      <TaskCard
        task={task}
        onDelete={onDelete}
        isDraggable
      />
    </div>
  );
}

export const DraggableTaskBoard = ({ tasks, onDeleteTask, onUpdateStatus }: DraggableTaskBoardProps) => {
  const [activeTask, setActiveTask] = useState<any>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    console.log("Drag start:", event.active.id);
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    console.log("Drag over:", { activeId, overId });

    // Find the active task
    const draggedTask = tasks.find((t) => t.id === activeId);
    if (!draggedTask) return;

    // Check if we're over a column directly
    const overColumn = columns.find((c) => c.id === overId);
    if (overColumn && draggedTask.status !== overColumn.id) {
      console.log("Updating status to:", overColumn.id);
      onUpdateStatus(draggedTask.id, overColumn.id);
      return;
    }

    // Check if we're over another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && draggedTask.status !== overTask.status) {
      console.log("Updating status via task to:", overTask.status);
      onUpdateStatus(draggedTask.id, overTask.status);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    console.log("Drag end:", event);
    const { active, over } = event;
    
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const overColumn = columns.find((c) => c.id === overId);
    if (overColumn) {
      const draggedTask = tasks.find((t) => t.id === activeId);
      if (draggedTask && draggedTask.status !== overColumn.id) {
        console.log("Final update to:", overColumn.id);
        onUpdateStatus(draggedTask.id, overColumn.id);
      }
    }
  };

  const handleDragCancel = () => {
    console.log("Drag cancelled");
    setActiveTask(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <DroppableColumn key={column.id} column={column} taskCount={columnTasks.length}>
              <SortableContext
                items={columnTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {columnTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Arraste tarefas aqui
                  </p>
                ) : (
                  columnTasks.map((task) => (
                    <SortableTask
                      key={task.id}
                      task={task}
                      onDelete={() => onDeleteTask(task.id)}
                    />
                  ))
                )}
              </SortableContext>
            </DroppableColumn>
          );
        })}
      </div>
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeTask ? (
          <div className="rotate-2 shadow-2xl scale-105 opacity-90">
            <TaskCard
              task={activeTask}
              onDelete={() => {}}
              isDraggable
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
