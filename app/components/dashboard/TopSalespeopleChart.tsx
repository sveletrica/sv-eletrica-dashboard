import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "../../../components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface SalespersonData {
  name: string;
  value: number;
  margin: string;
  fill: string;
}

interface TopSalespeopleChartProps {
  topSalespeopleData: SalespersonData[];
  topSalespeopleChartConfig: Record<string, { label: string, color: string }>;
}

export function TopSalespeopleChart({ topSalespeopleData, topSalespeopleChartConfig }: TopSalespeopleChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Top 10 Vendedores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {topSalespeopleData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer
                config={topSalespeopleChartConfig}
                className="h-[300px]"
              >
                <BarChart
                  data={topSalespeopleData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number"
                    tickFormatter={(value) =>
                      new Intl.NumberFormat('pt-BR', {
                        notation: 'compact',
                        compactDisplay: 'short',
                        style: 'currency',
                        currency: 'BRL'
                      }).format(value)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => {
                          const formattedValue = new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(Number(value));

                          return [formattedValue];
                        }}
                      />
                    }
                  />
                  <Bar dataKey="value" fill="#2563eb" />
                </BarChart>
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