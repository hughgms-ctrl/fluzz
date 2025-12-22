import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Trash2, X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAIChat } from "@/hooks/useAIChat";
import { cn } from "@/lib/utils";

interface AIChatPanelProps {
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

export function AIChatPanel({ onClose, showCloseButton = false, className }: AIChatPanelProps) {
  const {
    messages,
    isLoading,
    pendingToolCalls,
    sendMessage,
    confirmToolCall,
    rejectToolCall,
    clearChat,
  } = useAIChat();

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getToolCallLabel = (name: string) => {
    const labels: Record<string, string> = {
      extract_tasks_from_text: "Extrair tarefas",
      create_task: "Criar tarefa",
      create_project: "Criar projeto",
      query_overdue_tasks: "Buscar atrasadas",
      query_tasks_by_status: "Buscar por status",
      list_projects: "Listar projetos",
      list_sectors: "Listar setores",
      list_members: "Listar membros",
    };
    return labels[name] || name;
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="font-semibold text-lg">Assistente IA</h2>
          <p className="text-sm text-muted-foreground">
            Cole resumos de reuniões, pergunte sobre tarefas...
          </p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              title="Limpar conversa"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {showCloseButton && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-medium mb-2">Como posso ajudar?</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Cole um resumo de reunião para extrair tarefas, pergunte sobre tarefas atrasadas, ou peça para criar projetos.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => setInput("Quais tarefas estão atrasadas?")}
              >
                Tarefas atrasadas
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => setInput("Quais tarefas estou fazendo?")}
              >
                Em andamento
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => setInput("Liste meus projetos")}
              >
                Meus projetos
              </Badge>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-4 py-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {/* Pending Tool Calls */}
            {pendingToolCalls.map((tc) => (
              <Card key={tc.id} className="p-4 border-primary/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Badge variant="outline" className="mb-2">
                      {getToolCallLabel(tc.name)}
                    </Badge>
                    <div className="text-sm space-y-1">
                      {tc.name === "create_task" && (
                        <>
                          <p><strong>Título:</strong> {tc.arguments.title}</p>
                          {tc.arguments.description && (
                            <p><strong>Descrição:</strong> {tc.arguments.description}</p>
                          )}
                          <p><strong>Prioridade:</strong> {tc.arguments.priority}</p>
                        </>
                      )}
                      {tc.name === "create_project" && (
                        <>
                          <p><strong>Nome:</strong> {tc.arguments.name}</p>
                          {tc.arguments.description && (
                            <p><strong>Descrição:</strong> {tc.arguments.description}</p>
                          )}
                        </>
                      )}
                      {tc.name === "extract_tasks_from_text" && tc.arguments.tasks && (
                        <div className="space-y-2">
                          {tc.arguments.tasks.map((task: any, idx: number) => (
                            <div key={idx} className="p-2 bg-background rounded">
                              <p><strong>{idx + 1}.</strong> {task.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Prioridade: {task.priority}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectToolCall(tc.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => confirmToolCall(tc.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Confirmar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem ou cole um resumo de reunião..."
            className="min-h-[60px] max-h-[200px] resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
