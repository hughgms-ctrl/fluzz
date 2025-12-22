import { useState, useCallback, useRef } from "react";
import { streamChat, executeAction, Message, ToolCall } from "@/lib/ai-chat";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Funções que são consultas e devem ser executadas automaticamente
const QUERY_FUNCTIONS = [
  "query_overdue_tasks",
  "query_tasks_by_status",
  "list_projects",
  "list_sectors",
  "list_members",
];

// Funções que precisam de confirmação antes de executar
const ACTION_FUNCTIONS = [
  "create_task",
  "create_project",
  "extract_tasks_from_text",
];

export function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingToolCalls, setPendingToolCalls] = useState<ToolCall[]>([]);
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const messageIdRef = useRef(0);

  const generateId = () => {
    messageIdRef.current += 1;
    return `msg_${Date.now()}_${messageIdRef.current}`;
  };

  const formatQueryResult = (functionName: string, result: any): string => {
    if (!result.success) {
      return `❌ Erro ao consultar: ${result.error}`;
    }

    switch (functionName) {
      case "query_overdue_tasks": {
        const tasks = result.tasks || [];
        if (tasks.length === 0) {
          return "✨ **Ótima notícia!** Não há tarefas atrasadas no momento.";
        }
        let response = `📋 **Encontrei ${tasks.length} tarefa${tasks.length > 1 ? 's' : ''} atrasada${tasks.length > 1 ? 's' : ''}:**\n\n`;
        tasks.forEach((task: any) => {
          const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
          const projectName = task.project?.name || 'Sem projeto';
          const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem data';
          response += `${priority} **${task.title}**\n`;
          response += `   📁 ${projectName} • 📅 Venceu em: ${dueDate}\n\n`;
        });
        return response;
      }

      case "query_tasks_by_status": {
        const tasks = result.tasks || [];
        if (tasks.length === 0) {
          return "📭 Nenhuma tarefa encontrada com esse status.";
        }
        let response = `📋 **${tasks.length} tarefa${tasks.length > 1 ? 's' : ''} encontrada${tasks.length > 1 ? 's' : ''}:**\n\n`;
        tasks.forEach((task: any) => {
          const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
          const projectName = task.project?.name || 'Sem projeto';
          response += `${priority} **${task.title}**\n`;
          response += `   📁 ${projectName}\n\n`;
        });
        return response;
      }

      case "list_projects": {
        const projects = result.projects || [];
        if (projects.length === 0) {
          return "📭 Nenhum projeto ativo encontrado.";
        }
        let response = `📁 **${projects.length} projeto${projects.length > 1 ? 's' : ''} ativo${projects.length > 1 ? 's' : ''}:**\n\n`;
        projects.forEach((project: any) => {
          const statusEmoji = project.status === 'active' ? '🟢' : project.status === 'completed' ? '✅' : '⏸️';
          response += `${statusEmoji} **${project.name}**\n`;
        });
        return response;
      }

      case "list_sectors": {
        const sectors = result.sectors || [];
        if (sectors.length === 0) {
          return "📭 Nenhum setor cadastrado.";
        }
        let response = `🏢 **${sectors.length} setor${sectors.length > 1 ? 'es' : ''} cadastrado${sectors.length > 1 ? 's' : ''}:**\n\n`;
        sectors.forEach((sector: any) => {
          response += `• **${sector.name}**\n`;
        });
        return response;
      }

      case "list_members": {
        const members = result.members || [];
        if (members.length === 0) {
          return "📭 Nenhum membro encontrado.";
        }
        let response = `👥 **${members.length} membro${members.length > 1 ? 's' : ''} no workspace:**\n\n`;
        members.forEach((member: any) => {
          response += `• **${member.name}**\n`;
        });
        return response;
      }

      default:
        return JSON.stringify(result, null, 2);
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!workspace?.id) {
      toast.error("Nenhum workspace selecionado");
      return;
    }

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const chatHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    chatHistory.push({ role: "user", content });

    let assistantContent = "";
    const toolCallsCollected: ToolCall[] = [];

    const updateAssistant = (newContent: string) => {
      assistantContent += newContent;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: assistantContent,
            timestamp: new Date(),
          },
        ];
      });
    };

    const handleToolCall = async (toolCall: ToolCall) => {
      toolCallsCollected.push(toolCall);

      // Se for uma consulta, executa automaticamente
      if (QUERY_FUNCTIONS.includes(toolCall.name)) {
        const result = await executeAction(
          toolCall.name,
          toolCall.arguments,
          workspace.id
        );

        const formattedResult = formatQueryResult(toolCall.name, result.data || result);
        
        // Adiciona o resultado formatado como mensagem do assistente
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.content === assistantContent) {
            return prev.map((m, i) =>
              i === prev.length - 1
                ? { ...m, content: assistantContent + (assistantContent ? "\n\n" : "") + formattedResult }
                : m
            );
          }
          return [
            ...prev,
            {
              id: generateId(),
              role: "assistant",
              content: formattedResult,
              timestamp: new Date(),
            },
          ];
        });
        
        // Atualiza o conteúdo para incluir o resultado
        assistantContent = assistantContent + (assistantContent ? "\n\n" : "") + formattedResult;
      } else {
        // Para ações que precisam confirmação, adiciona à lista de pendentes
        setPendingToolCalls((prev) => [...prev, toolCall]);
      }
    };

    await streamChat(
      chatHistory,
      workspace.id,
      (delta) => updateAssistant(delta),
      handleToolCall,
      () => {
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        toast.error(error);
      }
    );
  }, [messages, workspace]);

  const confirmToolCall = useCallback(async (toolCallId: string) => {
    if (!workspace?.id) return;

    const toolCall = pendingToolCalls.find((tc) => tc.id === toolCallId);
    if (!toolCall) return;

    setPendingToolCalls((prev) =>
      prev.map((tc) =>
        tc.id === toolCallId ? { ...tc, status: "executed" } : tc
      )
    );

    const result = await executeAction(
      toolCall.name,
      toolCall.arguments,
      workspace.id
    );

    if (result.success) {
      toast.success(result.data?.message || "Ação executada com sucesso!");
      
      // Invalidate relevant queries
      if (toolCall.name === "create_task") {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      } else if (toolCall.name === "create_project") {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      }

      // Add result to conversation
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: `✅ ${result.data?.message || "Ação executada com sucesso!"}`,
          timestamp: new Date(),
        },
      ]);
    } else {
      toast.error(result.error || "Erro ao executar ação");
    }

    setPendingToolCalls((prev) => prev.filter((tc) => tc.id !== toolCallId));
  }, [pendingToolCalls, workspace, queryClient]);

  const rejectToolCall = useCallback((toolCallId: string) => {
    setPendingToolCalls((prev) =>
      prev.filter((tc) => tc.id !== toolCallId)
    );
    
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "assistant",
        content: "Entendido. A ação foi cancelada.",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setPendingToolCalls([]);
  }, []);

  return {
    messages,
    isLoading,
    pendingToolCalls,
    sendMessage,
    confirmToolCall,
    rejectToolCall,
    clearChat,
  };
}
