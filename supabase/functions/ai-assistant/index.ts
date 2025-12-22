import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const tools = [
  {
    type: "function",
    function: {
      name: "extract_tasks_from_text",
      description: "Extrai tarefas de um texto como resumo de reunião. Retorna lista de tarefas sugeridas.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["baixa", "média", "alta"] },
                suggested_assignee_name: { type: "string", description: "Nome sugerido do responsável" },
              },
              required: ["title", "priority"],
            },
          },
        },
        required: ["tasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Cria uma nova tarefa. REGRAS: Admin pode criar para qualquer pessoa. Gestor/Membro só pode criar para si mesmo.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["baixa", "média", "alta"] },
          project_id: { type: "string" },
          assigned_to: { type: "string", description: "ID do usuário (apenas Admin pode atribuir a outros)" },
          setor: { type: "string" },
          due_date: { type: "string" },
        },
        required: ["title", "priority"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Cria um novo projeto. APENAS Admin pode criar projetos.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_overdue_tasks",
      description: "Consulta tarefas atrasadas. Pode filtrar por usuário específico usando o nome.",
      parameters: {
        type: "object",
        properties: {
          user_name: { type: "string", description: "Nome do usuário para filtrar (busca aproximada)" },
          include_all_workspace: { type: "boolean" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_tasks_by_status",
      description: "Consulta tarefas por status. Pode filtrar por usuário específico.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["a fazer", "fazendo", "feita"] },
          user_name: { type: "string", description: "Nome do usuário para filtrar" },
          include_all_workspace: { type: "boolean" },
        },
        required: ["status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_user_tasks",
      description: "Consulta todas as tarefas de um usuário específico pelo nome.",
      parameters: {
        type: "object",
        properties: {
          user_name: { type: "string", description: "Nome do usuário (busca aproximada)" },
          status: { type: "string", enum: ["a fazer", "fazendo", "feita", "todas"] },
        },
        required: ["user_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_user_by_name",
      description: "Busca um usuário pelo nome (busca aproximada/fuzzy).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome ou parte do nome do usuário" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "Lista projetos do workspace.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_sectors",
      description: "Lista setores do workspace.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_members",
      description: "Lista membros do workspace com seus nomes.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_briefings",
      description: "Consulta briefings e debriefings. REQUER permissão can_view_briefings.",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Nome do projeto para filtrar" },
          include_financial: { type: "boolean", description: "Incluir dados financeiros (apenas admin/gestor)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_positions",
      description: "Consulta cargos. REQUER permissão can_view_positions.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_analytics",
      description: "Consulta dados analíticos. REQUER permissão can_view_analytics.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

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

    const { messages, workspace_id } = await req.json();

    // Get user profile for personalization
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const firstName = profile?.full_name?.split(" ")[0] || "usuário";

    // Get user role
    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspace_id)
      .single();

    const userRole = memberData?.role || "membro";

    // Get user permissions
    const { data: permissions } = await supabase
      .from("user_permissions")
      .select("*")
      .eq("user_id", user.id)
      .eq("workspace_id", workspace_id)
      .single();

    // Default permissions (admin/gestor have all permissions)
    const userPermissions = userRole === "admin" || userRole === "gestor" 
      ? {
          can_view_projects: true,
          can_view_tasks: true,
          can_view_positions: true,
          can_view_analytics: true,
          can_view_briefings: true,
          can_view_culture: true,
          can_view_vision: true,
          can_view_processes: true,
          can_view_inventory: true,
        }
      : permissions || {
          can_view_projects: true,
          can_view_tasks: true,
          can_view_positions: true,
          can_view_analytics: true,
          can_view_briefings: true,
          can_view_culture: true,
          can_view_vision: true,
          can_view_processes: true,
          can_view_inventory: false,
        };

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const roleDescription = userRole === "admin" 
      ? "Você é ADMIN e tem permissão total para criar tarefas, projetos e atribuir a qualquer pessoa."
      : userRole === "gestor"
      ? "Você é GESTOR. Pode consultar tudo que tem permissão, mas só pode criar tarefas para si mesmo."
      : "Você é MEMBRO. Pode consultar apenas o que tem permissão, e só pode criar tarefas para si mesmo.";

    const permissionsList = [];
    if (userPermissions.can_view_projects) permissionsList.push("projetos");
    if (userPermissions.can_view_tasks) permissionsList.push("tarefas");
    if (userPermissions.can_view_positions) permissionsList.push("cargos");
    if (userPermissions.can_view_analytics) permissionsList.push("analytics");
    if (userPermissions.can_view_briefings) permissionsList.push("briefings/debriefings");
    if (userPermissions.can_view_inventory) permissionsList.push("inventário");

    const systemPrompt = `Você é o Fluzz AI, um assistente inteligente de gestão de tarefas e projetos.

CONTEXTO DO USUÁRIO:
- Nome: ${firstName}
- ID: ${user.id}
- Role: ${userRole}
- ${roleDescription}

PERMISSÕES DO USUÁRIO (só pode consultar o que tem permissão):
${permissionsList.length > 0 ? `- Pode visualizar: ${permissionsList.join(", ")}` : "- Permissões limitadas"}
${!userPermissions.can_view_briefings ? "- NÃO PODE ver briefings/debriefings" : ""}
${!userPermissions.can_view_positions ? "- NÃO PODE ver cargos" : ""}
${!userPermissions.can_view_analytics ? "- NÃO PODE ver analytics" : ""}
${userRole === "membro" ? "- NÃO PODE ver resultados financeiros gerais (mesmo com permissão de briefing)" : ""}

SUAS CAPACIDADES:
1. Buscar usuários por nome (busca fuzzy/aproximada) - "lucas de angelo" encontra "Lucas D'Angelo"
2. Consultar tarefas de qualquer pessoa por nome (se tiver permissão)
3. Listar tarefas atrasadas, em andamento, concluídas
4. Extrair tarefas de textos/resumos de reuniões
5. Criar tarefas (respeitando permissões)
6. Listar projetos, setores e membros
7. Consultar briefings/debriefings (se tiver permissão)

REGRAS DE PERMISSÃO PARA CRIAÇÃO:
- ADMIN: Pode criar tarefas e projetos para qualquer pessoa
- GESTOR/MEMBRO: Só pode criar tarefas para SI MESMO

REGRAS DE COMPORTAMENTO CRÍTICAS:
1. Para CONSULTAS: Execute imediatamente, sem pedir confirmação
2. Para CRIAÇÕES: Peça confirmação, mas já informe se o usuário não tem permissão
3. SEMPRE use o primeiro nome "${firstName}" nas respostas para personalização
4. Quando o usuário mencionar um nome parcial, use busca fuzzy para encontrar a pessoa
5. NUNCA retorne dados que o usuário não tem permissão de ver
6. Se o usuário pedir algo sem permissão, informe educadamente

FORMATAÇÃO DAS RESPOSTAS (MUITO IMPORTANTE):
- Use **negrito** para títulos, nomes e informações importantes
- Use emojis relevantes para visual moderno: 📋 📁 ✅ 🔴 🟡 🟢 👤 📅 ⚠️ ✨
- Para listas de tarefas/projetos, inclua o ID no formato [ID:xxx] no final de cada item para permitir links
- Exemplo: "1. **Revisar proposta** - 📁 Projeto X • 📅 20/12 [TASK:uuid-aqui]"
- Para projetos: "• **Nome do Projeto** - 🟢 Ativo [PROJECT:uuid-aqui]"
- Separe seções com linhas em branco
- Mantenha respostas elegantes e bem estruturadas
- Sempre responda em português brasileiro`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        tool_choice: "auto",
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Erro no gateway de IA: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Erro no assistente:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
