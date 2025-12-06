import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, FileText, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
export default function Processes() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const processRefs = useRef<{
    [key: string]: HTMLDivElement | null;
  }>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [area, setArea] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [highlightedProcess, setHighlightedProcess] = useState<string | null>(null);
  const { data: processes, isLoading } = useQuery({
    queryKey: ["process-documentation", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("process_documentation")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("area")
        .order("created_at", {
          ascending: false,
        });
      if (error) throw error;
      return data;
    },
    enabled: !!workspace,
  });

  const { data: positions } = useQuery({
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
      if (!workspace) {
        throw new Error("Workspace não encontrado");
      }
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
      queryClient.invalidateQueries({
        queryKey: ["process-documentation"],
      });
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
      queryClient.invalidateQueries({
        queryKey: ["process-documentation"],
      });
      toast.success("Processo excluído!");
    },
  });
  const resetForm = () => {
    setArea("");
    setTitle("");
    setContent("");
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!area.trim() || !title.trim() || !content.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    createMutation.mutate();
  };
  const areas = Array.from(new Set(processes?.map((p) => p.area) || []));
  const filteredProcesses = selectedArea ? processes?.filter((p) => p.area === selectedArea) : processes;

  // Handle processId from URL
  useEffect(() => {
    const processId = searchParams.get("processId");
    if (processId && processes && processRefs.current[processId]) {
      // Scroll to the process
      processRefs.current[processId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // Highlight the process
      setHighlightedProcess(processId);

      // Remove highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightedProcess(null);
        setSearchParams({});
      }, 3000);
      return () => clearTimeout(timer);
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Processos</h1>
            <p className="text-muted-foreground mt-1">Documentação de processos organizados por área</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus size={20} />
            Novo Processo
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant={selectedArea === null ? "default" : "outline"} onClick={() => setSelectedArea(null)}>
            Todas os Setores
          </Button>
          {areas.map((areaName) => (
            <Button
              key={areaName}
              variant={selectedArea === areaName ? "default" : "outline"}
              onClick={() => setSelectedArea(areaName)}
            >
              {areaName}
            </Button>
          ))}
        </div>

        {filteredProcesses && filteredProcesses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredProcesses.map((process) => (
              <Card
                key={process.id}
                ref={(el) => (processRefs.current[process.id] = el)}
                className={`transition-all duration-300 ${highlightedProcess === process.id ? "ring-2 ring-primary shadow-lg scale-[1.02]" : ""}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">{process.area}</div>
                      <CardTitle className="text-lg">{process.title}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(process.id)}>
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{process.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {selectedArea ? `Nenhum processo nesta área ainda` : `Nenhum processo cadastrado ainda`}
                </p>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <Plus size={20} />
                  Criar Primeiro Processo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Processo</DialogTitle>
            <DialogDescription>Documente um novo processo da empresa</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="area">Setor *</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  {positions?.map((position) => (
                    <SelectItem key={position.id} value={position.name}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Onboarding de novos funcionários"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Descreva o processo em detalhes..."
                rows={10}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar Processo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
