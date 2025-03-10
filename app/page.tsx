import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { MonthlySalesMetrics } from "../components/monthly-sales-metrics";
import React from "react";
import { Separator } from "@/components/ui/separator";
export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex justify-center">SV Elétrica Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Estoque */}
        <div className="grid grid-rows-2 gap-4">
          <Card className="hover:bg-accent/50 transition-colors relative group">
            <CardHeader>
              <CardTitle>Estoques</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Ferramenta para gerenciar o estoque de produtos.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="font-bold text-2xl">2,500</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tagged Items</p>
                  <p className="font-bold text-2xl">900</p>
                </div>
              </div>
            </CardContent>
            <Link
              href="/inventory"
              className="absolute inset-0 z-10 group-hover:bg-accent/10 transition-colors"
              aria-label="View Estoque"
            />
          </Card>

          <Card className="hover:bg-accent/50 transition-colors relative group">
            <CardHeader>
              <CardTitle>Vendas Diárias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Monitore atividades e métricas de desempenho das vendas diárias.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Hoje</p>
                  <p className="font-bold text-2xl">R$ 4.2K</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">vs Ontem</p>
                  <p className="font-bold text-2xl">+5%</p>
                </div>
              </div>
            </CardContent>
            <Link
              href="/vendas-dia"
              className="absolute inset-0 z-10 group-hover:bg-accent/10 transition-colors"
              aria-label="View Vendas Diárias"
            />
          </Card>
        </div>

        {/* Card Vendas Mensais */}
        <Card className="h-full hover:bg-accent/50 transition-colors relative group">
          <CardHeader>
            <CardTitle>Vendas Mensais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Analise o desempenho mensal de vendas, tendências e comparações entre lojas.</p>
            <div className="grid grid-cols-2 gap-4">
              <MonthlySalesMetrics />
            </div>
          </CardContent>
          <Link 
            href="/vendas-mes" 
            className="absolute inset-0 z-10 group-hover:bg-accent/10 transition-colors"
            aria-label="View Vendas Mensais"
          />
        </Card>

        {/* Card Dashboard de Vendas */}
        <Card className="h-full hover:bg-accent/50 transition-colors relative group">
          <CardHeader>
            <CardTitle>Dashboard de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Visualize o desempenho de vendas por vendedor e filial com métricas detalhadas.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Vendedores</p>
                <p className="font-bold text-lg">Análise</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Filiais</p>
                <p className="font-bold text-lg">Comparativo</p>
              </div>
            </div>
          </CardContent>
          <Link 
            href="/dashboard-vendas" 
            className="absolute inset-0 z-10 group-hover:bg-accent/10 transition-colors"
            aria-label="View Dashboard de Vendas"
          />
        </Card>
      </div>

      <Card>
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
  );
}