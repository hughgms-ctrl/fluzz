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
      description: "Extrai tarefas de um texto como resumo de reunião. Retorna lista de tarefas sugeridas com título, descrição e prioridade.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Título da tarefa" },
                description: { type: "string", description: "Descrição detalhada" },
                priority: { type: "string", enum: ["baixa", "média", "alta"] },
                suggested_project: { type: "string", description: "Nome sugerido do projeto, se aplicável" },
                suggested_sector: { type: "string", description: "Setor sugerido, se identificável" },
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
      description: "Cria uma nova tarefa no sistema. Use apenas quando o usuário confirmar a criação.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título da tarefa" },
          description: { type: "string", description: "Descrição da tarefa" },
          priority: { type: "string", enum: ["baixa", "média", "alta"] },
          project_id: { type: "string", description: "ID do projeto (opcional)" },
          assigned_to: { type: "string", description: "ID do usuário para atribuir (opcional)" },
          setor: { type: "string", description: "ID do setor (opcional)" },
          due_date: { type: "string", description: "Data de vencimento no formato YYYY-MM-DD (opcional)" },
        },
        required: ["title", "priority"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Cria um novo projeto no sistema. Use apenas quando o usuário confirmar a criação.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do projeto" },
          description: { type: "string", description: "Descrição do projeto" },
          start_date: { type: "string", description: "Data de início no formato YYYY-MM-DD" },
          end_date: { type: "string", description: "Data de término no formato YYYY-MM-DD" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_overdue_tasks",
      description: "Consulta tarefas atrasadas do usuário ou workspace. Esta é uma consulta que pode ser executada imediatamente.",
      parameters: {
        type: "object",
        properties: {
          include_all_workspace: { type: "boolean", description: "Se true, inclui todas do workspace; se false, apenas do usuário" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_tasks_by_status",
      description: "Consulta tarefas por status. Esta é uma consulta que pode ser executada imediatamente.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["a fazer", "fazendo", "feita"], description: "Status das tarefas" },
          include_all_workspace: { type: "boolean", description: "Se true, inclui todas do workspace" },
        },
        required: ["status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "Lista projetos disponíveis no workspace. Esta é uma consulta que pode ser executada imediatamente.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_sectors",
      description: "Lista setores disponíveis no workspace. Esta é uma consulta que pode ser executada imediatamente.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_members",
      description: "Lista membros do workspace com seus nomes. Esta é uma consulta que pode ser executada imediatamente.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
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

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const systemPrompt = `Você é um assistente de gestão de tarefas e projetos chamado Fluzz AI. Você ajuda o usuário a:
- Extrair tarefas de resumos de reuniões e textos
- Criar tarefas e projetos
- Consultar tarefas atrasadas ou por status
- Atribuir tarefas a pessoas e setores

REGRAS IMPORTANTES:
1. Quando extrair tarefas de um texto, use a função extract_tasks_from_text
2. Para CONSULTAS (query_overdue_tasks, query_tasks_by_status, list_projects, list_sectors, list_members), execute IMEDIATAMENTE sem pedir confirmação
3. Para CRIAÇÕES (create_task, create_project), peça confirmação antes de executar
4. Seja conciso, amigável e objetivo
5. Use formatação Markdown para respostas elegantes
6. Sempre responda em português brasileiro
7. Quando mostrar listas de tarefas, use formatação clara com emojis apropriados

Quando receber resultados de consultas, apresente-os de forma elegante e conversacional.
Por exemplo, para tarefas atrasadas:
- Se houver tarefas: "📋 Encontrei X tarefas atrasadas:\n\n• **Título** - Projeto (prioridade)\n  📅 Venceu em: data"
- Se não houver: "✨ Ótima notícia! Não há tarefas atrasadas."`;

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
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos para continuar." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`Erro no gateway de IA: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Erro no assistente de IA:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
