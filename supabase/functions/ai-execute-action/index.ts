import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, params, workspace_id } = await req.json();

    let result: any = null;

    switch (action) {
      case "create_task": {
        const priorityMap: Record<string, string> = {
          baixa: "low",
          média: "medium",
          alta: "high",
        };

        const { data, error } = await supabase
          .from("tasks")
          .insert({
            title: params.title,
            description: params.description || null,
            priority: priorityMap[params.priority] || "medium",
            project_id: params.project_id || null,
            assigned_to: params.assigned_to || null,
            setor: params.setor || null,
            due_date: params.due_date || null,
            status: "a fazer",
          })
          .select()
          .single();

        if (error) throw error;
        result = { success: true, task: data, message: `Tarefa "${params.title}" criada com sucesso!` };
        break;
      }

      case "create_project": {
        const { data, error } = await supabase
          .from("projects")
          .insert({
            name: params.name,
            description: params.description || null,
            start_date: params.start_date || null,
            end_date: params.end_date || null,
            user_id: user.id,
            workspace_id: workspace_id,
            status: "active",
          })
          .select()
          .single();

        if (error) throw error;
        result = { success: true, project: data, message: `Projeto "${params.name}" criado com sucesso!` };
        break;
      }

      case "query_overdue_tasks": {
        const today = new Date().toISOString().split("T")[0];
        let query = supabase
          .from("tasks")
          .select("id, title, due_date, priority, status, project:projects(name)")
          .lt("due_date", today)
          .neq("status", "feita");

        if (!params.include_all_workspace) {
          query = query.eq("assigned_to", user.id);
        }

        const { data, error } = await query.order("due_date", { ascending: true });
        if (error) throw error;
        result = { success: true, tasks: data, count: data?.length || 0 };
        break;
      }

      case "query_tasks_by_status": {
        let query = supabase
          .from("tasks")
          .select("id, title, due_date, priority, status, project:projects(name)");

        if (params.status) {
          query = query.eq("status", params.status);
        }

        if (!params.include_all_workspace) {
          query = query.eq("assigned_to", user.id);
        }

        const { data, error } = await query.order("created_at", { ascending: false }).limit(20);
        if (error) throw error;
        result = { success: true, tasks: data, count: data?.length || 0 };
        break;
      }

      case "list_projects": {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name, status")
          .eq("workspace_id", workspace_id)
          .eq("archived", false)
          .order("name");

        if (error) throw error;
        result = { success: true, projects: data };
        break;
      }

      case "list_sectors": {
        const { data, error } = await supabase
          .from("sectors")
          .select("id, name")
          .eq("workspace_id", workspace_id)
          .order("name");

        if (error) throw error;
        result = { success: true, sectors: data };
        break;
      }

      case "list_members": {
        const { data, error } = await supabase
          .from("workspace_members")
          .select("user_id, profiles:user_id(full_name)")
          .eq("workspace_id", workspace_id);

        if (error) throw error;
        const members = data?.map((m: any) => ({
          id: m.user_id,
          name: m.profiles?.full_name || "Sem nome",
        }));
        result = { success: true, members };
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro ao executar ação:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
