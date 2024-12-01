'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface SaleDetail {
    MaiorVendaDia: string
    TotalPedidosAtendidos: number
    NmEmpresaCurtoVenda: string
    TotalVendasDia: string
    TotalCustoDia: string
    MargemLucro: string
    DataExtracaoFormatada: string
}

interface DailySale {
    DataVenda: string
    Detalhes: SaleDetail[]
}

interface MetricData {
  currentMonth: {
    label: string
    value: number
    formatted: string
  }
  previousMonth: {
    label: string
    value: number
    formatted: string
  }
  percentChange: number
}

export function MonthlySalesMetrics() {
  const [metrics, setMetrics] = useState<MetricData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  const changeMonth = (amount: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + amount)
    setCurrentDate(newDate)
  }

  const isCurrentMonth = (date: Date) => {
    const now = new Date()
    return date.getMonth() === now.getMonth() && 
           date.getFullYear() === now.getFullYear()
  }

  const isBeforeJan2024 = (date: Date) => {
    return date < new Date(2024, 0)
  }

  useEffect(() => {
    let isMounted = true

    const fetchSalesData = async () => {
      try {
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
        const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)

        // Fetch current month data
        let currentMonthTotal = 0
        try {
          const response = await fetch('https://wh.sveletrica.com/webhook/ios-resumomes-filtro', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              de: firstDayOfMonth.toISOString().split('T')[0],
              ate: lastDayOfMonth.toISOString().split('T')[0]
            })
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data: DailySale[] = await response.json()
          if (!Array.isArray(data)) {
            throw new Error('Invalid data format received')
          }

          currentMonthTotal = data.reduce((total, day) => {
            return total + (day.Detalhes?.reduce((dayTotal, detail) => {
              if (!detail.TotalVendasDia) return dayTotal
              const value = parseFloat(detail.TotalVendasDia.replace('R$ ', '').replace('.', '').replace(',', '.'))
              return dayTotal + (isNaN(value) ? 0 : value)
            }, 0) || 0)
          }, 0)
        } catch (error) {
          console.error('Error fetching current month data:', error)
          throw error
        }

        // Fetch previous month data
        let lastMonthTotal = 0
        try {
          const lastMonthResponse = await fetch('https://wh.sveletrica.com/webhook/ios-resumomes-filtro', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              de: lastMonthStart.toISOString().split('T')[0],
              ate: lastMonthEnd.toISOString().split('T')[0]
            })
          })

          if (!lastMonthResponse.ok) {
            throw new Error(`HTTP error! status: ${lastMonthResponse.status}`)
          }

          const lastMonthData: DailySale[] = await lastMonthResponse.json()
          if (!Array.isArray(lastMonthData)) {
            throw new Error('Invalid data format received for last month')
          }

          lastMonthTotal = lastMonthData.reduce((total, day) => {
            return total + (day.Detalhes?.reduce((dayTotal, detail) => {
              if (!detail.TotalVendasDia) return dayTotal
              const value = parseFloat(detail.TotalVendasDia.replace('R$ ', '').replace('.', '').replace(',', '.'))
              return dayTotal + (isNaN(value) ? 0 : value)
            }, 0) || 0)
          }, 0)
        } catch (error) {
          console.error('Error fetching last month data:', error)
          throw error
        }

        if (isMounted) {
          setMetrics({
            currentMonth: {
              label: format(currentDate, "MMMM 'de' yyyy", { locale: ptBR }),
              value: currentMonthTotal,
              formatted: new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(currentMonthTotal)
            },
            previousMonth: {
              label: format(lastMonthStart, "MMMM 'de' yyyy", { locale: ptBR }),
              value: lastMonthTotal,
              formatted: new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(lastMonthTotal)
            },
            percentChange: lastMonthTotal > 0 
              ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
              : 0
          })
        }
      } catch (error) {
        console.error('Error in fetchSalesData:', error)
        if (isMounted) {
          setMetrics(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    setLoading(true)
    fetchSalesData()

    return () => {
      isMounted = false
    }
  }, [currentDate])

  if (loading) {
    return (
      <div className="col-span-2 space-y-4">
        <div className="flex justify-between items-center">
          <div className="animate-pulse h-6 bg-muted rounded w-24"></div>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded bg-muted"></div>
            <div className="w-8 h-8 rounded bg-muted"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="animate-pulse h-6 bg-muted rounded w-32"></div>
          <div className="animate-pulse h-6 bg-muted rounded w-24"></div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="col-span-2 space-y-4">
        <p className="text-muted-foreground">Failed to load metrics</p>
      </div>
    )
  }

  return (
    <div className="col-span-2 space-y-4 relative z-20">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">{metrics.currentMonth.label}</p>
          <p className="text-2xl font-bold">{metrics.currentMonth.formatted}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.preventDefault()
              changeMonth(-1)
            }}
            disabled={isBeforeJan2024(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.preventDefault()
              changeMonth(1)
            }}
            disabled={isCurrentMonth(currentDate)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Mês Anterior</p>
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            metrics.percentChange > 0 ? "text-green-500" : "text-red-500"
          )}>
            {metrics.percentChange > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>{`${metrics.percentChange >= 0 ? '+' : ''}${metrics.percentChange.toFixed(1)}%`}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold">{metrics.previousMonth.formatted}</p>
        </div>
      </div>
    </div>
  )
} 