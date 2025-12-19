import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowDown, ArrowUp, TrendingUp } from "lucide-react";

interface Vendedor {
  id: string;
  vendedor_nome: string;
  leads_recebidos: number;
  vendas_realizadas: number;
  vendas_outras_estrategias?: number;
  ingressos_gratuitos?: number;
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
  const cpa = debriefing.vendas_ingressos > 0 ? debriefing.investimento_trafego / debriefing.vendas_ingressos : 0;
  const roasIngressos = debriefing.investimento_trafego > 0 
    ? debriefing.retorno_vendas_ingressos / debriefing.investimento_trafego 
    : 0;
  const conversaoGeral = debriefing.leads > 0 
    ? (debriefing.vendas_ingressos / debriefing.leads) * 100 
    : 0;
  
  const investimentoDiff = briefing.investimento_trafego - debriefing.investimento_trafego;
  const roasOutrasEstrategias = investimentoDiff > 0
    ? debriefing.valor_outras_estrategias / investimentoDiff
    : 0;
  
  const roasMentorias = debriefing.investimento_trafego > 0
    ? debriefing.valor_vendas_mentorias / debriefing.investimento_trafego
    : 0;

  // Comparativos
  const investimentoVariacao = briefing.investimento_trafego > 0
    ? ((debriefing.investimento_trafego - briefing.investimento_trafego) / briefing.investimento_trafego) * 100
    : 0;
  const totalParticipantesVariacao = briefing.participantes_pagantes > 0
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
      {/* 1. Resumo Financeiro - Vendas de Ingressos */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Financeiro - Vendas de Ingressos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vendas de Ingressos (Tráfego) */}
            <div className="space-y-3 p-4 rounded-lg border bg-card">
              <p className="text-sm font-semibold text-muted-foreground">Vendas de Ingressos (Tráfego)</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Quantidade:</span>
                  <span className="font-semibold">{debriefing.vendas_ingressos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Retorno:</span>
                  <span className="font-semibold">{formatCurrency(debriefing.retorno_vendas_ingressos)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm font-semibold text-primary">ROAS:</span>
                  <span className="font-bold text-primary text-lg">{roasIngressos.toFixed(2)}x</span>
                </div>
              </div>
            </div>

            {/* Vendas de Ingressos (Outras Estratégias) */}
            <div className="space-y-3 p-4 rounded-lg border bg-card">
              <p className="text-sm font-semibold text-muted-foreground">Vendas de Ingressos (Outras Estratégias)</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Quantidade:</span>
                  <span className="font-semibold">{debriefing.participantes_outras_estrategias}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Retorno:</span>
                  <span className="font-semibold">{formatCurrency(debriefing.valor_outras_estrategias)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm font-semibold text-primary">ROAS:</span>
                  <span className="font-bold text-primary text-lg">{roasOutrasEstrategias.toFixed(2)}x</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. KPIs Principais em Destaque - Somente Tráfego */}
      <Card className="border-2 border-primary shadow-lg bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Desempenho do Tráfego
          </CardTitle>
          <p className="text-sm text-muted-foreground">Análise de conversão específica para leads e vendas do tráfego</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* CPL */}
            <div className="text-center p-4 rounded-lg border bg-background">
              <p className="text-sm text-muted-foreground mb-2">CPL</p>
              <p className="text-sm text-muted-foreground mb-1">Custo por Lead (Tráfego)</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{formatCurrency(cpl)}</p>
            </div>

            {/* CPA */}
            <div className="text-center p-4 rounded-lg border bg-background">
              <p className="text-sm text-muted-foreground mb-2">CPA</p>
              <p className="text-sm text-muted-foreground mb-1">Custo por Aquisição (Tráfego)</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{formatCurrency(cpa)}</p>
            </div>

            {/* ROAS Ingresso - DESTAQUE */}
            <div className="text-center p-6 rounded-lg border-2 border-primary bg-primary/5">
              <p className="text-sm font-semibold text-primary mb-2">ROAS INGRESSO (TRÁFEGO)</p>
              <p className="text-sm text-muted-foreground mb-1">Retorno por Real Investido</p>
              <p className="text-4xl md:text-5xl font-bold text-primary">{roasIngressos.toFixed(2)}x</p>
              <p className="text-sm text-muted-foreground mt-2">{formatCurrency(debriefing.retorno_vendas_ingressos)}</p>
            </div>

            {/* Conversão Geral - Tráfego */}
            <div className="text-center p-4 rounded-lg border bg-background">
              <p className="text-sm text-muted-foreground mb-2">Conversão (Tráfego)</p>
              <p className="text-sm text-muted-foreground mb-1">Leads → Vendas</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{formatPercentage(conversaoGeral)}</p>
              <Progress value={conversaoGeral} className="mt-3 mx-auto w-32" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Comparativo Briefing vs Debriefing */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo: Planejado vs Realizado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Investimento em Tráfego</p>
                <div className="flex gap-4 mt-1">
                  <span className="text-sm">Planejado: <span className="font-medium">{formatCurrency(briefing.investimento_trafego)}</span></span>
                  <span className="text-sm">Realizado: <span className="font-medium">{formatCurrency(debriefing.investimento_trafego)}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {investimentoVariacao > 0 ? (
                  <ArrowUp className="h-4 w-4 text-red-500" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-green-500" />
                )}
                <span className={`font-semibold ${investimentoVariacao > 0 ? "text-red-500" : "text-green-500"}`}>
                  {Math.abs(investimentoVariacao).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Total de Participantes (exceto equipe)</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-1">
                  <span className="text-sm">Planejado: <span className="font-medium">{briefing.participantes_pagantes}</span></span>
                  <span className="text-sm">Realizado: <span className="font-medium">{debriefing.total_participantes}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {totalParticipantesVariacao > 0 ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`font-semibold ${totalParticipantesVariacao > 0 ? "text-green-500" : "text-red-500"}`}>
                  {Math.abs(totalParticipantesVariacao).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Mentorias Vendidas - Movida para após comparativo */}
      <Card>
        <CardHeader>
          <CardTitle>Mentorias Vendidas (Tráfego)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 p-4 rounded-lg border bg-card max-w-md">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Quantidade:</span>
                <span className="font-semibold">{debriefing.mentorias_vendidas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor Total:</span>
                <span className="font-semibold">{formatCurrency(debriefing.valor_vendas_mentorias)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm font-semibold text-primary">ROAS Mentorias:</span>
                <span className="font-bold text-primary text-lg">{roasMentorias.toFixed(2)}x</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Conversão por Vendedor */}
      {vendedores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversão por Vendedor (Tráfego)</CardTitle>
            <p className="text-sm text-muted-foreground">Análise de desempenho baseada em leads e vendas do tráfego</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vendedores.map((vendedor) => {
                const conversao = vendedor.leads_recebidos > 0
                  ? (vendedor.vendas_realizadas / vendedor.leads_recebidos) * 100
                  : 0;

                return (
                  <div key={vendedor.id} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{vendedor.vendedor_nome}</h4>
                      <span className="text-lg font-bold text-primary">{formatPercentage(conversao)}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-2">
                      <div>
                        <span className="text-muted-foreground">Leads (Tráfego): </span>
                        <span className="font-medium">{vendedor.leads_recebidos}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vendas (Tráfego): </span>
                        <span className="font-medium">{vendedor.vendas_realizadas}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Outras Estratégias: </span>
                        <span className="font-medium">{vendedor.vendas_outras_estrategias || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Convidados: </span>
                        <span className="font-medium">{vendedor.ingressos_gratuitos || 0}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Taxa de Conversão (Tráfego)</p>
                      <Progress value={conversao} className="mt-1" />
                    </div>
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
