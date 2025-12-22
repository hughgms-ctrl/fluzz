import { useState, useCallback, useRef } from "react";
import { streamChat, executeAction, Message, ToolCall } from "@/lib/ai-chat";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
    const toolCalls: ToolCall[] = [];

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

    await streamChat(
      chatHistory,
      workspace.id,
      (delta) => updateAssistant(delta),
      (toolCall) => {
        toolCalls.push(toolCall);
        setPendingToolCalls((prev) => [...prev, toolCall]);
      },
      () => {
        setIsLoading(false);
        if (toolCalls.length > 0) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, toolCalls } : m
              );
            }
            return prev;
          });
        }
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
