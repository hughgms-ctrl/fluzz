import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Trash2, X, Check, Sparkles, Bot, User as UserIcon } from "lucide-react";
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

// Parse markdown-like formatting
function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  lines.forEach((line, lineIndex) => {
    // Process bold text
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    
    while ((match = boldRegex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }
      // Add bold text
      parts.push(
        <strong key={`bold-${lineIndex}-${match.index}`} className="font-semibold">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }
    
    // If no parts were added, use the original line
    if (parts.length === 0) {
      parts.push(line);
    }
    
    elements.push(
      <React.Fragment key={`line-${lineIndex}`}>
        {parts}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
  
  return elements;
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingToolCalls]);

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
    };
    return labels[name] || name;
  };

  const quickActions = [
    { label: "Tarefas atrasadas", prompt: "Quais tarefas estão atrasadas no workspace?" },
    { label: "Em andamento", prompt: "Quais tarefas estão em andamento?" },
    { label: "Meus projetos", prompt: "Liste todos os projetos ativos" },
    { label: "Membros", prompt: "Quem são os membros do workspace?" },
  ];

  return (
    <div className={cn("flex flex-col h-full bg-gradient-to-b from-background to-muted/20", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Fluzz AI</h2>
            <p className="text-xs text-muted-foreground">
              Seu assistente inteligente
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              title="Limpar conversa"
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {showCloseButton && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-inner">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-xl mb-2">Olá! Como posso ajudar?</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Pergunte sobre tarefas de qualquer pessoa, cole resumos de reuniões, ou consulte projetos e membros.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    className="rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => {
                      setInput(action.prompt);
                      sendMessage(action.prompt);
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Sparkles className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border rounded-bl-md"
                    )}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {parseMarkdown(message.content)}
                    </div>
                  </div>
                  {message.role === "user" && (
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {/* Pending Tool Calls (only for actions that need confirmation) */}
              {pendingToolCalls.map((tc) => (
                <div key={tc.id} className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-sm mt-1">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <Card className="flex-1 p-4 border-primary/30 bg-primary/5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary border-0">
                          {getToolCallLabel(tc.name)}
                        </Badge>
                        <div className="text-sm space-y-2">
                          {tc.name === "create_task" && (
                            <>
                              <p className="font-medium">{tc.arguments.title}</p>
                              {tc.arguments.description && (
                                <p className="text-muted-foreground">{tc.arguments.description}</p>
                              )}
                              <Badge variant="outline" className="text-xs">
                                Prioridade: {tc.arguments.priority}
                              </Badge>
                            </>
                          )}
                          {tc.name === "create_project" && (
                            <>
                              <p className="font-medium">{tc.arguments.name}</p>
                              {tc.arguments.description && (
                                <p className="text-muted-foreground">{tc.arguments.description}</p>
                              )}
                            </>
                          )}
                          {tc.name === "extract_tasks_from_text" && tc.arguments.tasks && (
                            <div className="space-y-2">
                              {tc.arguments.tasks.map((task: any, idx: number) => (
                                <div key={idx} className="p-2 bg-background rounded-lg border">
                                  <p className="font-medium">{task.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Prioridade: {task.priority}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => rejectToolCall(tc.id)}
                          className="h-8 px-3"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => confirmToolCall(tc.id)}
                          className="h-8 px-3"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-sm mt-1">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-sm text-muted-foreground">Pensando...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="min-h-[52px] max-h-[200px] resize-none pr-12 rounded-xl bg-background border-muted-foreground/20"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 h-8 w-8 rounded-lg"
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
    </div>
  );
}
