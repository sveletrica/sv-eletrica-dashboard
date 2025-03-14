import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "../../../components/ui/chart";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from "../../../components/ui/button";
import { FERIADOS } from "../../config/feriados";

interface AccumulatedRevenueData {
  date: string;
  accumulated_revenue: number;
  accumulated_target: number;
  forecast_revenue: number;
  is_weekend: boolean;
}

interface AccumulatedRevenueChartProps {
  accumulatedRevenueData: AccumulatedRevenueData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Parse the date in local timezone (without creating UTC conversion issues)
    const [year, month, day] = label.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const formattedDate = date.toLocaleDateString('pt-BR');

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-medium mb-1">{formattedDate}</p>
        {payload.map((entry: any) => {
          const value = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(entry.value);

          let label = '';
          switch(entry.dataKey) {
            case 'accumulated_revenue':
              label = 'Faturado';
              break;
            case 'accumulated_target':
              label = 'Meta';
              break;
            case 'forecast_revenue':
              label = 'Previsão';
              break;
            case 'adjusted_forecast_revenue':
              label = 'Previsão Ajustada';
              break;
            default:
              label = entry.dataKey;
          }

          return (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <p className="text-sm">
                <span className="font-medium">{label}:</span> {value}
              </p>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export function AccumulatedRevenueChart({ accumulatedRevenueData }: AccumulatedRevenueChartProps) {
  const [excludeToday, setExcludeToday] = useState(false);
  
  // Calcular a projeção ajustada (desconsiderando o dia de hoje como dia útil)
  const chartData = useMemo(() => {
    if (!accumulatedRevenueData.length) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Encontrar dias úteis (excluindo fins de semana e feriados)
    const businessDays = accumulatedRevenueData.filter(
      day => !day.is_weekend && !FERIADOS.includes(day.date) && day.date <= todayFormatted
    );
    
    // Contar dias úteis até ontem (excluindo hoje)
    const businessDaysUntilYesterday = businessDays.filter(
      day => day.date < todayFormatted
    );
    
    // Encontrar o faturamento acumulado até ontem
    const lastAccumulatedRevenue = businessDaysUntilYesterday.length > 0 
      ? businessDaysUntilYesterday[businessDaysUntilYesterday.length - 1].accumulated_revenue 
      : 0;
    
    // Encontrar o faturamento acumulado até hoje (incluindo hoje)
    const todayTotalAccumulated = businessDays.length > 0 && businessDays[businessDays.length - 1].date === todayFormatted
      ? businessDays[businessDays.length - 1].accumulated_revenue
      : lastAccumulatedRevenue;
    
    // Dias úteis no mês (excluindo fins de semana e feriados)
    const totalBusinessDays = accumulatedRevenueData.filter(
      day => !day.is_weekend && !FERIADOS.includes(day.date)
    ).length;
    
    // Dias úteis já completados (excluindo hoje se necessário)
    const completedBusinessDays = excludeToday 
      ? businessDaysUntilYesterday.length
      : businessDays.length;
    
    // Dias úteis restantes (incluindo hoje se o excluímos dos já completados)
    const remainingBusinessDays = totalBusinessDays - completedBusinessDays;
    
    // Ao calcular com o dia de hoje excluído, usamos apenas o acumulado até ontem e
    // a média por dia útil baseada apenas nos dias úteis decorridos até ontem
    let avgPerBusinessDay;
    
    if (excludeToday) {
      // Se excluímos hoje, calculamos a média apenas com os dias úteis até ontem
      avgPerBusinessDay = businessDaysUntilYesterday.length > 0 
        ? lastAccumulatedRevenue / businessDaysUntilYesterday.length 
        : 0;
    } else {
      // Caso contrário, incluímos hoje na média
      avgPerBusinessDay = businessDays.length > 0 
        ? todayTotalAccumulated / businessDays.length 
        : 0;
    }
    
    // Faturamento acumulado a considerar (com ou sem hoje)
    const accumulatedToConsider = excludeToday ? lastAccumulatedRevenue : todayTotalAccumulated;
    
    // Projeção para o fim do mês: Faturado até agora + (média diária × dias úteis restantes)
    const projectedTotal = accumulatedToConsider + (avgPerBusinessDay * remainingBusinessDays);
    
    // Clone os dados originais
    const newData = [...accumulatedRevenueData].map(day => ({...day}));
    
    if (excludeToday) {
      // Projeção ajustada (sem considerar o dia atual)
      let adjustedForecast = lastAccumulatedRevenue;
      let remainingDays = remainingBusinessDays + 1; // +1 porque incluímos o dia de hoje nos restantes
      
      newData.forEach((day) => {
        // Para dias passados (antes de hoje), mantemos o valor acumulado real
        if (day.date < todayFormatted) {
          day.adjusted_forecast_revenue = day.accumulated_revenue;
        }
        // Para hoje e dias futuros, aplicamos a projeção
        else {
          // Se for dia útil (não for fim de semana e nem feriado), adicionamos a média diária
          if (!day.is_weekend && !FERIADOS.includes(day.date)) {
            if (day.date === todayFormatted) {
              // Para o dia atual, usamos o valor acumulado até ontem e adicionamos a média diária
              adjustedForecast += avgPerBusinessDay;
              day.adjusted_forecast_revenue = adjustedForecast;
            } else {
              // Para dias úteis futuros, incrementamos com a média diária
              adjustedForecast += avgPerBusinessDay;
              day.adjusted_forecast_revenue = adjustedForecast;
            }
          } 
          // Para fins de semana, mantemos o valor do último dia útil
          else {
            day.adjusted_forecast_revenue = adjustedForecast;
          }
        }
      });
      
      // Ajuste para o último dia do mês ter a projeção total correta
      const lastDay = newData[newData.length - 1];
      if (lastDay) {
        // Encontrar o último dia útil do mês (não fim de semana e não feriado)
        const lastBusinessDay = [...newData]
          .reverse()
          .find(day => !day.is_weekend && !FERIADOS.includes(day.date));
        
        if (lastBusinessDay) {
          lastBusinessDay.adjusted_forecast_revenue = projectedTotal;
          
          // Ajustar fins de semana e feriados que possam vir depois do último dia útil
          for (let i = newData.length - 1; i >= 0; i--) {
            if ((newData[i].is_weekend || FERIADOS.includes(newData[i].date)) && 
                newData[i].date > lastBusinessDay.date) {
              newData[i].adjusted_forecast_revenue = projectedTotal;
            } else if (newData[i].date === lastBusinessDay.date) {
              break;
            }
          }
        }
      }
    }
    
    return newData;
  }, [accumulatedRevenueData, excludeToday]);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          Projeção de Faturamento Acumulado
        </CardTitle>
        <Button 
          variant={excludeToday ? "default" : "outline"} 
          size="sm" 
          onClick={() => setExcludeToday(!excludeToday)}
          className="h-8 text-xs"
        >
          {excludeToday 
            ? "Considerando dia atual -1" 
            : "Considerar dia atual -1"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer
                config={{
                  accumulated_revenue: {
                    label: 'Faturado',
                    color: '#82ca9d'
                  },
                  accumulated_target: {
                    label: 'Meta',
                    color: '#8884d8'
                  },
                  forecast_revenue: {
                    label: 'Previsão',
                    color: '#FFBB28'
                  },
                  adjusted_forecast_revenue: {
                    label: 'Previsão Ajustada',
                    color: '#FF8042'
                  }
                }}
              >
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => {
                      // Parse the date in local timezone (without conversion issues)
                      const [year, month, day] = value.split('-').map(Number);
                      return day.toString().padStart(2, '0');
                    }}
                  />
                  <YAxis 
                    tickFormatter={(value) => 
                      new Intl.NumberFormat('pt-BR', {
                        notation: 'compact',
                        compactDisplay: 'short',
                        style: 'currency',
                        currency: 'BRL'
                      }).format(value)
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    formatter={(value) => {
                      if (value === 'accumulated_revenue') return 'Faturado';
                      if (value === 'accumulated_target') return 'Meta';
                      if (value === 'forecast_revenue') return 'Previsão';
                      if (value === 'adjusted_forecast_revenue') return 'Previsão Ajustada';
                      return value;
                    }}
                  />
                  {/* Renderizar as linhas na ordem correta para visualização */}
                  <Line 
                    type="monotone" 
                    dataKey="accumulated_revenue" 
                    stroke="#82ca9d" 
                    name="Faturado"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5, strokeWidth: 1 }}
                    isAnimationActive={false} // Desativar animação para debug
                    connectNulls={true} // Conectar pontos através de valores nulos
                  />
                  <Line 
                    type="monotone" 
                    dataKey="accumulated_target" 
                    stroke="#8884d8" 
                    name="Meta"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5, strokeWidth: 1 }}
                    isAnimationActive={false} // Desativar animação para debug
                  />
                  <Line 
                    type="monotone" 
                    dataKey="forecast_revenue" 
                    stroke="#FFBB28" 
                    name="Previsão"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5, strokeWidth: 1 }}
                    strokeDasharray="5 5"
                    isAnimationActive={false} // Desativar animação para debug
                  />
                  {excludeToday && (
                    <Line 
                      type="monotone" 
                      dataKey="adjusted_forecast_revenue" 
                      stroke="#FF8042" 
                      name="Previsão Ajustada"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 5, strokeWidth: 1 }}
                      strokeDasharray="5 5"
                      isAnimationActive={false} // Desativar animação para debug
                    />
                  )}
                </LineChart>
              </ChartContainer>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Nenhum dado disponível para o período selecionado</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 