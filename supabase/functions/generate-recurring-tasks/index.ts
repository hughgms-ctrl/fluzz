import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Routine {
  id: string;
  name: string;
  recurrence_type: string;
}

interface RoutineTask {
  id: string;
  routine_id: string;
  title: string;
  description: string | null;
  priority: string | null;
  project_id: string | null;
  process_id: string | null;
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

    // For each routine, get its tasks and create actual tasks
    for (const routine of routines as Routine[]) {
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

      const dueDate = calculateDueDate(routine.recurrence_type);

      // Create tasks for each routine task
      const tasksToCreate = (routineTasks as RoutineTask[]).map((rt) => ({
        title: rt.title,
        description: rt.description,
        priority: rt.priority,
        status: 'todo',
        project_id: rt.project_id,
        process_id: rt.process_id,
        assigned_to: userId,
        due_date: dueDate,
        routine_id: routine.id,
      }));

      const { error: insertError } = await supabase
        .from('tasks')
        .insert(tasksToCreate);

      if (insertError) throw insertError;

      totalTasksCreated += tasksToCreate.length;
      console.log('Created', tasksToCreate.length, 'tasks for routine:', routine.name);
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

function calculateDueDate(recurrenceType: string): string {
  const today = new Date();
  
  switch (recurrenceType) {
    case 'daily':
      return today.toISOString().split('T')[0];
    case 'weekly':
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    case 'monthly':
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);
      return nextMonth.toISOString().split('T')[0];
    case 'yearly':
      const nextYear = new Date(today);
      nextYear.setFullYear(today.getFullYear() + 1);
      return nextYear.toISOString().split('T')[0];
    default:
      return today.toISOString().split('T')[0];
  }
}
