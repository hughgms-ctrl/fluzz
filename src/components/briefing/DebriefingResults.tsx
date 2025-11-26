import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowDown, ArrowUp, TrendingUp } from "lucide-react";

interface Vendedor {
  id: string;
  vendedor_nome: string;
  leads_recebidos: number;
  vendas_realizadas: number;
}

interface DebriefingResultsProps {
  debriefing: any;
  briefing: any;
  vendedores: Vendedor[];
  currency: "BRL" | "USD";
}

export default function DebriefingResults({
  debriefing,
  briefing,
  vendedores,
  currency,
}: DebriefingResultsProps) {
  const currencySymbol = currency === "BRL" ? "R$" : "$";

  // Cálculos automáticos
  const cpl = debriefing.leads > 0 ? debriefing.investimento_trafego / debriefing.leads : 0;
  const roasIngressos = debriefing.investimento_trafego > 0 
    ? debriefing.retorno_vendas_ingressos / debriefing.investimento_trafego 
    : 0;
  const conversaoGeral = debriefing.leads > 0 
    ? (debriefing.vendas_ingressos / debriefing.leads) * 100 
    : 0;
  const roasEvento = debriefing.investimento_trafego > 0
    ? (debriefing.retorno_vendas_ingressos + debriefing.valor_vendas_mentorias) / debriefing.investimento_trafego
    : 0;
  
  const investimentoDiff = briefing.investimento_trafego - debriefing.investimento_trafego;
  const roasOutrasEstrategias = investimentoDiff > 0
    ? debriefing.valor_outras_estrategias / investimentoDiff
    : 0;

  // Comparativos
  const investimentoVariacao = briefing.investimento_trafego > 0
    ? ((debriefing.investimento_trafego - briefing.investimento_trafego) / briefing.investimento_trafego) * 100
    : 0;
  const participantesVariacao = briefing.participantes_pagantes > 0
    ? ((debriefing.total_participantes - briefing.participantes_pagantes) / briefing.participantes_pagantes) * 100
    : 0;

  const formatCurrency = (value: number) => {
    return `${currencySymbol} ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-chart-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROAS Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{roasEvento.toFixed(2)}x</span>
              <TrendingUp className="h-8 w-8 text-chart-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-chart-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversão Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{formatPercentage(conversaoGeral)}</span>
              <div className="text-right">
                <Progress value={conversaoGeral} className="w-20 h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-chart-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">CPL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{formatCurrency(cpl)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Detalhadas */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ROAS Ingressos</span>
                <span className="font-semibold">{roasIngressos.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ROAS Outras Estratégias</span>
                <span className="font-semibold">{roasOutrasEstrategias.toFixed(2)}x</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Leads</span>
                <span className="font-semibold">{debriefing.leads}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Participantes</span>
                <span className="font-semibold">{debriefing.total_participantes}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparativo Briefing vs Debriefing */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo: Planejado vs Realizado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Investimento em Tráfego</p>
                <div className="flex gap-4 mt-1">
                  <span className="text-sm">Planejado: {formatCurrency(briefing.investimento_trafego)}</span>
                  <span className="text-sm">Realizado: {formatCurrency(debriefing.investimento_trafego)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {investimentoVariacao > 0 ? (
                  <ArrowUp className="h-4 w-4 text-red-500" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-green-500" />
                )}
                <span className={investimentoVariacao > 0 ? "text-red-500" : "text-green-500"}>
                  {Math.abs(investimentoVariacao).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Participantes Pagantes</p>
                <div className="flex gap-4 mt-1">
                  <span className="text-sm">Planejado: {briefing.participantes_pagantes}</span>
                  <span className="text-sm">Realizado: {debriefing.total_participantes}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {participantesVariacao > 0 ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                )}
                <span className={participantesVariacao > 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(participantesVariacao).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance dos Vendedores */}
      {vendedores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance dos Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vendedores.map((vendedor) => {
                const conversao = vendedor.leads_recebidos > 0
                  ? (vendedor.vendas_realizadas / vendedor.leads_recebidos) * 100
                  : 0;

                return (
                  <div key={vendedor.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{vendedor.vendedor_nome}</h4>
                      <span className="text-sm font-medium">{formatPercentage(conversao)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Leads: </span>
                        <span>{vendedor.leads_recebidos}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vendas: </span>
                        <span>{vendedor.vendas_realizadas}</span>
                      </div>
                    </div>
                    <Progress value={conversao} className="mt-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
