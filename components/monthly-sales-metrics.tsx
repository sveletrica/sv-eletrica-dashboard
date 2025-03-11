'use client'

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Calendar } from "lucide-react"
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
    projectedTotal: number
    hasCurrentDay: boolean
  }
  previousMonth: {
    label: string
    value: number
    formatted: string
    businessDays: number
    avgPerBusinessDay: number
  }
  previousYearMonth: {
    label: string
    value: number
    formatted: string
    businessDays: number
    completedBusinessDays: number
    avgPerBusinessDay: number
    sameCompletedPeriodValue: number
    sameCompletedPeriodFormatted: string
  }
  percentChange: number
  businessDayPercentChange: number
  previousYearBusinessDayPercentChange: number
  previousYearSamePeriodPercentChange: number
  projectedPercentChange: number
}

export function MonthlySalesMetrics() {
  const [metrics, setMetrics] = useState<MetricData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [includeCurrentDay, setIncludeCurrentDay] = useState(false)
  const [rawData, setRawData] = useState<{
    currentMonthTotal: number;
    lastMonthTotal: number;
    lastYearMonthTotal: number;
    currentMonthBusinessDays: {
      diasUteisTotais: number;
      diasUteisDecorridos: number;
      hasCurrentDay: boolean;
    };
    previousMonthBusinessDays: {
      diasUteisTotais: number;
    };
    previousYearMonthBusinessDays: {
      diasUteisTotais: number;
    };
  } | null>(null)

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

  // Function to calculate metrics based on raw data and includeCurrentDay setting
  const calculateMetrics = useCallback((data: typeof rawData, includeCurrentDay: boolean) => {
    if (!data) return null;
    
    const { 
      currentMonthTotal, 
      lastMonthTotal,
      lastYearMonthTotal,
      currentMonthBusinessDays, 
      previousMonthBusinessDays,
      previousYearMonthBusinessDays
    } = data;

    // Calculate effective completed days based on includeCurrentDay setting
    const effectiveCompletedDays = includeCurrentDay && currentMonthBusinessDays.hasCurrentDay
      ? currentMonthBusinessDays.diasUteisDecorridos + 1
      : currentMonthBusinessDays.diasUteisDecorridos;
    
    // Calculate average per business day
    const currentMonthAvgPerDay = effectiveCompletedDays > 0 
      ? currentMonthTotal / effectiveCompletedDays 
      : 0;
    
    // For previous month, we use all business days since it's already complete
    const previousMonthAvgPerDay = previousMonthBusinessDays.diasUteisTotais > 0 
      ? lastMonthTotal / previousMonthBusinessDays.diasUteisTotais 
      : 0;

    // For previous year's same month
    const previousYearMonthAvgPerDay = previousYearMonthBusinessDays.diasUteisTotais > 0
      ? lastYearMonthTotal / previousYearMonthBusinessDays.diasUteisTotais
      : 0;

    // Calculate percent change based on business days (vs previous month)
    const businessDayPercentChange = previousMonthAvgPerDay > 0 
      ? ((currentMonthAvgPerDay - previousMonthAvgPerDay) / previousMonthAvgPerDay) * 100 
      : 0;

    // Calculate percent change based on business days (vs previous year same month)
    const previousYearBusinessDayPercentChange = previousYearMonthAvgPerDay > 0
      ? ((currentMonthAvgPerDay - previousYearMonthAvgPerDay) / previousYearMonthAvgPerDay) * 100
      : 0;

    // Calculate same period comparison with previous year
    // Use the same number of completed business days for fair comparison
    const previousYearCompletedDays = Math.min(
      effectiveCompletedDays, 
      previousYearMonthBusinessDays.diasUteisTotais
    );
    
    // Calculate the value for the same period last year
    const previousYearSamePeriodValue = previousYearCompletedDays > 0 && lastYearMonthTotal > 0
      ? (lastYearMonthTotal / previousYearMonthBusinessDays.diasUteisTotais) * previousYearCompletedDays
      : 0;
    
    // Calculate percent change for the same period
    const previousYearSamePeriodPercentChange = previousYearSamePeriodValue > 0
      ? ((currentMonthTotal - previousYearSamePeriodValue) / previousYearSamePeriodValue) * 100
      : 0;

    // Calculate projected total based on daily average
    let projectedTotal = currentMonthTotal;
    if (effectiveCompletedDays > 0) {
      const remainingDays = currentMonthBusinessDays.diasUteisTotais - effectiveCompletedDays;
      projectedTotal = currentMonthTotal + (currentMonthAvgPerDay * remainingDays);
    }

    // Format dates for labels
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const lastYearMonthStart = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1);

    return {
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
      previousYearMonth: {
        label: format(lastYearMonthStart, "MMMM 'de' yyyy", { locale: ptBR }),
        value: lastYearMonthTotal,
        formatted: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          notation: 'compact',
          maximumFractionDigits: 1
        }).format(lastYearMonthTotal),
        businessDays: previousYearMonthBusinessDays.diasUteisTotais,
        completedBusinessDays: previousYearCompletedDays,
        avgPerBusinessDay: previousYearMonthAvgPerDay,
        sameCompletedPeriodValue: previousYearSamePeriodValue,
        sameCompletedPeriodFormatted: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          notation: 'compact',
          maximumFractionDigits: 1
        }).format(previousYearSamePeriodValue)
      },
      percentChange: lastMonthTotal > 0 
        ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
        : 0,
      businessDayPercentChange: businessDayPercentChange,
      previousYearBusinessDayPercentChange: previousYearBusinessDayPercentChange,
      previousYearSamePeriodPercentChange: previousYearSamePeriodPercentChange,
      projectedPercentChange: lastMonthTotal > 0
        ? ((projectedTotal - lastMonthTotal) / lastMonthTotal) * 100
        : 0
    };
  }, [currentDate]);

  // Effect to update metrics when includeCurrentDay changes
  useEffect(() => {
    if (rawData) {
      const newMetrics = calculateMetrics(rawData, includeCurrentDay);
      if (newMetrics) {
        setMetrics(newMetrics);
      }
    }
  }, [includeCurrentDay, rawData, calculateMetrics]);

  useEffect(() => {
    let isMounted = true;

    const fetchSalesData = async () => {
      try {
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
        
        // Previous year same month
        const lastYearMonthStart = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1);
        const lastYearMonthEnd = new Date(currentDate.getFullYear() - 1, currentDate.getMonth() + 1, 0);

        // Calculate business days for current month
        const currentMonthBusinessDays = calcularDiasUteis(
          currentDate.getFullYear(),
          currentDate.getMonth()
        );

        // Calculate business days for previous month
        const previousMonthBusinessDays = calcularDiasUteis(
          lastMonthStart.getFullYear(),
          lastMonthStart.getMonth()
        );
        
        // Calculate business days for previous year same month
        const previousYearMonthBusinessDays = calcularDiasUteis(
          lastYearMonthStart.getFullYear(),
          lastYearMonthStart.getMonth()
        );

        // Fetch current month data
        let currentMonthTotal = 0;
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
        let lastMonthTotal = 0;
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
        
        // Fetch previous year same month data
        let lastYearMonthTotal = 0;
        try {
          const lastYearMonthResponse = await fetch('https://wh.sveletrica.com/webhook/ios-resumomes-filtro', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              de: lastYearMonthStart.toISOString().split('T')[0],
              ate: lastYearMonthEnd.toISOString().split('T')[0]
            })
          });

          if (!lastYearMonthResponse.ok) {
            throw new Error(`HTTP error! status: ${lastYearMonthResponse.status}`);
          }

          const lastYearMonthData: DailySale[] = await lastYearMonthResponse.json();
          if (!Array.isArray(lastYearMonthData)) {
            throw new Error('Invalid data format received for last year same month');
          }

          lastYearMonthTotal = lastYearMonthData.reduce((total, day) => {
            return total + (day.Detalhes?.reduce((dayTotal, detail) => {
              if (!detail.TotalVendasDia) return dayTotal;
              const value = parseFloat(detail.TotalVendasDia.replace('R$ ', '').replace('.', '').replace(',', '.'));
              return dayTotal + (isNaN(value) ? 0 : value);
            }, 0) || 0);
          }, 0);
        } catch (error) {
          console.error('Error fetching last year same month data:', error);
          // Don't throw here, just log the error and continue with 0
          lastYearMonthTotal = 0;
        }

        if (isMounted) {
          // Store raw data
          const data = {
            currentMonthTotal,
            lastMonthTotal,
            lastYearMonthTotal,
            currentMonthBusinessDays,
            previousMonthBusinessDays,
            previousYearMonthBusinessDays
          };
          setRawData(data);
          
          // Calculate and set metrics
          const newMetrics = calculateMetrics(data, includeCurrentDay);
          if (newMetrics) {
            setMetrics(newMetrics);
          }
        }
      } catch (error) {
        console.error('Error in fetchSalesData:', error)
        if (isMounted) {
          setMetrics(null)
          setRawData(null)
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
  }, [currentDate, calculateMetrics])

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
          <p className="text-2xl font-bold transition-all duration-300 ease-in-out">{metrics.currentMonth.formatted}</p>
          <p className="text-xs text-muted-foreground">
            <span className="transition-all duration-300 ease-in-out">
              {includeCurrentDay && metrics.currentMonth.hasCurrentDay 
                ? metrics.currentMonth.completedBusinessDays + 1 
                : metrics.currentMonth.completedBusinessDays}
            </span> de {metrics.currentMonth.businessDays} dias úteis
            {metrics.currentMonth.hasCurrentDay && (
              <span className={cn(
                "transition-colors duration-300", 
                includeCurrentDay ? "text-green-500" : "text-muted-foreground"
              )}>
                {includeCurrentDay ? " (dia atual contabilizado)" : " (dia atual não contabilizado)"}
              </span>
            )}
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
              "flex items-center gap-1 text-sm font-medium transition-colors duration-300",
              metrics.businessDayPercentChange > 0 ? "text-green-500" : "text-red-500"
            )}>
              {metrics.businessDayPercentChange > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="transition-all duration-300 ease-in-out">{`${metrics.businessDayPercentChange >= 0 ? '+' : ''}${metrics.businessDayPercentChange.toFixed(1)}%`}</span>
            </div>
          </div>
          <div className="flex justify-between text-xs">
            <span>Média diária atual:</span>
            <span className="font-medium transition-all duration-300 ease-in-out">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0
              }).format(metrics.currentMonth.avgPerBusinessDay)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Média diária mês anterior:</span>
            <span className="font-medium">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0
              }).format(metrics.previousMonth.avgPerBusinessDay)}
            </span>
          </div>
          
          {/* Previous year same month comparison */}
          <div className="mt-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Comparação com ano anterior:</p>
              {metrics.previousYearMonth.value > 0 ? (
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium transition-colors duration-300",
                  metrics.previousYearBusinessDayPercentChange > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {metrics.previousYearBusinessDayPercentChange > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="transition-all duration-300 ease-in-out">{`${metrics.previousYearBusinessDayPercentChange >= 0 ? '+' : ''}${metrics.previousYearBusinessDayPercentChange.toFixed(1)}%`}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Sem dados</span>
              )}
            </div>
            
            {metrics.previousYearMonth.value > 0 && (
              <>
                <div className="flex justify-between text-xs mt-1">
                  <span>Dias úteis {format(new Date(currentDate.getFullYear() - 1, currentDate.getMonth()), "MMM/yyyy", { locale: ptBR })}:</span>
                  <span className="font-medium">
                    {metrics.previousYearMonth.businessDays}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Média diária {format(new Date(currentDate.getFullYear() - 1, currentDate.getMonth()), "MMM/yyyy", { locale: ptBR })}:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      maximumFractionDigits: 0
                    }).format(metrics.previousYearMonth.avgPerBusinessDay)}
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span>Total {format(new Date(currentDate.getFullYear() - 1, currentDate.getMonth()), "MMM/yyyy", { locale: ptBR })}:</span>
                  <span className="font-medium">
                    {metrics.previousYearMonth.formatted}
                  </span>
                </div>
              </>
            )}
            
            {/* Same period comparison */}
            {metrics.previousYearMonth.value > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-[10px] px-1.5 py-0.5 rounded-sm mr-1.5">
                      MESMO PERÍODO
                    </span>
                    <span>Comparação:</span>
                  </p>
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-medium transition-colors duration-300",
                    metrics.previousYearSamePeriodPercentChange > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {metrics.previousYearSamePeriodPercentChange > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="transition-all duration-300 ease-in-out">{`${metrics.previousYearSamePeriodPercentChange >= 0 ? '+' : ''}${metrics.previousYearSamePeriodPercentChange.toFixed(1)}%`}</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="flex items-center">
                    <span className="text-[10px] text-muted-foreground mr-1">Atual:</span>
                    {includeCurrentDay && metrics.currentMonth.hasCurrentDay 
                      ? metrics.currentMonth.completedBusinessDays + 1 
                      : metrics.currentMonth.completedBusinessDays} dias úteis
                  </span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      notation: 'compact',
                      maximumFractionDigits: 1
                    }).format(metrics.currentMonth.value)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center">
                    <span className="text-[10px] text-muted-foreground mr-1">Ano anterior:</span>
                    {metrics.previousYearMonth.completedBusinessDays} dias úteis
                  </span>
                  <span className="font-medium">
                    {metrics.previousYearMonth.sameCompletedPeriodFormatted}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Toggle for including current day */}
          {isCurrentMonth(currentDate) && metrics.currentMonth.hasCurrentDay && (
            <div className="mt-2 pt-2 border-t">
              <Button 
                variant={includeCurrentDay ? "default" : "outline"}
                size="sm" 
                className="w-full text-xs flex items-center justify-center gap-1"
                onClick={(e) => {
                  e.preventDefault()
                  setIncludeCurrentDay(!includeCurrentDay)
                }}
              >
                <Calendar className="h-3 w-3" />
                {includeCurrentDay 
                  ? "Excluir dia atual dos cálculos" 
                  : "Incluir dia atual nos cálculos"}
              </Button>
            </div>
          )}
          
          {/* Projected total section */}
          {isCurrentMonth(currentDate) && (includeCurrentDay ? metrics.currentMonth.completedBusinessDays > 0 || metrics.currentMonth.hasCurrentDay : metrics.currentMonth.completedBusinessDays > 0) && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Projeção para o mês:</p>
                <p className="text-sm font-medium transition-all duration-300 ease-in-out">
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
                  "flex items-center gap-1 font-medium transition-colors duration-300",
                  metrics.projectedPercentChange > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {metrics.projectedPercentChange > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="transition-all duration-300 ease-in-out">{`${metrics.projectedPercentChange >= 0 ? '+' : ''}${metrics.projectedPercentChange.toFixed(1)}%`}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 