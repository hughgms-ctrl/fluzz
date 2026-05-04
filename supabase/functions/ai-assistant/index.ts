import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const tools = [
  // === Consultas ===
  {
    type: "function",
    function: {
      name: "find_user_by_name",
      description: "Busca um usuário pelo nome (busca aproximada/fuzzy).",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
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
      name: "list_members",
      description: "Lista membros do workspace com seus nomes.",
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
      name: "query_user_tasks",
      description: "Consulta todas as tarefas de um usuário específico pelo nome.",
      parameters: {
        type: "object",
        properties: {
          user_name: { type: "string" },
          status: { type: "string", enum: ["a fazer", "fazendo", "feita", "todas"] },
        },
        required: ["user_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_overdue_tasks",
      description: "Consulta tarefas atrasadas. Pode filtrar por usuário.",
      parameters: {
        type: "object",
        properties: {
          user_name: { type: "string" },
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
      description: "Consulta tarefas por status.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["a fazer", "fazendo", "feita"] },
          user_name: { type: "string" },
          include_all_workspace: { type: "boolean" },
        },
        required: ["status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_briefings",
      description: "Consulta briefings/debriefings.",
      parameters: {
        type: "object",
        properties: { project_name: { type: "string" } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_positions",
      description: "Consulta cargos.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_analytics",
      description: "Consulta dados analíticos.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },

  // === Ações ===
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Cria UMA tarefa simples. Para criar projeto com várias tarefas, use create_project_with_tasks.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["baixa", "média", "alta"] },
          project_id: { type: "string" },
          assigned_to: { type: "string" },
          due_date: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["title", "priority"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Cria um projeto SIMPLES sem tarefas. Para projeto+tarefas use create_project_with_tasks.",
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
      name: "create_project_with_tasks",
      description:
        "Cria um projeto completo com várias tarefas (e opcionalmente subtarefas) em uma única operação. USE ISSO quando o usuário quiser planejar um projeto inteiro pela conversa. APENAS Admin/Gestor.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do projeto" },
          description: { type: "string" },
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
          briefing: {
            type: "object",
            description: "Briefing inicial extraído da conversa/transcrição, se houver dados suficientes",
            properties: {
              data: { type: "string", description: "Data do evento/projeto (YYYY-MM-DD)" },
              local: { type: "string" },
              participantes_pagantes: { type: "number" },
              investimento: { type: "number" },
            },
          },
          tasks: {
            type: "array",
            description: "Lista de tarefas a criar dentro do projeto",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["baixa", "média", "alta"] },
                due_date: { type: "string", description: "YYYY-MM-DD" },
                assignee_name: {
                  type: "string",
                  description: "Nome (busca fuzzy) do responsável",
                },
                subtasks: {
                  type: "array",
                  description: "Subtarefas desta tarefa",
                  items: {
                    type: "object",
                    properties: { title: { type: "string" } },
                    required: ["title"],
                  },
                },
              },
              required: ["title"],
            },
          },
        },
        required: ["name", "tasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_subtasks_to_task",
      description: "Adiciona subtarefas a uma tarefa existente.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          subtasks: {
            type: "array",
            items: { type: "string", description: "Título da subtarefa" },
          },
        },
        required: ["task_id", "subtasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_briefing_for_project",
      description: "Cria um briefing inicial para um projeto.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          data: { type: "string", description: "Data do evento (YYYY-MM-DD)" },
          local: { type: "string" },
          participantes_pagantes: { type: "number" },
          investimento: { type: "number" },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Edita uma tarefa existente.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["a fazer", "fazendo", "feita"] },
          priority: { type: "string", enum: ["baixa", "média", "alta"] },
          due_date: { type: "string" },
          assignee_name: { type: "string" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project",
      description: "Edita um projeto existente.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" },
          status: { type: "string", enum: ["active", "completed", "paused"] },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Remove uma tarefa.",
      parameters: {
        type: "object",
        properties: { task_id: { type: "string" } },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "extract_tasks_from_text",
      description: "Extrai tarefas de um texto/resumo de reunião.",
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
                suggested_assignee_name: { type: "string" },
              },
              required: ["title", "priority"],
            },
          },
        },
        required: ["tasks"],
      },
    },
  },
];

