import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  status: "pending" | "confirmed" | "rejected" | "executed";
  result?: any;
}

export interface AIContext {
  workspaceId: string;
  userId: string;
}

export async function streamChat(
  messages: { role: string; content: string }[],
  workspaceId: string,
  onDelta: (text: string) => void,
  onToolCall: (toolCall: ToolCall) => void,
  onDone: () => void,
  onError: (error: string) => void
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      onError("Sessão expirada. Faça login novamente.");
      return;
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages, workspace_id: workspaceId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429) {
        onError("Limite de requisições excedido. Aguarde alguns segundos.");
        return;
      }
      if (response.status === 402) {
        onError("Créditos de IA esgotados.");
        return;
      }
      onError(errorData.error || "Erro ao conectar com a IA");
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("Falha ao iniciar streaming");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let toolCallsBuffer: Record<string, { name: string; arguments: string }> = {};
    const toolCallIdsByIndex: Record<number, string> = {};

    const flushToolCalls = () => {
      for (const [id, tc] of Object.entries(toolCallsBuffer)) {
        if (!tc.name || !tc.arguments.trim()) continue;
        try {
          const args = JSON.parse(tc.arguments);
          onToolCall({
            id,
            name: tc.name,
            arguments: args,
            status: "pending",
          });
        } catch (e) {
          console.error("Failed to parse tool call arguments:", e, tc);
        }
      }
      toolCallsBuffer = {};
      Object.keys(toolCallIdsByIndex).forEach((key) => delete toolCallIdsByIndex[Number(key)]);
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          flushToolCalls();
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta;

          if (delta?.content) {
            onDelta(delta.content);
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const index = tc.index ?? 0;
              const id = tc.id || toolCallIdsByIndex[index] || `tc_${index}`;
              toolCallIdsByIndex[index] = id;
              
              if (!toolCallsBuffer[id]) {
                toolCallsBuffer[id] = { name: "", arguments: "" };
              }
              
              if (tc.function?.name) {
                toolCallsBuffer[id].name = tc.function.name;
              }
              if (tc.function?.arguments) {
                toolCallsBuffer[id].arguments += tc.function.arguments;
              }
            }
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    flushToolCalls();
    onDone();
  } catch (error) {
    console.error("Stream chat error:", error);
    onError(error instanceof Error ? error.message : "Erro desconhecido");
  }
}

export async function executeAction(
  action: string,
  params: Record<string, any>,
  workspaceId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: "Sessão expirada" };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-execute-action`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, params, workspace_id: workspaceId }),
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, error: result.error || "Erro ao executar ação" };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Execute action error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}
