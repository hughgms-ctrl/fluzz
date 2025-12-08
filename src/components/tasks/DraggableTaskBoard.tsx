import React, { useState } from "react";
import { TaskCard } from "./TaskCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors, closestCenter, useDroppable, PointerSensor } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
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
      className={`${column.color} transition-all duration-200 ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
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

function SortableTask({ task, onDelete, onStatusChange }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...attributes}
      {...listeners}
      className={`relative ${isDragging ? 'z-50 scale-[1.02] shadow-lg' : ''} transition-all touch-none`}
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
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 3,
      },
    })
  );

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeTask = tasks.find((t) => t.id === active.id);
    
    // Check if dropped on a column
    const overColumn = columns.find((c) => c.id === over.id);
    
    // Check if dropped on another task
    const overTask = tasks.find((t) => t.id === over.id);
    const targetStatus = overTask?.status || overColumn?.id;

    if (activeTask && targetStatus && activeTask.status !== targetStatus) {
      onUpdateStatus(activeTask.id, targetStatus);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <SortableContext
              key={column.id}
              items={columnTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <DroppableColumn column={column} taskCount={columnTasks.length}>
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
                      onStatusChange={(newStatus: string) => onUpdateStatus(task.id, newStatus)}
                    />
                  ))
                )}
              </DroppableColumn>
            </SortableContext>
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="opacity-70 rotate-1 shadow-2xl scale-105 cursor-grabbing">
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
