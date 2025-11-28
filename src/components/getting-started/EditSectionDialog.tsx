import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EditSectionDialogProps {
  section: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSectionDialog({ section, open, onOpenChange }: EditSectionDialogProps) {
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

  useEffect(() => {
    if (section) {
      setFormData({
        title: section.title || "",
        content: section.content || "",
        content_type: section.content_type || "text",
        video_url: section.video_url || "",
        image_url: section.image_url || "",
        section_order: section.section_order?.toString() || "",
      });
    }
  }, [section]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("getting_started_sections")
        .update({
          title: formData.title,
          content: formData.content || null,
          content_type: formData.content_type,
          video_url: formData.content_type === "video" ? formData.video_url : null,
          image_url: formData.content_type === "image" ? formData.image_url : null,
          section_order: parseInt(formData.section_order) || 0,
        })
        .eq("id", section.id);

      if (error) throw error;

      toast.success("Seção atualizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["getting-started-sections"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar seção");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta seção?")) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("getting_started_sections")
        .delete()
        .eq("id", section.id);

      if (error) throw error;

      toast.success("Seção excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["getting-started-sections"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir seção");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Seção</DialogTitle>
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

          <div className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              Excluir
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
