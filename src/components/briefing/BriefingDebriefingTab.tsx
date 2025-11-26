import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BriefingForm from "./BriefingForm";
import BriefingView from "./BriefingView";
import DebriefingForm from "./DebriefingForm";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";

interface BriefingDebriefingTabProps {
  projectId: string;
}

export default function BriefingDebriefingTab({ projectId }: BriefingDebriefingTabProps) {
  const [selectedBriefingId, setSelectedBriefingId] = useState<string>("");
  const [showBriefingForm, setShowBriefingForm] = useState(false);

  const { data: briefings, isLoading } = useQuery({
    queryKey: ["briefings", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefings")
        .select("*")
        .eq("project_id", projectId)
        .order("data", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleBriefingCreated = () => {
    // Refresh briefings list after creation
  };

  const latestBriefing = briefings?.[0];

  return (
    <div className="space-y-6">
      {/* Visualização e Edição do Briefing */}
      {latestBriefing && (
        <div className="space-y-4">
          <BriefingView briefing={latestBriefing} />
          
          <div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowBriefingForm(!showBriefingForm)}
            >
              {showBriefingForm ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Ocultar Formulário de Edição
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Editar Briefing
                </>
              )}
            </Button>
            
            {showBriefingForm && (
              <div className="mt-4">
                <BriefingForm 
                  projectId={projectId} 
                  briefingId={latestBriefing.id}
                  onSuccess={handleBriefingCreated} 
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Criar Novo Briefing se não houver nenhum */}
      {!latestBriefing && !isLoading && (
        <BriefingForm projectId={projectId} onSuccess={handleBriefingCreated} />
      )}

      {/* Seleção e Edição do Debriefing */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Carregando briefings...</p>
          </CardContent>
        </Card>
      ) : briefings && briefings.length > 0 ? (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Selecione um Briefing para criar/editar o Debriefing
                </label>
                <Select 
                  value={selectedBriefingId || latestBriefing?.id} 
                  onValueChange={setSelectedBriefingId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um briefing..." />
                  </SelectTrigger>
                  <SelectContent>
                    {briefings.map((briefing) => (
                      <SelectItem key={briefing.id} value={briefing.id}>
                        {new Date(briefing.data).toLocaleDateString("pt-BR")} - {briefing.local}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {(selectedBriefingId || latestBriefing) && (
            <DebriefingForm 
              projectId={projectId} 
              briefingId={selectedBriefingId || latestBriefing.id} 
            />
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Nenhum Briefing encontrado</p>
              <p className="text-sm text-muted-foreground">
                Crie um Briefing primeiro para poder criar um Debriefing.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
