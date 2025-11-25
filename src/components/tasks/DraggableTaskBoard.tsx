import { TaskCard } from "./TaskCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

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

function SortableTask({ task, onDelete, onStatusChange }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}

export const DraggableTaskBoard = ({ tasks, onDeleteTask, onUpdateStatus }: DraggableTaskBoardProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
    const overColumn = columns.find((c) => c.id === over.id);

    if (activeTask && overColumn && activeTask.status !== overColumn.id) {
      onUpdateStatus(activeTask.id, overColumn.id);
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
              <Card className={`${column.color}`} id={column.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {column.title}
                    <span className="text-sm font-normal text-muted-foreground">
                      {columnTasks.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2 min-h-[200px]">
                  {columnTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma tarefa
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
                </CardContent>
              </Card>
            </SortableContext>
          );
        })}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            onDelete={() => {}}
            onStatusChange={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
