import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Routine {
  id: string;
  name: string;
  recurrence_type: string;
  start_date: string;
  recurrence_config: any;
}

interface RoutineTask {
  id: string;
  routine_id: string;
  title: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  setor: string | null;
  documentation: string | null;
  project_id: string | null;
  process_id: string | null;
  assigned_to: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, positionId } = await req.json();

    if (!userId || !positionId) {
      throw new Error('userId and positionId are required');
    }

    console.log('Generating tasks from routines for user:', userId, 'position:', positionId);

    // Get all routines for this position
    const { data: routines, error: routinesError } = await supabase
      .from('routines')
      .select('*')
      .eq('position_id', positionId);

    if (routinesError) throw routinesError;

    if (!routines || routines.length === 0) {
      console.log('No routines found for position');
      return new Response(
        JSON.stringify({ message: 'No routines to generate tasks from' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalTasksCreated = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // For each routine, get its tasks and create actual tasks
    for (const routine of routines as Routine[]) {
      const startDate = new Date(routine.start_date);
      startDate.setHours(0, 0, 0, 0);

      // Only generate tasks if today is on or after the start date
      if (today < startDate) {
        console.log('Skipping routine', routine.name, '- start date not yet reached');
        continue;
      }

      const { data: routineTasks, error: tasksError } = await supabase
        .from('routine_tasks')
        .select('*')
        .eq('routine_id', routine.id)
        .order('task_order');

      if (tasksError) throw tasksError;

      if (!routineTasks || routineTasks.length === 0) {
        console.log('No tasks found for routine:', routine.id);
        continue;
      }

      const dueDate = calculateDueDate(routine.recurrence_type, routine.start_date);

      // Process each routine task
      for (const routineTask of routineTasks as RoutineTask[]) {
        // Determine who should receive this task
        let targetUserIds: string[] = [];
        
        if (routineTask.assigned_to) {
          // Task has a specific assignee - only create for that user
          targetUserIds = [routineTask.assigned_to];
        } else {
          // No specific assignee - create for all users in this position
          const { data: positionUsers, error: positionUsersError } = await supabase
            .from('user_positions')
            .select('user_id')
            .eq('position_id', positionId);
          
          if (positionUsersError) throw positionUsersError;
          targetUserIds = positionUsers?.map(pu => pu.user_id) || [];
        }

        // Create tasks for each target user
        for (const targetUserId of targetUserIds) {
          // Check if task already exists for this user today
          const { data: existingTasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('routine_id', routine.id)
            .eq('assigned_to', targetUserId)
            .gte('due_date', today.toISOString().split('T')[0])
            .eq('status', 'todo')
            .eq('title', routineTask.title);

          if (existingTasks && existingTasks.length > 0) {
            console.log(`Task "${routineTask.title}" already exists for user ${targetUserId}`);
            continue;
          }

          // Create the task
          const taskToCreate = {
            title: routineTask.title,
            description: routineTask.description,
            priority: routineTask.priority,
            status: routineTask.status || 'todo',
            setor: routineTask.setor,
            documentation: routineTask.documentation,
            project_id: routineTask.project_id,
            assigned_to: targetUserId,
            due_date: dueDate,
            routine_id: routine.id,
          };

          const { data: newTask, error: insertError } = await supabase
            .from('tasks')
            .insert(taskToCreate)
            .select()
            .single();

          if (insertError) throw insertError;

          // Link processes if needed
          if (newTask && routineTask.process_id) {
            const { error: processLinkError } = await supabase
              .from('task_processes')
              .insert({
                task_id: newTask.id,
                process_id: routineTask.process_id,
              });

            if (processLinkError) {
              console.error('Error linking process:', processLinkError);
            }
          }

          totalTasksCreated++;
          console.log(`Created task "${routineTask.title}" for user ${targetUserId}`);
        }
      }

    }

    console.log('Successfully generated', totalTasksCreated, 'tasks total');

    return new Response(
      JSON.stringify({ 
        message: 'Tasks generated successfully from routines',
        count: totalTasksCreated 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating tasks from routines:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function calculateDueDate(recurrenceType: string, startDate: string): string {
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  
  // If start date is in the future, use start date
  if (start > today) {
    return start.toISOString().split('T')[0];
  }

  // Calculate the next due date based on recurrence from start date
  let nextDate = new Date(start);
  
  switch (recurrenceType) {
    case 'daily':
      // Find the next daily occurrence from start date
      const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      nextDate.setDate(start.getDate() + daysDiff);
      if (nextDate < today) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      break;
    case 'weekly':
      // Find the next weekly occurrence from start date
      const weeksDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
      nextDate.setDate(start.getDate() + (weeksDiff * 7));
      if (nextDate < today) {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;
    case 'monthly':
      // Find the next monthly occurrence from start date
      const monthsDiff = Math.floor((today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth()));
      nextDate.setMonth(start.getMonth() + monthsDiff);
      if (nextDate < today) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;
    case 'yearly':
      // Find the next yearly occurrence from start date
      const yearsDiff = today.getFullYear() - start.getFullYear();
      nextDate.setFullYear(start.getFullYear() + yearsDiff);
      if (nextDate < today) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      break;
    default:
      return today.toISOString().split('T')[0];
  }
  
  return nextDate.toISOString().split('T')[0];
}
