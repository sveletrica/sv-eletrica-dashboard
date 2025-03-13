import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "../../../components/ui/chart";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer, Tooltip } from 'recharts';

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
    const date = new Date(label);
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Projeção de Faturamento Acumulado
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          {accumulatedRevenueData.length > 0 ? (
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
                  }
                }}
              >
                <LineChart
                  data={accumulatedRevenueData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.getDate().toString().padStart(2, '0');
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
                      return value;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="accumulated_target" 
                    stroke="#8884d8" 
                    name="Meta"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5, strokeWidth: 1 }}
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
                  />
                  <Line 
                    type="monotone" 
                    dataKey="accumulated_revenue" 
                    stroke="#82ca9d" 
                    name="Faturado"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5, strokeWidth: 1 }}
                  />
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