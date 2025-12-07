import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";
import { Plus, FileText, Trash2, ChevronRight, GripVertical } from "lucide-react";
import { useSearchParams } from "react-router-dom";

interface Topic {
  id: string;
  title: string;
  content: string;
}

interface Process {
  id: string;
  area: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string | null;
  workspace_id: string | null;
}

// Helper function to parse content - supports both old string format and new topics format
const parseTopics = (content: string): Topic[] => {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
      return parsed;
    }
  } catch {
    // If not JSON, treat as legacy single content
  }
  // Return a single topic with the full content for legacy data
  return [{ id: "main", title: "Conteúdo", content }];
};

const stringifyTopics = (topics: Topic[]): string => {
  return JSON.stringify(topics);
};

export default function Processes() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const processRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [area, setArea] = useState("");
  const [title, setTitle] = useState("");
  const [topics, setTopics] = useState<Topic[]>([{ id: crypto.randomUUID(), title: "", content: "" }]);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [highlightedProcess, setHighlightedProcess] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  const { data: processes, isLoading } = useQuery({
    queryKey: ["process-documentation", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("process_documentation")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("area")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Process[];
    },
    enabled: !!workspace,
  });

  const { data: sectors } = useQuery({
    queryKey: ["positions", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("positions")
        .select("id, name")
        .eq("workspace_id", workspace.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!workspace,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) throw new Error("Workspace não encontrado");
      const content = stringifyTopics(topics);
      const { error } = await supabase.from("process_documentation").insert([
        {
          area,
          title,
          content,
          created_by: user!.id,
          workspace_id: workspace.id,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["process-documentation"] });
      toast.success("Processo criado com sucesso!");
      resetForm();
      setIsCreateOpen(false);
    },
    onError: () => {
      toast.error("Erro ao criar processo");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("process_documentation").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["process-documentation"] });
      toast.success("Processo excluído!");
      setSelectedProcess(null);
    },
  });

  const resetForm = () => {
    setArea("");
    setTitle("");
    setTopics([{ id: crypto.randomUUID(), title: "", content: "" }]);
  };

  const addTopic = () => {
    setTopics([...topics, { id: crypto.randomUUID(), title: "", content: "" }]);
  };

  const removeTopic = (id: string) => {
    if (topics.length > 1) {
      setTopics(topics.filter(t => t.id !== id));
    }
  };

  const updateTopic = (id: string, field: "title" | "content", value: string) => {
    setTopics(topics.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!area.trim() || !title.trim()) {
      toast.error("Preencha o setor e título");
      return;
    }
    if (topics.some(t => !t.title.trim() || !t.content.trim())) {
      toast.error("Preencha título e conteúdo de todos os tópicos");
      return;
    }
    createMutation.mutate();
  };

  const areas = Array.from(new Set(processes?.map((p) => p.area) || []));
  const filteredProcesses = selectedArea ? processes?.filter((p) => p.area === selectedArea) : processes;

  // Group processes by area for the sidebar menu
  const processesGroupedByArea = filteredProcesses?.reduce((acc, process) => {
    if (!acc[process.area]) acc[process.area] = [];
    acc[process.area].push(process);
    return acc;
  }, {} as Record<string, Process[]>);

  // Handle processId from URL
  useEffect(() => {
    const processId = searchParams.get("processId");
    if (processId && processes) {
      const process = processes.find(p => p.id === processId);
      if (process) {
        setSelectedProcess(process);
        setHighlightedProcess(processId);
        const timer = setTimeout(() => {
          setHighlightedProcess(null);
          setSearchParams({});
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [processes, searchParams, setSearchParams]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6 px-2 md:px-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Processos</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Documentação de processos organizados por setor
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 w-full sm:w-auto">
            <Plus size={20} />
            Novo Processo
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap overflow-x-auto pb-2">
          <Button
            variant={selectedArea === null ? "default" : "outline"}
            onClick={() => setSelectedArea(null)}
            size="sm"
            className="shrink-0"
          >
            Todos os Setores
          </Button>
          {areas.map((areaName) => (
            <Button
              key={areaName}
              variant={selectedArea === areaName ? "default" : "outline"}
              onClick={() => setSelectedArea(areaName)}
              size="sm"
              className="shrink-0"
            >
              {areaName}
            </Button>
          ))}
        </div>

        {filteredProcesses && filteredProcesses.length > 0 ? (
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProcesses.map((process) => (
              <Card
                key={process.id}
                ref={(el) => (processRefs.current[process.id] = el)}
                onClick={() => setSelectedProcess(process)}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 ${
                  highlightedProcess === process.id ? "ring-2 ring-primary shadow-lg" : ""
                }`}
              >
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1 font-medium">{process.area}</div>
                      <CardTitle className="text-sm md:text-base line-clamp-2">{process.title}</CardTitle>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 md:py-16 px-4">
              <div className="text-center">
                <FileText className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-sm md:text-base text-muted-foreground mb-4">
                  {selectedArea ? `Nenhum processo neste setor ainda` : `Nenhum processo cadastrado ainda`}
                </p>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2 w-full sm:w-auto">
                  <Plus size={20} />
                  Criar Primeiro Processo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Process Detail Sheet */}
      <Sheet open={!!selectedProcess} onOpenChange={(open) => {
        if (!open) {
          setSelectedProcess(null);
          setActiveTopicId(null);
        }
      }}>
        <SheetContent className="w-full sm:max-w-3xl p-0 flex flex-col">
          <SheetHeader className="p-4 md:p-6 border-b shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-primary font-medium mb-1">{selectedProcess?.area}</div>
                <SheetTitle className="text-lg md:text-xl text-left">{selectedProcess?.title}</SheetTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedProcess) deleteMutation.mutate(selectedProcess.id);
                }}
              >
                <Trash2 size={18} />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar menu with topics */}
            {selectedProcess && (() => {
              const processTopics = parseTopics(selectedProcess.content);
              const currentTopicId = activeTopicId || processTopics[0]?.id;
              const currentTopic = processTopics.find(t => t.id === currentTopicId) || processTopics[0];
              
              return (
                <>
                  <aside className="hidden md:flex w-48 lg:w-56 border-r flex-col shrink-0 bg-muted/30">
                    <div className="p-3 border-b">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Tópicos
                      </h3>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-2 space-y-1">
                        {processTopics.map((topic) => (
                          <button
                            key={topic.id}
                            onClick={() => setActiveTopicId(topic.id)}
                            className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
                              currentTopicId === topic.id
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="line-clamp-2">{topic.title}</span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </aside>

                  {/* Mobile topic selector */}
                  <div className="md:hidden border-b p-2 bg-muted/30">
                    <Select value={currentTopicId} onValueChange={setActiveTopicId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um tópico" />
                      </SelectTrigger>
                      <SelectContent>
                        {processTopics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Main content */}
                  <ScrollArea className="flex-1">
                    <div className="p-4 md:p-6">
                      <h2 className="text-lg font-semibold mb-4">{currentTopic?.title}</h2>
                      <div
                        className="prose prose-sm md:prose max-w-none dark:prose-invert break-words"
                        dangerouslySetInnerHTML={{ __html: currentTopic?.content || "" }}
                      />
                    </div>
                  </ScrollArea>
                </>
              );
            })()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Process Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Novo Processo</DialogTitle>
            <DialogDescription>Documente um novo processo com múltiplos tópicos</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">Setor *</Label>
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors && sectors.length > 0 ? (
                      sectors.map((sector) => (
                        <SelectItem key={sector.id} value={sector.name}>
                          {sector.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        Nenhum setor cadastrado
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Título do Processo *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Onboarding de novos funcionários"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Tópicos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTopic} className="gap-1">
                  <Plus size={16} />
                  Adicionar Tópico
                </Button>
              </div>

              <div className="space-y-4">
                {topics.map((topic) => (
                  <Card key={topic.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center pt-2">
                        <GripVertical size={16} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={topic.title}
                            onChange={(e) => updateTopic(topic.id, "title", e.target.value)}
                            placeholder="Título do tópico"
                            className="flex-1"
                          />
                          {topics.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTopic(topic.id)}
                              className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                        <RichTextEditor
                          content={topic.content}
                          onChange={(value) => updateTopic(topic.id, "content", value)}
                          placeholder="Conteúdo do tópico..."
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto">
                {createMutation.isPending ? "Criando..." : "Criar Processo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
