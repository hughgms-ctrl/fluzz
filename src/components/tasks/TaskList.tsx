import { TaskCard } from "./TaskCard";
import { Card, CardContent } from "@/components/ui/card";

interface TaskListProps {
  tasks: any[];
  onDeleteTask: (taskId: string) => void;
}

export const TaskList = ({ tasks, onDeleteTask }: TaskListProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
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