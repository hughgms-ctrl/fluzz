import { TaskCard } from "./TaskCard";
import { Card, CardContent } from "@/components/ui/card";

interface TaskListProps {
  tasks: any[];
  onDeleteTask: (taskId: string) => void;
}

export const TaskList = ({ tasks, onDeleteTask }: TaskListProps) => {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};