// Adapta tools (formato OpenAI) para Anthropic
function toolsToAnthropic(toolList: any[]) {
  return toolList.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}

// Adapta tools (formato OpenAI) para Gemini
function toolsToGemini(toolList: any[]) {
  return [
    {
      function_declarations: toolList.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    },
  ];
}

// Stream Anthropic → SSE no formato OpenAI
async function streamAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: any[],
): Promise<Response> {
  // Anthropic não aceita role:system inline
  const anthMessages = messages.filter((m) => m.role !== "system");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthMessages,
      tools: toolsToAnthropic(tools),
      stream: true,
    }),
  });

  if (!resp.ok || !resp.body) {
    const err = await resp.text();
    throw new Error(`Anthropic erro ${resp.status}: ${err}`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      let toolUseId = "";
      let toolUseName = "";
      let toolUseInputJson = "";
      let toolIndex = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const evt = JSON.parse(data);
            if (evt.type === "content_block_start" && evt.content_block?.type === "tool_use") {
              toolUseId = evt.content_block.id;
              toolUseName = evt.content_block.name;
              toolUseInputJson = "";
              toolIndex = evt.index || 0;
            } else if (evt.type === "content_block_delta") {
              if (evt.delta?.type === "text_delta") {
                const chunk = {
                  choices: [{ delta: { content: evt.delta.text } }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              } else if (evt.delta?.type === "input_json_delta") {
                toolUseInputJson += evt.delta.partial_json;
                const chunk = {
                  choices: [
                    {
                      delta: {
                        tool_calls: [
                          {
                            index: toolIndex,
                            id: toolUseId,
                            function: {
                              name: toolUseName,
                              arguments: evt.delta.partial_json,
                            },
                          },
                        ],
                      },
                    },
                  ],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              }
            } else if (evt.type === "message_stop") {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            }
          } catch {
            /* ignora parse parcial */
          }
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

// Stream Gemini → SSE no formato OpenAI
async function streamGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: any[],
): Promise<Response> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      tools: toolsToGemini(tools),
    }),
  });

  if (!resp.ok || !resp.body) {
    const err = await resp.text();
    throw new Error(`Gemini erro ${resp.status}: ${err}`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      let toolIdx = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const evt = JSON.parse(data);
            const parts = evt.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if (part.text) {
                const chunk = { choices: [{ delta: { content: part.text } }] };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              } else if (part.functionCall) {
                const chunk = {
                  choices: [
                    {
                      delta: {
                        tool_calls: [
                          {
                            index: toolIdx,
                            id: `tc_${toolIdx}_${Date.now()}`,
                            function: {
                              name: part.functionCall.name,
                              arguments: JSON.stringify(part.functionCall.args || {}),
                            },
                          },
                        ],
                      },
                    },
                  ],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                toolIdx++;
              }
            }
          } catch {
            /* parse parcial */
          }
        }
      }
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, workspace_id } = await req.json();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const firstName = profile?.full_name?.split(" ")[0] || "usuário";

    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspace_id)
      .single();

    const userRole = memberData?.role || "membro";

    // === Carregar config de IA do workspace (com service role para ler api_key) ===
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: aiConfig } = await adminClient
      .from("ai_workspace_config")
      .select("provider, model, api_key, use_own_key")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const provider = aiConfig?.use_own_key ? aiConfig.provider : "lovable";
    const model = aiConfig?.model || "google/gemini-3-flash-preview";
    const apiKey = aiConfig?.use_own_key ? aiConfig.api_key : LOVABLE_API_KEY;

    const roleDescription =
      userRole === "admin"
        ? "Você é ADMIN: pode criar projetos, tarefas, subtarefas e briefings, atribuir a qualquer pessoa."
        : userRole === "gestor"
        ? "Você é GESTOR: pode criar projetos com tarefas, atribuir a qualquer membro."
        : "Você é MEMBRO: só pode criar tarefas para si mesmo, não pode criar projetos.";

    const systemPrompt = `Você é o **Fluzz AI**, um co-piloto inteligente e CONVERSACIONAL para gestão de projetos.

CONTEXTO:
- Usuário: ${firstName} (id: ${user.id})
- Role: ${userRole}
- ${roleDescription}
- Data atual: ${new Date().toISOString().split("T")[0]}

SUA MISSÃO PRINCIPAL:
Você ajuda o usuário a CRIAR PROJETOS COMPLETOS conversando. O usuário pode dizer "vamos criar um projeto" e você deve:

1. **DESCOBRIR** — faça perguntas curtas para entender:
   - Nome do projeto
   - Datas (início, fim) — entenda referências como "daqui a 2 semanas", "no fim do mês"
   - Quem participa (responsáveis)
   - Quais entregas/tarefas principais
   - Se tem briefing (data do evento, local, participantes, investimento)

2. **PROPOR** — depois de coletar, **proponha em texto** uma estrutura clara:
   "Vou criar o projeto **X** com estas tarefas:
   1. Tarefa A — responsável Y, prazo Z
   2. Tarefa B — subtarefas: a, b, c
   ..."
   E pergunte: "Posso criar?"

3. **EXECUTAR** — quando o usuário confirmar (sim, pode, cria, vai), use a tool **create_project_with_tasks** UMA ÚNICA VEZ com TODA a estrutura (projeto + tarefas + subtarefas). Não chame create_project + várias create_task — isso é ineficiente.

4. **ITERAR** — depois de criado, o usuário pode pedir ajustes ("adiciona uma tarefa de revisão", "muda o prazo da 2 pra sexta"). Use update_task, add_subtasks_to_task, etc.

TRANSCRIÇÕES DE REUNIÃO:
- Se a mensagem vier com [TRANSCRIÇÃO ANEXADA], leia a transcrição inteira e extraia: objetivo do projeto, contexto, entregáveis, tarefas, subtarefas, responsáveis mencionados e prazos.
- Se o projeto, tarefas e prazos estiverem claros o suficiente, proponha a estrutura em texto e chame **create_project_with_tasks** para o usuário confirmar no card.
- Se houver briefing na conversa, inclua o objeto **briefing** dentro de **create_project_with_tasks** junto com projeto, tarefas e subtarefas.
- Só faça perguntas se faltar algo essencial para criar com segurança (ex.: nome do projeto impossível de deduzir, prazo crítico ambíguo, responsável citado de forma impossível de identificar).
- Não use extract_tasks_from_text para transcrições quando houver um projeto claro; use **create_project_with_tasks**.

REGRAS DE OURO:
- Para CONSULTAS (ver tarefas, listar projetos): execute imediatamente, sem confirmação.
- Para CRIAÇÕES/EDIÇÕES/EXCLUSÕES: SEMPRE proponha em texto antes e peça confirmação curta.
- Use **busca fuzzy de nomes** — se o usuário disser "atribui pra Mariana", encontre a Mariana mesmo que o nome completo seja diferente.
- Use **datas ISO** (YYYY-MM-DD) ao chamar tools, mas converse em datas amigáveis ("sexta-feira, 30/05").
- Se faltar info essencial, PERGUNTE — não invente.
- Sempre em português brasileiro.

FORMATAÇÃO:
- **negrito** para destaques
- Emojis: 📋 📁 ✅ 🔴 🟡 🟢 👤 📅 ⚠️ ✨ 🎯
- Listas numeradas para propostas de tarefas
- Inclua [TASK:id] e [PROJECT:id] em referências quando houver`;

    // === Roteamento por provedor ===
    if (provider === "anthropic") {
      if (!apiKey) throw new Error("Chave Anthropic não configurada");
      return await streamAnthropic(apiKey, model, systemPrompt, messages);
    }

    if (provider === "gemini") {
      if (!apiKey) throw new Error("Chave Gemini não configurada");
      return await streamGemini(apiKey, model, systemPrompt, messages);
    }

    // OpenAI direto OU Lovable Gateway (mesmo formato)
    const url =
      provider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : "https://ai.gateway.lovable.dev/v1/chat/completions";

    if (!apiKey) throw new Error("API key não configurada");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
        tool_choice: "auto",
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite excedido." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("Gateway erro:", response.status, errText);
      throw new Error(`Erro ${response.status}: ${errText.slice(0, 200)}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ai-assistant erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
