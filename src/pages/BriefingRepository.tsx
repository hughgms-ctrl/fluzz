import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, MapPin, DollarSign } from "lucide-react";

export default function BriefingRepository() {
  const navigate = useNavigate();

  const { data: briefings, isLoading } = useQuery({
    queryKey: ["all-briefings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefings")
        .select(`
          *,
          projects (
            id,
            name
          ),
          debriefings (
            id,
            investimento_trafego,
            leads,
            vendas_ingressos
          )
        `)
        .order("data", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number, currency: string) => {
    const symbol = currency === "BRL" ? "R$" : "$";
    return `${symbol} ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Repositório de Briefings & Debriefings</h1>
          <p className="text-muted-foreground mt-2">
            Visualize todos os briefings e debriefings de todos os projetos em um só lugar
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : briefings && briefings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {briefings.map((briefing: any) => (
              <Card
                key={briefing.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/briefing/${briefing.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    {briefing.projects?.name || "Projeto"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(briefing.data)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{briefing.local}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Investimento: {formatCurrency(briefing.investimento_trafego, briefing.currency)}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Participantes:</span>
                      <span className="font-semibold">{briefing.participantes_pagantes}</span>
                    </div>
                  </div>
                  {briefing.debriefings && briefing.debriefings.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                          Debriefing Completo
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/briefing/${briefing.id}`);
                      }}
                    >
                      Ver Documento
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${briefing.project_id}`);
                      }}
                    >
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Nenhum Briefing encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Crie briefings nos seus projetos para vê-los aqui.
                </p>
              </div>
              <Button onClick={() => navigate("/projects")}>
                Ir para Projetos
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
