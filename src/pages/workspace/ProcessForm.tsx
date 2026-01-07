import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, GripVertical, Image as ImageIcon, Video, Link as LinkIcon } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Step {
  id: string;
  content: string;
}

// Sortable Step Item Component
function SortableStepItem({ 
  step, 
  index, 
  onContentChange, 
  onRemove,
  onAddMedia 
}: { 
  step: Step; 
  index: number; 
  onContentChange: (id: string, content: string) => void;
  onRemove: (id: string) => void;
  onAddMedia: (id: string, type: 'image' | 'video' | 'link') => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        const newContent = step.content + `\n<img src="${base64}" class="max-w-full h-auto rounded-lg my-2" />`;
        onContentChange(step.id, newContent);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddVideo = () => {
    const url = window.prompt("URL do vídeo (YouTube, Vimeo):");
    if (url) {
      // Convert to embed URL
      const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      
      let embedHtml = '';
      if (youtubeMatch) {
        embedHtml = `\n<iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" class="w-full aspect-video rounded-lg my-2" frameborder="0" allowfullscreen></iframe>`;
      } else if (vimeoMatch) {
        embedHtml = `\n<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" class="w-full aspect-video rounded-lg my-2" frameborder="0" allowfullscreen></iframe>`;
      } else {
        embedHtml = `\n<a href="${url}" target="_blank" class="text-primary underline">${url}</a>`;
      }
      onContentChange(step.id, step.content + embedHtml);
    }
  };

  const handleAddLink = () => {
    const url = window.prompt("URL do link:");
    const text = window.prompt("Texto do link (opcional):");
    if (url) {
      const linkText = text || url;
      const linkHtml = `\n<a href="${url}" target="_blank" class="text-primary underline">${linkText}</a>`;
      onContentChange(step.id, step.content + linkHtml);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-2 items-start p-3 bg-muted/30 rounded-lg border ${isDragging ? 'opacity-50 border-primary' : ''}`}
    >
      <button
        type="button"
        className="mt-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
          <div className="flex-1">
            <Textarea
              value={step.content.replace(/<[^>]*>/g, '')} // Show only text, not HTML
              onChange={(e) => {
                // Preserve media HTML and update only text
                const mediaMatch = step.content.match(/(<img[^>]*>|<iframe[^>]*><\/iframe>|<a[^>]*>[^<]*<\/a>)/g);
                const newContent = e.target.value + (mediaMatch ? '\n' + mediaMatch.join('\n') : '');
                onContentChange(step.id, newContent);
              }}
              placeholder="Descreva este passo..."
              className="min-h-[60px] resize-none"
            />
          </div>
        </div>
        
        {/* Show embedded media preview */}
        {step.content.match(/<(img|iframe|a)[^>]*>/g) && (
          <div 
            className="ml-8 p-2 bg-background rounded border text-sm prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: step.content.match(/(<img[^>]*>|<iframe[^>]*><\/iframe>|<a[^>]*>[^<]*<\/a>)/g)?.join('') || '' 
            }}
          />
        )}

        {/* Media buttons */}
        <div className="ml-8 flex gap-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 px-2 text-xs"
          >
            <ImageIcon size={14} className="mr-1" />
            Imagem
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddVideo}
            className="h-7 px-2 text-xs"
          >
            <Video size={14} className="mr-1" />
            Vídeo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddLink}
            className="h-7 px-2 text-xs"
          >
            <LinkIcon size={14} className="mr-1" />
            Link
          </Button>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(step.id)}
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
}

export default function ProcessForm() {
  const { user } = useAuth();
  const { workspace, permissions, isAdmin, isGestor } = useWorkspace();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  // Form state
  const [area, setArea] = useState("");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [responsible, setResponsible] = useState("");
  const [approver, setApprover] = useState("");
  const [materials, setMaterials] = useState("");
  const [steps, setSteps] = useState<Step[]>([{ id: crypto.randomUUID(), content: "" }]);
  const [frequency, setFrequency] = useState("");
  const [observations, setObservations] = useState("");

  const canViewProcesses = isAdmin || isGestor || permissions.can_view_processes;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Redirect if user doesn't have permission to view/edit processes
  useEffect(() => {
    if (workspace && !canViewProcesses) {
      toast.error("Você não tem permissão para acessar esta página");
      navigate("/");
    }
  }, [workspace, canViewProcesses, navigate]);

  const { data: process, isLoading: isLoadingProcess } = useQuery({
    queryKey: ["process", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("process_documentation")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
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

  // Load process data when editing
  useEffect(() => {
    if (process) {
      setArea(process.area || "");
      setTitle(process.title || "");
      setObjective(process.objective || "");
      setResponsible(process.responsible || "");
      setApprover((process as any).approver || "");
      setMaterials((process as any).materials || "");
      setFrequency((process as any).frequency || "");
      setObservations((process as any).observations || "");
      
      // Parse steps from stored JSON or legacy content
      if (process.steps) {
        try {
          const parsedSteps = JSON.parse(process.steps);
          if (Array.isArray(parsedSteps) && parsedSteps.length > 0) {
            setSteps(parsedSteps);
          }
        } catch {
          // If steps is not valid JSON, treat it as single step
          setSteps([{ id: crypto.randomUUID(), content: process.steps }]);
        }
      } else if (process.content) {
        // Legacy: try to parse content as steps or keep as single content
        setSteps([{ id: crypto.randomUUID(), content: "" }]);
      }
    }
  }, [process]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) throw new Error("Dados inválidos");
      
      // Build content HTML for display
      const contentHtml = buildContentHtml();
      const stepsJson = JSON.stringify(steps.filter(s => s.content.trim()));
      
      if (isEditing) {
        const { error } = await supabase
          .from("process_documentation")
          .update({ 
            area, 
            title, 
            content: contentHtml,
            objective,
            responsible,
            approver,
            materials,
            steps: stepsJson,
            frequency,
            observations
          })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("process_documentation").insert([
          {
            area,
            title,
            content: contentHtml,
            objective,
            responsible,
            approver,
            materials,
            steps: stepsJson,
            frequency,
            observations,
            created_by: user!.id,
            workspace_id: workspace.id,
          },
        ]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["process-documentation"] });
      toast.success(isEditing ? "POP atualizado!" : "POP criado!");
      navigate("/workspace/processes");
    },
    onError: () => {
      toast.error(isEditing ? "Erro ao atualizar POP" : "Erro ao criar POP");
    },
  });

  const buildContentHtml = () => {
    const sections: string[] = [];
    
    if (objective) {
      sections.push(`<div class="mb-6"><h3 class="text-lg font-semibold mb-2">Objetivo</h3><p>${objective}</p></div>`);
    }
    
    if (responsible || approver) {
      sections.push(`<div class="mb-6"><h3 class="text-lg font-semibold mb-2">Responsáveis</h3><p><strong>Executor:</strong> ${responsible || '-'}</p><p><strong>Aprovador:</strong> ${approver || '-'}</p></div>`);
    }
    
    if (materials) {
      const materialsList = materials.split('\n').filter(m => m.trim()).map(m => `<li>${m.trim()}</li>`).join('');
      sections.push(`<div class="mb-6"><h3 class="text-lg font-semibold mb-2">Materiais Necessários</h3><ul class="list-disc pl-5">${materialsList}</ul></div>`);
    }
    
    const validSteps = steps.filter(s => s.content.trim());
    if (validSteps.length > 0) {
      const stepsList = validSteps.map((s, i) => {
        const textContent = s.content.replace(/<[^>]*>/g, '').trim();
        const mediaContent = s.content.match(/(<img[^>]*>|<iframe[^>]*><\/iframe>|<a[^>]*>[^<]*<\/a>)/g)?.join('') || '';
        return `<li class="mb-4"><span class="font-medium">${textContent}</span>${mediaContent ? `<div class="mt-2">${mediaContent}</div>` : ''}</li>`;
      }).join('');
      sections.push(`<div class="mb-6"><h3 class="text-lg font-semibold mb-2">Passo a Passo</h3><ol class="list-decimal pl-5">${stepsList}</ol></div>`);
    }
    
    if (frequency) {
      sections.push(`<div class="mb-6"><h3 class="text-lg font-semibold mb-2">Frequência</h3><p>${frequency}</p></div>`);
    }
    
    if (observations) {
      sections.push(`<div class="mb-6"><h3 class="text-lg font-semibold mb-2">Observações</h3><p>${observations}</p></div>`);
    }
    
    return sections.join('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!area.trim() || !title.trim()) {
      toast.error("Preencha o setor e título");
      return;
    }
    createMutation.mutate();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addStep = () => {
    setSteps([...steps, { id: crypto.randomUUID(), content: "" }]);
  };

  const removeStep = (id: string) => {
    if (steps.length > 1) {
      setSteps(steps.filter((s) => s.id !== id));
    }
  };

  const updateStepContent = (id: string, content: string) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, content } : s)));
  };

  if (isLoadingProcess) {
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
      <div className="space-y-6 max-w-4xl mx-auto px-2 md:px-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/workspace/processes")}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {isEditing ? "Editar POP" : "Novo POP"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Preencha os campos para criar um procedimento padronizado
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <Label htmlFor="title">Título do POP *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Limpeza de Equipamentos"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo</Label>
                <Textarea
                  id="objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Descreva brevemente o propósito deste procedimento"
                  className="resize-none min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Responsibles */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Responsáveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="responsible">Quem executa?</Label>
                  <Input
                    id="responsible"
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    placeholder="Ex: Equipe de limpeza"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approver">Quem aprova?</Label>
                  <Input
                    id="approver"
                    value={approver}
                    onChange={(e) => setApprover(e.target.value)}
                    placeholder="Ex: Supervisor da área"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materials */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Materiais Necessários</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="Liste os materiais/equipamentos necessários (um por linha)"
                className="resize-none min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Digite um item por linha
              </p>
            </CardContent>
          </Card>

          {/* Steps */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Passo a Passo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {steps.map((step, index) => (
                    <SortableStepItem
                      key={step.id}
                      step={step}
                      index={index}
                      onContentChange={updateStepContent}
                      onRemove={removeStep}
                      onAddMedia={() => {}}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              
              <Button
                type="button"
                variant="outline"
                onClick={addStep}
                className="w-full gap-2"
              >
                <Plus size={16} />
                Adicionar Passo
              </Button>
            </CardContent>
          </Card>

          {/* Frequency */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Frequência</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="Ex: Diariamente, Semanalmente, Sempre que necessário"
              />
            </CardContent>
          </Card>

          {/* Observations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Cuidados extras, exceções ou notas importantes"
                className="resize-none min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/workspace/processes")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : isEditing ? "Atualizar POP" : "Criar POP"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
