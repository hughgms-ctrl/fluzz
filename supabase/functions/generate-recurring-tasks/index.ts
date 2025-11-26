import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurringTask {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  recurrence_type: string;
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

    console.log('Generating recurring tasks for user:', userId, 'position:', positionId);

    // Get all recurring tasks for this position
    const { data: recurringTasks, error: tasksError } = await supabase
      .from('recurring_tasks')
      .select('*')
      .eq('position_id', positionId);

    if (tasksError) throw tasksError;

    if (!recurringTasks || recurringTasks.length === 0) {
      console.log('No recurring tasks found for position');
      return new Response(
        JSON.stringify({ message: 'No recurring tasks to generate' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's projects to assign tasks to
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)
      .eq('archived', false)
      .limit(1);

    if (projectsError) throw projectsError;

    if (!projects || projects.length === 0) {
      throw new Error('User has no active projects');
    }

    const projectId = projects[0].id;

    // Generate tasks based on recurrence
    const tasksToCreate = recurringTasks.map((rt: RecurringTask) => {
      const dueDate = calculateDueDate(rt.recurrence_type);
      
      return {
        title: rt.title,
        description: rt.description,
        priority: rt.priority,
        status: 'todo',
        project_id: projectId,
        assigned_to: userId,
        due_date: dueDate,
        recurring_task_id: rt.id,
        process_id: rt.process_id,
      };
    });

    // Insert tasks
    const { error: insertError } = await supabase
      .from('tasks')
      .insert(tasksToCreate);

    if (insertError) throw insertError;

    console.log('Successfully generated', tasksToCreate.length, 'tasks');

    return new Response(
      JSON.stringify({ 
        message: 'Recurring tasks generated successfully',
        count: tasksToCreate.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating recurring tasks:', error);
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
