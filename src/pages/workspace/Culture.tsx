import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Edit, Save, X, ArrowLeft } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";

export default function Culture() {
  const queryClient = useQueryClient();
  const { isAdmin, isGestor } = useWorkspace();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: cultureData, isLoading } = useQuery({
    queryKey: ["company-info", "culture"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_info")
        .select("*")
        .eq("section", "culture")
        .maybeSingle();
      if (error) throw error;
      
      if (data) {
        setTitle(data.title);
        setContent(data.content);
      }
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (cultureData) {
        const { error } = await supabase
          .from("company_info")
          .update({ title, content })
          .eq("id", cultureData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_info")
          .insert([{ section: "culture", title, content }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-info", "culture"] });
      toast.success("Cultura atualizada com sucesso!");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Erro ao salvar");
    },
  });

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/workspace")}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Cultura da Empresa</h1>
              <p className="text-muted-foreground mt-1">
                Conheça os valores e a cultura que nos guiam
              </p>
            </div>
            {(isAdmin || isGestor) && !isEditing && (
              <Button onClick={() => setIsEditing(true)} className="gap-2">
                <Edit size={16} />
                Editar
              </Button>
            )}
            {(isAdmin || isGestor) && isEditing && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    if (cultureData) {
                      setTitle(cultureData.title);
                      setContent(cultureData.content);
                    }
                  }}
                  className="gap-2"
                >
                  <X size={16} />
                  Cancelar
                </Button>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="gap-2"
                >
                  <Save size={16} />
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            {isEditing ? (
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Nossa Cultura"
                />
              </div>
            ) : (
              <CardTitle>{title || "Cultura"}</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Descreva a cultura da empresa..."
                  rows={15}
                  className="font-mono"
                />
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                {content ? (
                  <p className="whitespace-pre-wrap text-foreground">{content}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    Nenhuma informação de cultura cadastrada ainda. Clique em "Editar" para adicionar.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
