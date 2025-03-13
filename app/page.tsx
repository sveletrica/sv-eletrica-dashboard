import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { MonthlySalesMetrics } from "../components/monthly-sales-metrics";
import React from "react";
import { BarChart3, Package, CalendarDays, TrendingUp, ArrowRight } from "lucide-react";
import { StockDataLoader } from "./components/dashboard/StockDataLoader";
import { SalesDataLoader } from "./components/dashboard/SalesDataLoader";

// Changed to a client component for immediate rendering
export default function Dashboard() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-center md:text-left">SV Elétrica Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-center md:text-left">Visualize e gerencie dados de vendas e estoque</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Card Vendas Mensais - Lado Esquerdo (3 linhas) */}
        <Card className="w-full transition-all duration-300 hover:shadow-md border-l-4 border-l-amber-500 lg:col-span-2 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-amber-500" />
                Vendas Mensais
              </CardTitle>
              <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded">Tendências</span>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground mb-4">Analise o desempenho mensal de vendas, tendências e comparações entre lojas.</p>
            <div className="w-full h-full">
              <MonthlySalesMetrics />
            </div>
          </CardContent>
          <CardFooter className="pt-0 mt-auto">
            <Link
              href="/vendas-mes"
              className="text-amber-600 hover:text-amber-800 text-sm font-medium inline-flex items-center"
            >
              Ver Detalhes <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardFooter>
        </Card>

        {/* Coluna da Direita - Stack Vertical */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full">
          {/* Card Estoque */}
          <Card className="group transition-all duration-300 hover:shadow-md border-l-4 border-l-blue-500 flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2 text-blue-500" />
                  Estoques
                </CardTitle>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Gerenciamento</span>
              </div>
            </CardHeader>
            <CardContent>
              <StockDataLoader />
              <p className="text-sm text-muted-foreground">Ferramenta para gerenciar o estoque de produtos.</p>
            </CardContent>
            <CardFooter className="pt-0 mt-auto">
              <Link
                href="/inventory"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center"
              >
                Acessar Estoques <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </CardFooter>
          </Card>

          {/* Card Vendas Diárias */}
          <Card className="group transition-all duration-300 hover:shadow-md border-l-4 border-l-green-500 flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <CalendarDays className="h-5 w-5 mr-2 text-green-500" />
                  Vendas Diárias
                </CardTitle>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Monitoramento</span>
              </div>
            </CardHeader>
            <CardContent>
              <SalesDataLoader />
              <p className="text-sm text-muted-foreground">Monitore atividades e métricas de desempenho das vendas diárias.</p>
            </CardContent>
            <CardFooter className="pt-0 mt-auto">
              <Link
                href="/vendas-dia"
                className="text-green-600 hover:text-green-800 text-sm font-medium inline-flex items-center"
              >
                Ver Vendas Diárias <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </CardFooter>
          </Card>

          {/* Card Dashboard de Vendas */}
          <Card className="group transition-all duration-300 hover:shadow-md border-l-4 border-l-purple-500 flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-purple-500" />
                  Dashboard de Vendas
                </CardTitle>
                <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">Análise</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Vendedores</p>
                  <p className="font-bold text-lg">Análise</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Filiais</p>
                  <p className="font-bold text-lg">Comparativo</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Visualize o desempenho de vendas por vendedor e filial com métricas detalhadas.</p>
            </CardContent>
            <CardFooter className="pt-0 mt-auto">
              <Link
                href="/dashboard-vendas"
                className="text-purple-600 hover:text-purple-800 text-sm font-medium inline-flex items-center"
              >
                Ver Dashboard <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Visão Geral */}
      <div className="mt-8">
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100">
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Bem-vindo ao Painel da SV Elétrica. Use os cartões acima para navegar para visualizações detalhadas do gerenciamento de estoque,
              análise de vendas mensais e acompanhamento de vendas diárias. Cada seção fornece ferramentas e visualizações abrangentes
              para ajudar a monitorar e analisar o desempenho do negócio.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}