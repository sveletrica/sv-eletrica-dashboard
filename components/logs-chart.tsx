"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

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

interface LogsChartProps {
    logs: SQLImportLog[];
}

export default function LogsChart({ logs }: LogsChartProps) {
    const chartData = React.useMemo(() => {
        const userCounts = logs.reduce((acc, log) => {
            acc[log.user_name] = (acc[log.user_name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const colors = [
            "hsl(var(--chart-1))",
            "hsl(var(--chart-2))",
            "hsl(var(--chart-3))",
            "hsl(var(--chart-4))",
            "hsl(var(--chart-5))"
        ];

        return Object.entries(userCounts).map(([userName, count], index) => ({
            user: userName,
            imports: count,
            fill: colors[index % colors.length]
        }));
    }, [logs]);

    const totalImports = React.useMemo(() => {
        return logs.length;
    }, [logs]);

    const chartConfig = React.useMemo(() => {
        const config: ChartConfig = {
            imports: {
                label: "Importações",
            },
        };

        chartData.forEach((data, index) => {
            config[data.user] = {
                label: data.user,
                color: data.fill,
            };
        });

        return config;
    }, [chartData]);

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Estatísticas de Uso</CardTitle>
                <CardDescription>Importação de Orçamentos para análise</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="imports"
                            nameKey="user"
                            innerRadius={60}
                            strokeWidth={5}
                        >
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-3xl font-bold"
                                                >
                                                    {totalImports.toLocaleString()}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-muted-foreground"
                                                >
                                                    Importações
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
