import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTaskAssignees(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-assignees", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from("task_assignees")
        .select("user_id, created_at")
        .eq("task_id", taskId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
}

export function useMultipleTasksAssignees(taskIds: string[]) {
  return useQuery({
    queryKey: ["task-assignees-multiple", taskIds],
    queryFn: async () => {
      if (taskIds.length === 0) return {};
      const { data, error } = await supabase
        .from("task_assignees")
        .select("task_id, user_id")
        .in("task_id", taskIds);
      if (error) throw error;
      
      // Group by task_id
      const grouped: Record<string, { user_id: string }[]> = {};
      data?.forEach(item => {
        if (!grouped[item.task_id]) {
          grouped[item.task_id] = [];
        }
        grouped[item.task_id].push({ user_id: item.user_id });
      });
      
      return grouped;
    },
    enabled: taskIds.length > 0,
  });
}
