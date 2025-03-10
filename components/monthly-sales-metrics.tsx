'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { FERIADOS } from "@/app/config/feriados"

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
    businessDays: number
    completedBusinessDays: number
    avgPerBusinessDay: number
    projectedTotal?: number
    hasCurrentDay: boolean
  }
  previousMonth: {
    label: string
    value: number
    formatted: string
    businessDays: number
    avgPerBusinessDay: number
  }
  percentChange: number
  businessDayPercentChange: number
  projectedPercentChange: number
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

  // Function to calculate business days in a month
  const calcularDiasUteis = (ano: number, mes: number) => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    
    // First day of the month
    const primeiroDiaMes = new Date(ano, mes, 1)
    primeiroDiaMes.setHours(0, 0, 0, 0)
    
    // Last day of the month
    const ultimoDiaMes = new Date(ano, mes + 1, 0)
    ultimoDiaMes.setHours(0, 0, 0, 0)
    
    // Arrays to store days
    const diasUteisTotais: string[] = []
    const diasUteisDecorridos: string[] = []
    const isCurrentDay: boolean[] = []
    
    // Calculate all business days in the month
    const dataIteracaoTotal = new Date(primeiroDiaMes)
    while (dataIteracaoTotal <= ultimoDiaMes) {
      const dataFormatada = dataIteracaoTotal.toISOString().split('T')[0]
      
      // Check if it's a business day (not weekend)
      if (dataIteracaoTotal.getDay() !== 0 && dataIteracaoTotal.getDay() !== 6) {
        // Check if it's not a holiday
        if (!FERIADOS.includes(dataFormatada)) {
          diasUteisTotais.push(dataFormatada)
          
          // Check if this is the current day
          const isToday = dataIteracaoTotal.getDate() === hoje.getDate() && 
                          dataIteracaoTotal.getMonth() === hoje.getMonth() && 
                          dataIteracaoTotal.getFullYear() === hoje.getFullYear()
          
          // If the date is before today (not including today), it's a completed business day
          if (dataIteracaoTotal < hoje) {
            diasUteisDecorridos.push(dataFormatada)
            isCurrentDay.push(false)
          } else if (isToday) {
            // Mark today separately
            isCurrentDay.push(true)
          }
        }
      }
      
      // Move to next day
      dataIteracaoTotal.setDate(dataIteracaoTotal.getDate() + 1)
    }
    
    return {
      diasUteisTotais: diasUteisTotais.length,
      diasUteisDecorridos: diasUteisDecorridos.length,
      hasCurrentDay: isCurrentDay.includes(true)
    }
  }

  useEffect(() => {
    let isMounted = true

    const fetchSalesData = async () => {
      try {
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
        const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)

        // Calculate business days for current month
        const currentMonthBusinessDays = calcularDiasUteis(
          currentDate.getFullYear(),
          currentDate.getMonth()
        )

        // Calculate business days for previous month
        const previousMonthBusinessDays = calcularDiasUteis(
          lastMonthStart.getFullYear(),
          lastMonthStart.getMonth()
        )

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

        // Calculate average per business day
        // For current month, we only use completed days (excluding today)
        const currentMonthAvgPerDay = currentMonthBusinessDays.diasUteisDecorridos > 0 
          ? currentMonthTotal / currentMonthBusinessDays.diasUteisDecorridos 
          : 0
        
        // For previous month, we use all business days since it's already complete
        const previousMonthAvgPerDay = previousMonthBusinessDays.diasUteisTotais > 0 
          ? lastMonthTotal / previousMonthBusinessDays.diasUteisTotais 
          : 0

        // Calculate percent change based on business days
        const businessDayPercentChange = previousMonthAvgPerDay > 0 
          ? ((currentMonthAvgPerDay - previousMonthAvgPerDay) / previousMonthAvgPerDay) * 100 
          : 0

        // Calculate projected total based on daily average (if we have completed days)
        let projectedTotal = currentMonthTotal
        if (currentMonthBusinessDays.diasUteisDecorridos > 0 && currentMonthBusinessDays.hasCurrentDay) {
          // Get current time to estimate completion percentage of today
          const now = new Date()
          const currentHour = now.getHours() + (now.getMinutes() / 60)
          const workdayHours = 9 // Assuming 9-hour workday (8am-5pm)
          const workdayStart = 8 // Assuming workday starts at 8am
          
          // Calculate how much of the workday has passed (0-1)
          let workdayCompletion = 0
          if (currentHour >= workdayStart + workdayHours) {
            // After work hours, consider the day complete
            workdayCompletion = 1
          } else if (currentHour >= workdayStart) {
            // During work hours
            workdayCompletion = (currentHour - workdayStart) / workdayHours
          }
          
          // Project total including estimated remainder of today
          const todayEstimated = currentMonthAvgPerDay * workdayCompletion
          const remainingDays = currentMonthBusinessDays.diasUteisTotais - currentMonthBusinessDays.diasUteisDecorridos - 1
          projectedTotal = currentMonthTotal + (currentMonthAvgPerDay * remainingDays) + (currentMonthAvgPerDay - todayEstimated)
        } else if (currentMonthBusinessDays.diasUteisDecorridos > 0) {
          // If today is not a business day but we have other completed days
          const remainingDays = currentMonthBusinessDays.diasUteisTotais - currentMonthBusinessDays.diasUteisDecorridos
          projectedTotal = currentMonthTotal + (currentMonthAvgPerDay * remainingDays)
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
              }).format(currentMonthTotal),
              businessDays: currentMonthBusinessDays.diasUteisTotais,
              completedBusinessDays: currentMonthBusinessDays.diasUteisDecorridos,
              avgPerBusinessDay: currentMonthAvgPerDay,
              projectedTotal: projectedTotal,
              hasCurrentDay: currentMonthBusinessDays.hasCurrentDay
            },
            previousMonth: {
              label: format(lastMonthStart, "MMMM 'de' yyyy", { locale: ptBR }),
              value: lastMonthTotal,
              formatted: new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(lastMonthTotal),
              businessDays: previousMonthBusinessDays.diasUteisTotais,
              avgPerBusinessDay: previousMonthAvgPerDay
            },
            percentChange: lastMonthTotal > 0 
              ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
              : 0,
            businessDayPercentChange: businessDayPercentChange,
            projectedPercentChange: lastMonthTotal > 0
              ? ((projectedTotal - lastMonthTotal) / lastMonthTotal) * 100
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
          <p className="text-xs text-muted-foreground">
            {metrics.currentMonth.completedBusinessDays} de {metrics.currentMonth.businessDays} dias úteis
            {metrics.currentMonth.hasCurrentDay && " (dia atual não contabilizado)"}
          </p>
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
          <p className="text-lg font-bold">{metrics.previousMonth.formatted}</p>
          <p className="text-xs text-muted-foreground">
            {metrics.previousMonth.businessDays} dias úteis
          </p>
        </div>
        
        {/* Business day comparison */}
        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Comparação por dia útil:</p>
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              metrics.businessDayPercentChange > 0 ? "text-green-500" : "text-red-500"
            )}>
              {metrics.businessDayPercentChange > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{`${metrics.businessDayPercentChange >= 0 ? '+' : ''}${metrics.businessDayPercentChange.toFixed(1)}%`}</span>
            </div>
          </div>
          <div className="flex justify-between text-xs">
            <span>Média diária atual:</span>
            <span className="font-medium">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0
              }).format(metrics.currentMonth.avgPerBusinessDay)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Média diária anterior:</span>
            <span className="font-medium">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0
              }).format(metrics.previousMonth.avgPerBusinessDay)}
            </span>
          </div>
          
          {/* Projected total section */}
          {isCurrentMonth(currentDate) && metrics.currentMonth.completedBusinessDays > 0 && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Projeção para o mês:</p>
                <p className="text-sm font-medium">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact',
                    maximumFractionDigits: 1
                  }).format(metrics.currentMonth.projectedTotal)}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Variação projetada:</span>
                <div className={cn(
                  "flex items-center gap-1 font-medium",
                  metrics.projectedPercentChange > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {metrics.projectedPercentChange > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{`${metrics.projectedPercentChange >= 0 ? '+' : ''}${metrics.projectedPercentChange.toFixed(1)}%`}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 