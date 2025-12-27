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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { ArrowLeft, Bold, Italic, List, ListOrdered, Image as ImageIcon, Video, Link as LinkIcon, Heading1, Heading2, Quote, Palette, Type, Minus, Plus } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px"];
const COLORS = [
  "#000000", "#374151", "#6b7280", "#9ca3af",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#ffffff"
];

// Custom extension for font size
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize || null,
        renderHTML: attributes => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});

// Custom resizable image extension
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width') || element.style.width || null,
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width, style: `width: ${attributes.width}` };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height') || element.style.height || null,
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
    };
  },
});

export default function ProcessForm() {
  const { user } = useAuth();
  const { workspace, permissions, isAdmin, isGestor } = useWorkspace();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!id;

  const [area, setArea] = useState("");
  const [title, setTitle] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ node: any; pos: number } | null>(null);
  const [imageWidth, setImageWidth] = useState(100);

  const canViewProcesses = isAdmin || isGestor || permissions.can_view_processes;

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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        // Avoid duplicate extension name warning (StarterKit already includes Link)
        link: false,
      }),
      FontSize,
      Color,
      ResizableImage.configure({
        HTMLAttributes: {
          class: "rounded-lg my-4 cursor-pointer",
        },
      }),
      Youtube.configure({
        HTMLAttributes: {
          class: "w-full aspect-video rounded-lg my-4",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Placeholder.configure({
        placeholder: "Escreva o conteúdo do processo... (Cole imagens com Ctrl+V)",
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[400px] p-4",
      },
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'IMG') {
          const node = view.state.doc.nodeAt(pos);
          if (node && node.type.name === 'image') {
            setSelectedImage({ node, pos });
            const currentWidth = node.attrs.width;
            if (currentWidth) {
              const widthNum = parseInt(currentWidth.replace('%', '').replace('px', ''));
              setImageWidth(isNaN(widthNum) ? 100 : widthNum);
            } else {
              setImageWidth(100);
            }
            return true;
          }
        }
        setSelectedImage(null);
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        // Check for pasted images
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                view.dispatch(view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src: base64 })
                ));
              };
              reader.readAsDataURL(file);
            }
            return true;
          }
        }

        const rawText =
          event.clipboardData?.getData("text/plain") ||
          event.clipboardData?.getData("text") ||
          "";
        const text = rawText.trim();
        if (text) {
          // YouTube URL patterns
          const youtubeRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
          const youtubeMatch = text.match(youtubeRegex);

          if (youtubeMatch) {
            event.preventDefault();
            const videoId = youtubeMatch[1];
            const embedUrl = `https://www.youtube.com/embed/${videoId}`;
            view.dispatch(
              view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.youtube.create({ src: embedUrl })
              )
            );
            return true;
          }

          // Vimeo URL patterns
          const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/;
          const vimeoMatch = text.match(vimeoRegex);

          if (vimeoMatch) {
            event.preventDefault();
            const videoId = vimeoMatch[1];
            const embedUrl = `https://player.vimeo.com/video/${videoId}`;
            view.dispatch(
              view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.youtube.create({ src: embedUrl })
              )
            );
            return true;
          }
        }

        return false;
      },
    },
  });

  // Load process data when editing
  useEffect(() => {
    if (process && editor && !editor.isDestroyed) {
      setArea(process.area);
      setTitle(process.title);
      // Only set content if it's different from current content
      const currentContent = editor.getHTML();
      if (process.content && process.content !== currentContent) {
        editor.commands.setContent(process.content);
      }
    }
  }, [process, editor]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!workspace || !editor) throw new Error("Dados inválidos");
      const content = editor.getHTML();
      
      if (isEditing) {
        const { error } = await supabase
          .from("process_documentation")
          .update({ area, title, content })
          .eq("id", id);
        if (error) throw error;
      } else {
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
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["process-documentation"] });
      toast.success(isEditing ? "Processo atualizado!" : "Processo criado!");
      navigate("/workspace/processes");
    },
    onError: () => {
      toast.error(isEditing ? "Erro ao atualizar processo" : "Erro ao criar processo");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!area.trim() || !title.trim()) {
      toast.error("Preencha o setor e título");
      return;
    }
    if (!editor?.getHTML().trim() || editor.getHTML() === "<p></p>") {
      toast.error("Preencha o conteúdo do processo");
      return;
    }
    createMutation.mutate();
  };

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && editor) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        editor.chain().focus().setImage({ src: base64 }).run();
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [editor]);

  const addImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const addVideo = useCallback(() => {
    const url = window.prompt("URL do vídeo (YouTube, Vimeo, etc):");
    if (url && editor) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }, [editor]);

  const addLink = useCallback(() => {
    const url = window.prompt("URL do link:");
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const setFontSize = (size: string) => {
    if (editor) {
      editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
    }
  };

  const setColor = (color: string) => {
    if (editor) {
      editor.chain().focus().setColor(color).run();
    }
  };

  const updateImageWidth = (newWidth: number) => {
    if (selectedImage && editor) {
      const { pos } = selectedImage;
      editor.chain().focus().setNodeSelection(pos).updateAttributes('image', { width: `${newWidth}%` }).run();
      setImageWidth(newWidth);
    }
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
              {isEditing ? "Editar Processo" : "Novo Processo"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isEditing ? "Atualize as informações do processo" : "Documente um novo processo"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="space-y-2">
            <Label>Conteúdo *</Label>
            <div className="border rounded-md overflow-hidden bg-background">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              
              {/* Toolbar */}
              <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={editor?.isActive("bold") ? "bg-muted" : ""}
                >
                  <Bold size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={editor?.isActive("italic") ? "bg-muted" : ""}
                >
                  <Italic size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={editor?.isActive("heading", { level: 1 }) ? "bg-muted" : ""}
                >
                  <Heading1 size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={editor?.isActive("heading", { level: 2 }) ? "bg-muted" : ""}
                >
                  <Heading2 size={16} />
                </Button>
                
                <div className="w-px h-6 bg-border mx-1 self-center" />
                
                {/* Font Size */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" title="Tamanho da fonte">
                      <Type size={16} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-32 p-2">
                    <div className="space-y-1">
                      {FONT_SIZES.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setFontSize(size)}
                          className="w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Color Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" title="Cor da fonte">
                      <Palette size={16} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2">
                    <div className="grid grid-cols-7 gap-1">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setColor(color)}
                          className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="w-px h-6 bg-border mx-1 self-center" />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={editor?.isActive("bulletList") ? "bg-muted" : ""}
                >
                  <List size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={editor?.isActive("orderedList") ? "bg-muted" : ""}
                >
                  <ListOrdered size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  className={editor?.isActive("blockquote") ? "bg-muted" : ""}
                >
                  <Quote size={16} />
                </Button>
                
                <div className="w-px h-6 bg-border mx-1 self-center" />
                
                <Button type="button" variant="ghost" size="sm" onClick={addImage} title="Adicionar imagem">
                  <ImageIcon size={16} />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={addVideo} title="Adicionar vídeo">
                  <Video size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addLink}
                  className={editor?.isActive("link") ? "bg-muted" : ""}
                  title="Adicionar link"
                >
                  <LinkIcon size={16} />
                </Button>
              </div>

              {/* Image resize controls */}
              {selectedImage && (
                <div className="flex items-center gap-2 p-2 border-b bg-accent/50">
                  <span className="text-sm text-muted-foreground">Tamanho da imagem:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => updateImageWidth(Math.max(10, imageWidth - 10))}
                  >
                    <Minus size={14} />
                  </Button>
                  <span className="text-sm font-medium w-12 text-center">{imageWidth}%</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => updateImageWidth(Math.min(100, imageWidth + 10))}
                  >
                    <Plus size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedImage(null)}
                    className="ml-2 text-xs"
                  >
                    Fechar
                  </Button>
                </div>
              )}

              <EditorContent editor={editor} />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => navigate("/workspace/processes")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto">
              {createMutation.isPending ? "Salvando..." : isEditing ? "Atualizar Processo" : "Criar Processo"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
