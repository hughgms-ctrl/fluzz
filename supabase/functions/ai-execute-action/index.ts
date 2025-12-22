import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Função para calcular similaridade de strings (Levenshtein simplificado)
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  
  const editDistance = (a: string, b: string): number => {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };
  
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

// Busca usuário por nome similar
async function findUserByName(supabase: any, workspaceId: string, searchName: string) {
  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId);

  if (!members || members.length === 0) return null;

  const userIds = members.map((m: any) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  if (!profiles || profiles.length === 0) return null;

  const searchLower = searchName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  let bestMatch: any = null;
  let bestScore = 0;

  for (const profile of profiles) {
    const nameLower = (profile.full_name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Verifica se o nome contém a busca
    if (nameLower.includes(searchLower)) {
      const score = 0.9 + (searchLower.length / nameLower.length) * 0.1;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = profile;
      }
    } else {
      // Calcula similaridade
      const score = similarity(searchLower, nameLower);
      if (score > bestScore && score > 0.4) {
        bestScore = score;
        bestMatch = profile;
      }
    }
  }

  return bestMatch ? { ...bestMatch, similarity: bestScore } : null;
}

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

    // Get user role for permission checking
    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspace_id)
      .single();

    const userRole = memberData?.role || "membro";
    const isAdmin = userRole === "admin";

    let result: any = null;

    switch (action) {
      case "find_user_by_name": {
        const foundUser = await findUserByName(supabase, workspace_id, params.name);
        if (foundUser) {
          result = {
            success: true,
            user: foundUser,
            message: `Encontrei: ${foundUser.full_name}`,
          };
        } else {
          result = {
            success: false,
            error: `Não encontrei nenhum usuário com nome similar a "${params.name}"`,
          };
        }
        break;
      }

      case "query_user_tasks": {
        const foundUser = await findUserByName(supabase, workspace_id, params.user_name);
        if (!foundUser) {
          result = {
            success: false,
            error: `Não encontrei usuário com nome similar a "${params.user_name}"`,
          };
          break;
        }

        let query = supabase
          .from("tasks")
          .select("id, title, due_date, priority, status, project:projects(name)")
          .eq("assigned_to", foundUser.id);

        if (params.status && params.status !== "todas") {
          query = query.eq("status", params.status);
        }

        const { data, error } = await query.order("due_date", { ascending: true }).limit(20);
        if (error) throw error;

        result = {
          success: true,
          user_name: foundUser.full_name,
          tasks: data,
          count: data?.length || 0,
        };
        break;
      }

      case "create_task": {
        // Permission check
        if (!isAdmin && params.assigned_to && params.assigned_to !== user.id) {
          result = {
            success: false,
            error: "Você não tem permissão para criar tarefas para outras pessoas. Apenas administradores podem fazer isso.",
          };
          break;
        }

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
            assigned_to: params.assigned_to || user.id,
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
        // Only admin can create projects
        if (!isAdmin) {
          result = {
            success: false,
            error: "Apenas administradores podem criar projetos.",
          };
          break;
        }

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
          .select("id, title, due_date, priority, status, assigned_to, project:projects(name)")
          .lt("due_date", today)
          .neq("status", "feita");

        // If user_name is provided, find the user first
        if (params.user_name) {
          const foundUser = await findUserByName(supabase, workspace_id, params.user_name);
          if (!foundUser) {
            result = {
              success: false,
              error: `Não encontrei usuário com nome similar a "${params.user_name}"`,
            };
            break;
          }
          query = query.eq("assigned_to", foundUser.id);
          
          const { data, error } = await query.order("due_date", { ascending: true });
          if (error) throw error;

          // Get profile for display
          result = {
            success: true,
            user_name: foundUser.full_name,
            tasks: data,
            count: data?.length || 0,
          };
          break;
        }

        if (!params.include_all_workspace) {
          query = query.eq("assigned_to", user.id);
        }

        const { data, error } = await query.order("due_date", { ascending: true });
        if (error) throw error;

        // Enrich with user names
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((t: any) => t.assigned_to).filter(Boolean))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);

          const profileMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);
          data.forEach((task: any) => {
            task.assigned_to_name = profileMap.get(task.assigned_to) || "Não atribuído";
          });
        }

        result = { success: true, tasks: data, count: data?.length || 0 };
        break;
      }

      case "query_tasks_by_status": {
        let query = supabase
          .from("tasks")
          .select("id, title, due_date, priority, status, assigned_to, project:projects(name)");

        if (params.status) {
          query = query.eq("status", params.status);
        }

        // If user_name is provided, find the user first
        if (params.user_name) {
          const foundUser = await findUserByName(supabase, workspace_id, params.user_name);
          if (!foundUser) {
            result = {
              success: false,
              error: `Não encontrei usuário com nome similar a "${params.user_name}"`,
            };
            break;
          }
          query = query.eq("assigned_to", foundUser.id);
        } else if (!params.include_all_workspace) {
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
          .select("user_id, role")
          .eq("workspace_id", workspace_id);

        if (error) throw error;
        
        const userIds = data?.map((m: any) => m.user_id) || [];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const members = data?.map((m: any) => {
          const profile = profiles?.find((p: any) => p.id === m.user_id);
          return {
            id: m.user_id,
            name: profile?.full_name || "Sem nome",
            role: m.role,
          };
        });
        
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
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
