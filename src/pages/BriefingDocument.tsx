import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download } from "lucide-react";
import BriefingView from "@/components/briefing/BriefingView";
import DebriefingResults from "@/components/briefing/DebriefingResults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import html2pdf from "html2pdf.js";
import { useRef } from "react";
import { toast } from "sonner";

export default function BriefingDocument() {
  const { briefingId } = useParams();
  const navigate = useNavigate();
  const documentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!documentRef.current) return;

    toast.loading("Gerando PDF...");

    const opt = {
      margin: 10,
      filename: `briefing-debriefing-${briefing?.data || 'documento'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(documentRef.current).save();
      toast.dismiss();
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao gerar PDF");
      console.error(error);
    }
  };

  const { data: briefing, isLoading: briefingLoading } = useQuery({
    queryKey: ["briefing", briefingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefings")
        .select("*, projects(id, name)")
        .eq("id", briefingId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: debriefing, isLoading: debriefingLoading } = useQuery({
    queryKey: ["debriefing", briefingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("debriefings")
        .select("*, debriefing_vendedores(*)")
        .eq("briefing_id", briefingId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const isLoading = briefingLoading || debriefingLoading;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!briefing) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">Documento não encontrado</p>
          <Button onClick={() => navigate("/briefings")}>Voltar ao Repositório</Button>
        </div>
      </AppLayout>
    );
  }

  const vendedores = debriefing?.debriefing_vendedores?.map((v: any) => ({
    id: v.id,
    vendedor_nome: v.vendedor_nome,
    leads_recebidos: v.leads_recebidos,
    vendas_realizadas: v.vendas_realizadas,
  })) || [];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/briefings")}
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {briefing.projects?.name || "Projeto"}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                Briefing & Debriefing - {formatDate(briefing.data)}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {debriefing && (
              <Button
                variant="default"
                onClick={handleDownloadPDF}
                className="gap-2"
              >
                <Download size={16} />
                Baixar PDF
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate(`/projects/${briefing.project_id}`)}
            >
              Ir para o Projeto
            </Button>
          </div>
        </div>

        {/* Documento Consolidado */}
        <div ref={documentRef} className="space-y-8">
          {/* Parte 1: Briefing (Planejamento) */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Planejamento (Briefing)</h2>
            <BriefingView briefing={briefing} />
          </div>

          {/* Parte 2: Debriefing (Dados Brutos) */}
          {debriefing ? (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-4">Dados Realizados (Debriefing)</h2>
                <Card>
                  <CardHeader>
                    <CardTitle>Dados do Evento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Investimento em Tráfego</p>
                        <p className="font-semibold">
                          {debriefing.currency === "BRL" ? "R$" : "$"} {debriefing.investimento_trafego.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Leads</p>
                        <p className="font-semibold">{debriefing.leads}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vendas de Ingressos</p>
                        <p className="font-semibold">{debriefing.vendas_ingressos}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Retorno Vendas Ingressos</p>
                        <p className="font-semibold">
                          {debriefing.currency === "BRL" ? "R$" : "$"} {debriefing.retorno_vendas_ingressos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Mentorias Vendidas</p>
                        <p className="font-semibold">{debriefing.mentorias_vendidas}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor Vendas Mentorias</p>
                        <p className="font-semibold">
                          {debriefing.currency === "BRL" ? "R$" : "$"} {debriefing.valor_vendas_mentorias.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Participantes (Outras Estratégias)</p>
                        <p className="font-semibold">{debriefing.participantes_outras_estrategias}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor (Outras Estratégias)</p>
                        <p className="font-semibold">
                          {debriefing.currency === "BRL" ? "R$" : "$"} {debriefing.valor_outras_estrategias.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total de Participantes</p>
                        <p className="font-semibold">{debriefing.total_participantes}</p>
                      </div>
                    </div>
                    {debriefing.observacoes && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                        <p className="text-sm whitespace-pre-wrap">{debriefing.observacoes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Parte 3: Dashboard de Resultados */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Análise e Resultados</h2>
                <DebriefingResults
                  debriefing={debriefing}
                  briefing={briefing}
                  vendedores={vendedores}
                  currency={debriefing.currency as "BRL" | "USD"}
                />
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">Debriefing não realizado</p>
                  <p className="text-sm text-muted-foreground">
                    Este evento ainda não possui um debriefing registrado.
                  </p>
                </div>
                <Button onClick={() => navigate(`/projects/${briefing.project_id}`)}>
                  Ir para o Projeto
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
