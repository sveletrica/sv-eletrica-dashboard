import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MonthlySalesMetrics } from "@/components/monthly-sales-metrics"

const sections = [
  {
    title: "Inventory Management",
    description: "Track and manage RFID tagged items, view stock levels, and identify tagging issues.",
    link: "/inventory",
    metrics: [
      { label: "Total Items", value: "2,500" },
      { label: "Tagged Items", value: "900" },
    ]
  },
  {
    title: "Monthly Sales",
    description: "Analyze monthly sales performance, trends, and comparisons across stores.",
    link: "/vendas-mes",
    type: "monthly-sales"
  },
  {
    title: "Daily Sales",
    description: "Monitor daily sales activities and performance metrics.",
    link: "/vendas-dia",
    metrics: [
      { label: "Today", value: "R$ 4.2K" },
      { label: "vs Yesterday", value: "+5%" },
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
            Welcome to the SV Elétrica Dashboard. Use the cards above to navigate to detailed views of inventory management, 
            monthly sales analysis, and daily sales tracking. Each section provides comprehensive tools and visualizations 
            to help monitor and analyze business performance.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}