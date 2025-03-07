"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "../components/ui/chart";

interface SQLImportLog {
    id: string;
    user_id: string;
    user_name: string;
    order_number: string;
    timestamp: string;
    created_at: string;
}

interface LogsBarProps {
    logs: SQLImportLog[];
}

export default function LogsBar({ logs }: LogsBarProps) {
    const { chartData, chartConfig } = React.useMemo(() => {
        // Group logs by month and user
        const monthlyData = logs.reduce((acc, log) => {
            const date = new Date(log.timestamp);
            const monthKey = format(date, 'yyyy-MM');

            if (!acc[monthKey]) {
                acc[monthKey] = {
                    month: format(date, 'MMMM', { locale: ptBR }),
                    monthKey: monthKey,
                    users: {}
                };
            }

            if (!acc[monthKey].users[log.user_name]) {
                acc[monthKey].users[log.user_name] = 0;
            }

            acc[monthKey].users[log.user_name]++;
            return acc;
        }, {} as Record<string, { month: string; monthKey: string; users: Record<string, number> }>);

        // Get unique users
        const uniqueUsers = Array.from(new Set(logs.map(log => log.user_name)));

        // Create chart config with colors
        const colors = [
            "hsl(var(--chart-1))",
            "hsl(var(--chart-2))",
            "hsl(var(--chart-3))",
            "hsl(var(--chart-4))",
            "hsl(var(--chart-5))"
        ];

        const config: ChartConfig = {};
        uniqueUsers.forEach((user, index) => {
            config[user] = {
                label: user,
                color: colors[index % colors.length],
            };
        });

        // Transform data for chart
        const data = Object.values(monthlyData)
            .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
            .map(monthData => ({
                month: monthData.month,
                ...monthData.users
            }));

        return {
            chartData: data,
            chartConfig: config
        };
    }, [logs]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Dados mensais</CardTitle>
                <CardDescription>Uso Mensal por Usuário</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer config={chartConfig} className="mx-auto aspect-[2/1] max-h-[225px]">
                    <BarChart data={chartData}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            fontSize={12}
                        />
                        <YAxis
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            fontSize={12}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        {Object.keys(chartConfig).map((user, index) => (
                            <Bar
                                key={user}
                                dataKey={user}
                                stackId="a"
                                fill={chartConfig[user].color}
                                radius={[4, 4, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
