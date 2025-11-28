import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CreateSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSectionDialog({ open, onOpenChange }: CreateSectionDialogProps) {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    content_type: "text" as "text" | "video" | "image",
    video_url: "",
    image_url: "",
    section_order: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("getting_started_sections").insert({
        workspace_id: workspace?.id!,
        title: formData.title,
        content: formData.content || null,
        content_type: formData.content_type,
        video_url: formData.content_type === "video" ? formData.video_url : null,
        image_url: formData.content_type === "image" ? formData.image_url : null,
        section_order: parseInt(formData.section_order) || 0,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Seção criada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["getting-started-sections"] });
      onOpenChange(false);
      setFormData({
        title: "",
        content: "",
        content_type: "text",
        video_url: "",
        image_url: "",
        section_order: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar seção");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Seção</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="content_type">Tipo de Conteúdo</Label>
            <Select
              value={formData.content_type}
              onValueChange={(value: any) => setFormData({ ...formData, content_type: value })}
            >
              <SelectTrigger id="content_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="image">Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.content_type === "text" && (
            <div>
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                placeholder="Digite o conteúdo da seção..."
              />
            </div>
          )}

          {formData.content_type === "video" && (
            <div>
              <Label htmlFor="video_url">URL do Vídeo (YouTube) *</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cole a URL completa do vídeo do YouTube
              </p>
            </div>
          )}

          {formData.content_type === "image" && (
            <div>
              <Label htmlFor="image_url">URL da Imagem *</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="section_order">Ordem (opcional)</Label>
            <Input
              id="section_order"
              type="number"
              min="0"
              value={formData.section_order}
              onChange={(e) => setFormData({ ...formData, section_order: e.target.value })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Define a ordem de exibição da seção (menor aparece primeiro)
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Seção"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
