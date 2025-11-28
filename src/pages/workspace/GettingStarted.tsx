import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { 
  BookOpen, 
  FolderKanban, 
  CheckSquare, 
  Users, 
  Target,
  BarChart3,
  FileText,
  Briefcase,
  Home,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tutorial {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const tutorials: Tutorial[] = [
  {
    id: "introducao",
    title: "Introdução à Plataforma",
    icon: <Home className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Bem-vindo à Plataforma de Gestão</h2>
          <p className="text-muted-foreground leading-relaxed">
            Esta plataforma foi desenvolvida para centralizar a gestão de projetos, tarefas, 
            processos e documentação da sua empresa. Aqui você encontrará tutoriais completos 
            sobre como utilizar cada funcionalidade.
          </p>
        </div>
        
        <div className="bg-muted/50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">O que você pode fazer:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
              <span>Gerenciar projetos e atribuir tarefas à equipe</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
              <span>Criar rotinas e tarefas recorrentes por cargo</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
              <span>Documentar processos e manter o conhecimento centralizado</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
              <span>Acompanhar métricas e analytics em tempo real</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
              <span>Gerenciar briefings e debriefings de eventos</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Navegando pelos Tutoriais</h3>
          <p className="text-sm text-muted-foreground">
            Use o menu lateral para navegar entre os diferentes tutoriais. Cada seção 
            contém instruções detalhadas sobre como usar as funcionalidades específicas 
            da plataforma.
          </p>
        </div>
      </div>
    )
  },
  {
    id: "home",
    title: "Página Home",
    icon: <Home className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Como Usar a Home</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            A Home é o ponto central da plataforma, onde você tem uma visão geral de 
            todas as suas tarefas e atividades pendentes.
          </p>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Dashboard de Tarefas</h3>
            <p className="text-sm text-muted-foreground">
              Visualize rapidamente suas tarefas em aberto, tarefas atrasadas e tarefas 
              concluídas recentemente. Os cards coloridos mostram estatísticas importantes.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Criar Tarefas Avulsas</h3>
            <p className="text-sm text-muted-foreground">
              Use o botão "Nova Tarefa Avulsa" para criar tarefas rápidas que podem ser 
              atribuídas a qualquer membro da equipe, sem necessidade de estarem vinculadas 
              a um projeto específico.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Acompanhamento em Tempo Real</h3>
            <p className="text-sm text-muted-foreground">
              As métricas são atualizadas automaticamente conforme você e sua equipe 
              completam tarefas e atualizam status.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "projetos",
    title: "Gestão de Projetos",
    icon: <FolderKanban className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Como Gerenciar Projetos</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            A seção de Projetos permite criar, organizar e acompanhar todos os projetos 
            da empresa em um só lugar.
          </p>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Criando um Novo Projeto</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Clique no botão "Novo Projeto"</li>
              <li>Preencha o nome e descrição do projeto</li>
              <li>Defina o status inicial (Ativo, Planejamento, etc.)</li>
              <li>Salve e comece a adicionar tarefas</li>
            </ol>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Adicionando Membros</h3>
            <p className="text-sm text-muted-foreground">
              Dentro de cada projeto, você pode adicionar membros da equipe e definir 
              seus papéis. Clique em "Adicionar Membro" e selecione o usuário desejado.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Criando Tarefas no Projeto</h3>
            <p className="text-sm text-muted-foreground">
              Use o botão "Nova Tarefa" dentro do projeto para criar tarefas vinculadas. 
              Você pode definir responsável, prazo, prioridade e vincular processos.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Dashboard do Projeto</h3>
            <p className="text-sm text-muted-foreground">
              Cada projeto possui um dashboard com métricas visuais: tarefas atrasadas, 
              concluídas, distribuição por status e por responsável.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "tarefas",
    title: "Sistema de Tarefas",
    icon: <CheckSquare className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Como Gerenciar Tarefas</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            O sistema de tarefas permite criar três tipos diferentes de tarefas: 
            tarefas de projeto, tarefas avulsas e tarefas de rotina.
          </p>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Tipos de Tarefas</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li><strong>Tarefas de Projeto:</strong> Vinculadas a um projeto específico</li>
              <li><strong>Tarefas Avulsas:</strong> Independentes, podem ser atribuídas rapidamente</li>
              <li><strong>Tarefas de Rotina:</strong> Geradas automaticamente baseadas em cargos</li>
            </ul>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Campos Importantes</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><strong>Título:</strong> Nome descritivo da tarefa</li>
              <li><strong>Responsável:</strong> Quem executará a tarefa</li>
              <li><strong>Prazo:</strong> Data limite para conclusão</li>
              <li><strong>Prioridade:</strong> Alta, Média ou Baixa</li>
              <li><strong>Status:</strong> Pendente, Em Progresso, Concluída</li>
              <li><strong>Processos:</strong> Vincule múltiplos processos relacionados</li>
            </ul>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Minhas Tarefas</h3>
            <p className="text-sm text-muted-foreground">
              Na página "Minhas Tarefas", você vê todas as tarefas atribuídas a você, 
              independente do tipo. Use os filtros para encontrar rapidamente o que precisa.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "cargos-rotinas",
    title: "Cargos e Rotinas",
    icon: <Briefcase className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Como Usar Cargos e Rotinas</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            O sistema de cargos e rotinas permite automatizar tarefas recorrentes 
            baseadas em posições/setores da empresa.
          </p>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Criando Cargos/Setores</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Crie cargos que representam posições ou setores na empresa (ex: "Marketing", 
              "Vendas", "Operações").
            </p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Clique em "Novo Cargo"</li>
              <li>Defina nome e descrição</li>
              <li>Atribua usuários ao cargo</li>
            </ol>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Criando Rotinas</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Rotinas são conjuntos de tarefas que se repetem periodicamente.
            </p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Dentro de um cargo, clique em "Nova Rotina"</li>
              <li>Defina nome, descrição e tipo de recorrência (diária, semanal, mensal)</li>
              <li>Configure a data de início</li>
              <li>Adicione as tarefas que compõem a rotina</li>
            </ol>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Tarefas da Rotina</h3>
            <p className="text-sm text-muted-foreground">
              Cada rotina pode ter múltiplas tarefas. Quando um usuário é atribuído ao cargo, 
              essas tarefas são automaticamente geradas de acordo com a recorrência definida.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Geração Automática</h3>
            <p className="text-sm text-muted-foreground">
              Ao completar uma tarefa de rotina, a próxima instância é automaticamente 
              criada com novo prazo calculado pela recorrência.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "processos",
    title: "Documentação de Processos",
    icon: <FileText className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Como Documentar Processos</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            A seção de Processos é onde você documenta e organiza todos os procedimentos 
            e fluxos de trabalho da empresa.
          </p>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Criando um Processo</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Acesse a página de Processos no Workspace</li>
              <li>Clique em "Novo Processo"</li>
              <li>Selecione a área/departamento</li>
              <li>Defina título e descrição detalhada</li>
              <li>Salve o processo</li>
            </ol>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Organizando por Áreas</h3>
            <p className="text-sm text-muted-foreground">
              Os processos são organizados por área (ex: Vendas, Marketing, RH). 
              Use os filtros na página para visualizar processos de uma área específica.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Vinculando Processos a Tarefas</h3>
            <p className="text-sm text-muted-foreground">
              Ao criar ou editar uma tarefa, você pode vincular múltiplos processos 
              relevantes. Isso permite que o responsável acesse rapidamente a 
              documentação necessária para executar a tarefa.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Navegação Rápida</h3>
            <p className="text-sm text-muted-foreground">
              Clicando em um processo vinculado na página de tarefa, você é levado 
              diretamente à página de Processos com o processo destacado.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "briefings",
    title: "Briefings & Debriefings",
    icon: <FileText className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Como Usar Briefings e Debriefings</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            O módulo de Briefing & Debriefing permite planejar eventos, registrar 
            investimentos e analisar resultados com métricas automatizadas.
          </p>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Criando um Briefing</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Acesse um projeto e navegue até a aba "Briefing & Debriefing".
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><strong>Data e Local:</strong> Informações básicas do evento</li>
              <li><strong>Investimento em Tráfego:</strong> Valor investido</li>
              <li><strong>Participantes Pagantes:</strong> Meta de público</li>
              <li><strong>Preços dos Ingressos:</strong> Configure múltiplas categorias</li>
            </ul>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Registrando o Debriefing</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Após o evento, preencha os dados reais:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><strong>Total de Leads:</strong> Leads gerados</li>
              <li><strong>Ingressos Vendidos:</strong> Quantidade e valor</li>
              <li><strong>Mentorias Vendidas:</strong> Vendas adicionais</li>
              <li><strong>Outras Estratégias:</strong> Participantes e receita</li>
              <li><strong>Dados por Vendedor:</strong> Performance individual</li>
            </ul>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Métricas Automáticas</h3>
            <p className="text-sm text-muted-foreground">
              O sistema calcula automaticamente: CPL (Custo por Lead), ROAS por categoria, 
              Taxa de Conversão Geral e Conversão por Vendedor. Visualize tudo no dashboard 
              de resultados.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Repositório Centralizado</h3>
            <p className="text-sm text-muted-foreground">
              Acesse todos os briefings e debriefings da empresa na página "Briefings" 
              do Workspace, com documentos consolidados para análise histórica.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "equipe",
    title: "Gestão de Equipe",
    icon: <Users className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Como Gerenciar a Equipe</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            A seção de Equipe permite convidar novos membros e controlar suas permissões 
            de acesso às funcionalidades da plataforma.
          </p>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Convidando Membros</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Acesse a seção "Equipe" no Workspace</li>
              <li>Clique em "Convidar Membro"</li>
              <li>Digite o e-mail da pessoa</li>
              <li>Defina o papel (Administrador, Gestor ou Membro)</li>
              <li>Configure as permissões específicas</li>
              <li>Envie o convite por e-mail ou copie o link</li>
            </ol>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Papéis e Hierarquia</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><strong>Administrador:</strong> Acesso total a todas funcionalidades</li>
              <li><strong>Gestor:</strong> Pode gerenciar projetos, tarefas e visualizar analytics</li>
              <li><strong>Membro:</strong> Acesso limitado baseado em permissões específicas</li>
            </ul>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Controlando Permissões</h3>
            <p className="text-sm text-muted-foreground">
              Você pode habilitar/desabilitar acesso a: Projetos, Tarefas, Analytics, 
              Briefings, Processos, Cultura, Visão e Cargos. As opções aparecerão ou 
              desaparecerão no menu do usuário conforme as permissões.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Sistema de Notificações</h3>
            <p className="text-sm text-muted-foreground">
              Membros convidados recebem notificações no sino (topo da página) e podem 
              aceitar convites diretamente pela plataforma ou por e-mail.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "analytics",
    title: "Analytics e Métricas",
    icon: <BarChart3 className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Como Usar Analytics</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            A página de Analytics oferece uma visão completa do desempenho da equipe 
            e dos projetos através de gráficos e métricas em tempo real.
          </p>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Visão Geral</h3>
            <p className="text-sm text-muted-foreground">
              Veja cards com métricas principais: total de projetos, tarefas em aberto, 
              tarefas concluídas, taxa de conclusão e produtividade da equipe.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Gráficos Interativos</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><strong>Tarefas por Status:</strong> Visualize distribuição de tarefas</li>
              <li><strong>Evolução no Tempo:</strong> Acompanhe tendências ao longo do tempo</li>
              <li><strong>Performance por Membro:</strong> Identifique produtividade individual</li>
              <li><strong>Taxa de Conclusão:</strong> Monitore eficiência da equipe</li>
            </ul>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Filtros Avançados</h3>
            <p className="text-sm text-muted-foreground">
              Use filtros de data, projeto ou membro para segmentar a análise e obter 
              insights específicos sobre períodos ou áreas da empresa.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Atualização em Tempo Real</h3>
            <p className="text-sm text-muted-foreground">
              Todos os dados são atualizados automaticamente conforme as ações da equipe, 
              garantindo que você sempre tenha acesso às informações mais recentes.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "workspace",
    title: "Cultura e Visão",
    icon: <Target className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Cultura e Visão da Empresa</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            As páginas de Cultura e Visão centralizam os valores, missão e objetivos 
            da empresa, criando alinhamento entre todos os membros.
          </p>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Página de Cultura</h3>
            <p className="text-sm text-muted-foreground">
              Documente os valores, princípios e comportamentos esperados na empresa. 
              Esta página serve como referência para novos membros e reforça a cultura 
              organizacional.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Visão, Missão e Valores</h3>
            <p className="text-sm text-muted-foreground">
              Registre a visão de longo prazo da empresa, sua missão e os valores 
              fundamentais. Estes elementos guiam as decisões estratégicas e o 
              comportamento da equipe.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Editando o Conteúdo</h3>
            <p className="text-sm text-muted-foreground">
              Administradores podem editar o conteúdo destas páginas a qualquer momento. 
              Use texto formatado, listas e seções para organizar as informações de 
              forma clara e acessível.
            </p>
          </div>

          <div className="border-l-4 border-l-primary pl-4">
            <h3 className="font-semibold mb-2">Acesso para Todos</h3>
            <p className="text-sm text-muted-foreground">
              Todo membro do workspace tem acesso de leitura a estas páginas, garantindo 
              que todos estejam alinhados com a cultura e direção da empresa.
            </p>
          </div>
        </div>
      </div>
    )
  }
];

export default function GettingStarted() {
  const [selectedTutorial, setSelectedTutorial] = useState<string>("introducao");
  
  const currentTutorial = tutorials.find(t => t.id === selectedTutorial);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Comece Aqui</h1>
          <p className="text-muted-foreground mt-1">
            Tutoriais completos sobre como usar a plataforma
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar de Navegação */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Tutoriais
              </CardTitle>
              <CardDescription>
                Selecione um tópico
              </CardDescription>
            </CardHeader>
            <Separator />
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-1">
                {tutorials.map((tutorial) => (
                  <button
                    key={tutorial.id}
                    onClick={() => setSelectedTutorial(tutorial.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                      selectedTutorial === tutorial.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tutorial.icon}
                    <span className="font-medium">{tutorial.title}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Área de Conteúdo */}
          <Card className="lg:col-span-3">
            <ScrollArea className="h-[680px]">
              <CardContent className="p-6">
                {currentTutorial?.content}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}