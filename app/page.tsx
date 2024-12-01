import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MonthlySalesMetrics } from "@/components/monthly-sales-metrics"

const sections = [
  {
    title: "Estoque",
    description: "Ferramenta para gerenciar o estoque de produtos.",
    link: "/inventory",
    metrics: [
      { label: "Total Items", value: "2,500" },
      { label: "Tagged Items", value: "900" },
    ]
  },
  {
    title: "Vendas Mensais",
    description: "Analise o desempenho mensal de vendas, tendências e comparações entre lojas.",
    link: "/vendas-mes",
    type: "monthly-sales"
  },
  {
    title: "Vendas Diárias",
    description: "Monitore atividades e métricas de desempenho das vendas diárias.",
    link: "/vendas-dia",
    metrics: [
      { label: "Hoje", value: "R$ 4.2K" },
      { label: "vs Ontem", value: "+5%" },
    ]
  }
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex justify-center">SV Elétrica Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sections.map((section) => (
          <Card key={section.title} className="h-full hover:bg-accent/50 transition-colors relative group">
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{section.description}</p>
              <div className="grid grid-cols-2 gap-4">
                {section.type === "monthly-sales" ? (
                  <MonthlySalesMetrics />
                ) : (
                  Array.isArray(section.metrics) && section.metrics.map((metric) => (
                    <div key={metric.label}>
                      <p className="text-sm text-muted-foreground">{metric.label}</p>
                      <p className="text-2xl font-bold">{metric.value}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            <Link 
              href={section.link} 
              className="absolute inset-0 z-10 group-hover:bg-accent/10 transition-colors"
              aria-label={`View ${section.title}`}
            />
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Overview</CardTitle>
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
  )
}