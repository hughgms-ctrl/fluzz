import { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { DollarSign, Plus, Trash2 } from "lucide-react";
import DebriefingResults from "./DebriefingResults";

interface DebriefingFormProps {
  projectId: string;
  briefingId: string;
}

interface Vendedor {
  id: string;
  vendedor_nome: string;
  leads_recebidos: number;
  vendas_realizadas: number;
}

export default function DebriefingForm({ projectId, briefingId }: DebriefingFormProps) {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const [currency, setCurrency] = useState<"BRL" | "USD">("BRL");
  const [investimentoTrafego, setInvestimentoTrafego] = useState("");
  const [leads, setLeads] = useState("");
  const [vendasIngressos, setVendasIngressos] = useState("");
  const [retornoVendasIngressos, setRetornoVendasIngressos] = useState("");
  const [mentoriasVendidas, setMentoriasVendidas] = useState("");
  const [valorVendasMentorias, setValorVendasMentorias] = useState("");
  const [participantesOutrasEstrategias, setParticipantesOutrasEstrategias] = useState("");
  const [valorOutrasEstrategias, setValorOutrasEstrategias] = useState("");
  const [totalParticipantes, setTotalParticipantes] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);

  const { data: briefing } = useQuery({
    queryKey: ["briefing", briefingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefings")
        .select("*")
        .eq("id", briefingId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: debriefing } = useQuery({
    queryKey: ["debriefing", briefingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("debriefings")
        .select("*, debriefing_vendedores(*)")
        .eq("briefing_id", briefingId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setInvestimentoTrafego(data.investimento_trafego.toString());
        setLeads(data.leads.toString());
        setVendasIngressos(data.vendas_ingressos.toString());
        setRetornoVendasIngressos(data.retorno_vendas_ingressos.toString());
        setMentoriasVendidas(data.mentorias_vendidas.toString());
        setValorVendasMentorias(data.valor_vendas_mentorias.toString());
        setParticipantesOutrasEstrategias(data.participantes_outras_estrategias.toString());
        setValorOutrasEstrategias(data.valor_outras_estrategias.toString());
        setTotalParticipantes(data.total_participantes.toString());
        setObservacoes(data.observacoes || "");
        setCurrency(data.currency as "BRL" | "USD");
        
        if (data.debriefing_vendedores) {
          setVendedores(data.debriefing_vendedores.map((v: any) => ({
            id: v.id,
            vendedor_nome: v.vendedor_nome,
            leads_recebidos: v.leads_recebidos,
            vendas_realizadas: v.vendas_realizadas,
          })));
        }
      }
      return data;
    },
  });

  const saveDebriefingMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      if (!workspace) throw new Error("Workspace não encontrado");

      const debriefingData = {
        briefing_id: briefingId,
        project_id: projectId,
        workspace_id: workspace.id,
        investimento_trafego: parseFloat(investimentoTrafego),
        leads: parseInt(leads),
        vendas_ingressos: parseInt(vendasIngressos),
        retorno_vendas_ingressos: parseFloat(retornoVendasIngressos),
        mentorias_vendidas: parseInt(mentoriasVendidas),
        valor_vendas_mentorias: parseFloat(valorVendasMentorias),
        participantes_outras_estrategias: parseInt(participantesOutrasEstrategias),
        valor_outras_estrategias: parseFloat(valorOutrasEstrategias),
        total_participantes: parseInt(totalParticipantes),
        observacoes,
        currency,
        created_by: user.id,
      };

      if (debriefing) {
        const { error } = await supabase
          .from("debriefings")
          .update(debriefingData)
          .eq("id", debriefing.id);
        if (error) throw error;

        await supabase
          .from("debriefing_vendedores")
          .delete()
          .eq("debriefing_id", debriefing.id);

        if (vendedores.length > 0) {
          const { error: vendError } = await supabase
            .from("debriefing_vendedores")
            .insert(
              vendedores.map((v) => ({
                debriefing_id: debriefing.id,
                vendedor_nome: v.vendedor_nome,
                leads_recebidos: v.leads_recebidos,
                vendas_realizadas: v.vendas_realizadas,
              }))
            );
          if (vendError) throw vendError;
        }
      } else {
        const { data: newDebriefing, error } = await supabase
          .from("debriefings")
          .insert(debriefingData)
          .select()
          .single();

        if (error) throw error;

        if (vendedores.length > 0) {
          const { error: vendError } = await supabase
            .from("debriefing_vendedores")
            .insert(
              vendedores.map((v) => ({
                debriefing_id: newDebriefing.id,
                vendedor_nome: v.vendedor_nome,
                leads_recebidos: v.leads_recebidos,
                vendas_realizadas: v.vendas_realizadas,
              }))
            );
          if (vendError) throw vendError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debriefing", briefingId] });
      queryClient.invalidateQueries({ queryKey: ["briefings", projectId] });
      toast.success("Debriefing salvo com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao salvar debriefing:", error);
      toast.error("Erro ao salvar debriefing");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveDebriefingMutation.mutate();
  };

  const addVendedor = () => {
    setVendedores([
      ...vendedores,
      {
        id: crypto.randomUUID(),
        vendedor_nome: "",
        leads_recebidos: 0,
        vendas_realizadas: 0,
      },
    ]);
  };

  const removeVendedor = (id: string) => {
    setVendedores(vendedores.filter((v) => v.id !== id));
  };

  const updateVendedor = (id: string, field: keyof Vendedor, value: string | number) => {
    setVendedores(
      vendedores.map((v) =>
        v.id === id ? { ...v, [field]: value } : v
      )
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Debriefing - Resultados</CardTitle>
              <CardDescription>Insira os dados reais do evento</CardDescription>
            </div>
            <Select value={currency} onValueChange={(value: "BRL" | "USD") => setCurrency(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">R$ - Real</SelectItem>
                <SelectItem value="USD">$ - Dólar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="investimento">Investimento em Tráfego</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="investimento"
                    type="number"
                    step="0.01"
                    className="pl-9"
                    value={investimentoTrafego}
                    onChange={(e) => setInvestimentoTrafego(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leads">Leads</Label>
                <Input
                  id="leads"
                  type="number"
                  value={leads}
                  onChange={(e) => setLeads(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendasIngressos">Vendas de Ingressos</Label>
                <Input
                  id="vendasIngressos"
                  type="number"
                  value={vendasIngressos}
                  onChange={(e) => setVendasIngressos(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="retornoVendas">Retorno Vendas de Ingressos</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="retornoVendas"
                    type="number"
                    step="0.01"
                    className="pl-9"
                    value={retornoVendasIngressos}
                    onChange={(e) => setRetornoVendasIngressos(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mentoriasVendidas">Mentorias Vendidas</Label>
                <Input
                  id="mentoriasVendidas"
                  type="number"
                  value={mentoriasVendidas}
                  onChange={(e) => setMentoriasVendidas(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valorMentorias">Valor Vendas Mentorias</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="valorMentorias"
                    type="number"
                    step="0.01"
                    className="pl-9"
                    value={valorVendasMentorias}
                    onChange={(e) => setValorVendasMentorias(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="participantesOutras">Participantes (Outras Estratégias)</Label>
                <Input
                  id="participantesOutras"
                  type="number"
                  value={participantesOutrasEstrategias}
                  onChange={(e) => setParticipantesOutrasEstrategias(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valorOutras">Valor (Outras Estratégias)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="valorOutras"
                    type="number"
                    step="0.01"
                    className="pl-9"
                    value={valorOutrasEstrategias}
                    onChange={(e) => setValorOutrasEstrategias(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="totalParticipantes">Total de Participantes</Label>
                <Input
                  id="totalParticipantes"
                  type="number"
                  value={totalParticipantes}
                  onChange={(e) => setTotalParticipantes(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Vendedores</h3>
                <Button type="button" variant="outline" size="sm" onClick={addVendedor}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Vendedor
                </Button>
              </div>

              {vendedores.map((vendedor) => (
                <div key={vendedor.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Nome do Vendedor</Label>
                    <Input
                      value={vendedor.vendedor_nome}
                      onChange={(e) => updateVendedor(vendedor.id, "vendedor_nome", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Leads Recebidos</Label>
                    <Input
                      type="number"
                      value={vendedor.leads_recebidos}
                      onChange={(e) => updateVendedor(vendedor.id, "leads_recebidos", parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vendas Realizadas</Label>
                    <Input
                      type="number"
                      value={vendedor.vendas_realizadas}
                      onChange={(e) => updateVendedor(vendedor.id, "vendas_realizadas", parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeVendedor(vendedor.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saveDebriefingMutation.isPending}>
                {saveDebriefingMutation.isPending ? "Salvando..." : "Salvar Debriefing"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {debriefing && briefing && (
        <DebriefingResults
          debriefing={debriefing}
          briefing={briefing}
          vendedores={vendedores}
          currency={currency}
        />
      )}
    </div>
  );
}
