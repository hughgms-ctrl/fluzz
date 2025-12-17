import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TaskWithProject {
  id: string;
  title: string;
  due_date: string;
  assigned_to: string;
  status: string;
  project_id: string | null;
  projects?: {
    name: string;
    workspace_id: string;
    archived: boolean;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting task deadline check...");

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date and tomorrow's date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    console.log("Checking tasks for dates:", {
      today: today.toISOString(),
      tomorrow: tomorrow.toISOString(),
    });

    // Fetch all active tasks with due dates
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        due_date,
        assigned_to,
        status,
        project_id,
        projects:project_id (
          name,
          workspace_id,
          archived
        )
      `)
      .not("due_date", "is", null)
      .not("assigned_to", "is", null)
      .neq("status", "completed");

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    console.log(`Found ${tasks?.length || 0} active tasks with due dates`);

    const notifications: Array<{
      user_id: string;
      workspace_id: string | null;
      type: string;
      title: string;
      message: string;
      link: string;
      data: any;
    }> = [];

    // Process each task
    for (const task of (tasks as TaskWithProject[]) || []) {
      // Skip tasks from archived projects
      if (task.projects?.archived === true) {
        console.log(`Skipping task "${task.title}" - project is archived`);
        continue;
      }

      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);

      const workspaceId = task.projects?.workspace_id || null;
      
      // If no workspace, try to get it from the user's workspace_members
      let finalWorkspaceId = workspaceId;
      if (!finalWorkspaceId && task.assigned_to) {
        const { data: memberData } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", task.assigned_to)
          .limit(1)
          .single();
        
        finalWorkspaceId = memberData?.workspace_id || null;
      }

      // Check if task is overdue
      if (dueDate < today) {
        // Check if we already sent an overdue notification today
        const { data: existingNotification } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", task.assigned_to)
          .eq("type", "task_overdue")
          .gte("created_at", today.toISOString())
          .eq("data->>task_id", task.id)
          .maybeSingle();

        if (!existingNotification) {
          const projectInfo = task.projects?.name 
            ? ` no projeto ${task.projects.name}`
            : "";

          notifications.push({
            user_id: task.assigned_to,
            workspace_id: finalWorkspaceId,
            type: "task_overdue",
            title: "⚠️ Tarefa atrasada",
            message: `A tarefa "${task.title}"${projectInfo} está atrasada desde ${dueDate.toLocaleDateString("pt-BR")}`,
            link: `/tasks/${task.id}`,
            data: {
              task_id: task.id,
              task_title: task.title,
              due_date: task.due_date,
              project_id: task.project_id,
            },
          });
        }
      }
      // Check if task is due tomorrow (send reminder)
      else if (dueDate >= tomorrow && dueDate < dayAfterTomorrow) {
        // Check if we already sent a due soon notification for this task
        const { data: existingNotification } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", task.assigned_to)
          .eq("type", "task_due_soon")
          .gte("created_at", today.toISOString())
          .eq("data->>task_id", task.id)
          .maybeSingle();

        if (!existingNotification) {
          const projectInfo = task.projects?.name 
            ? ` no projeto ${task.projects.name}`
            : "";

          notifications.push({
            user_id: task.assigned_to,
            workspace_id: finalWorkspaceId,
            type: "task_due_soon",
            title: "⏰ Tarefa vence amanhã",
            message: `A tarefa "${task.title}"${projectInfo} vence amanhã (${dueDate.toLocaleDateString("pt-BR")})`,
            link: `/tasks/${task.id}`,
            data: {
              task_id: task.id,
              task_title: task.title,
              due_date: task.due_date,
              project_id: task.project_id,
            },
          });
        }
      }
    }

    console.log(`Creating ${notifications.length} notifications`);

    // Insert all notifications in batch
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Error creating notifications:", notifError);
        throw notifError;
      }
    }

    const summary = {
      checked: tasks?.length || 0,
      notifications_created: notifications.length,
      timestamp: new Date().toISOString(),
    };

    console.log("Task deadline check completed:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in check-task-deadlines function:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);
