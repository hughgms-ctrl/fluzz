import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Target, Heart, FileText, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export default function Workspace() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Workspace</h1>
          <p className="text-muted-foreground mt-1">
            Centro de informações e recursos da empresa
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/workspace/culture">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <Heart className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Cultura</CardTitle>
                <CardDescription>
                  Conheça os valores e a cultura da nossa empresa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/workspace/vision">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <Target className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Visão, Missão e Valores</CardTitle>
                <CardDescription>
                  Entenda nossos objetivos e princípios fundamentais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/workspace/processes">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Processos</CardTitle>
                <CardDescription>
                  Documentação de processos organizados por área
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Dashboard</CardTitle>
                <CardDescription>
                  Visão geral dos seus projetos e tarefas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/projects">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <BookOpen className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Projetos</CardTitle>
                <CardDescription>
                  Gerencie todos os projetos da empresa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
