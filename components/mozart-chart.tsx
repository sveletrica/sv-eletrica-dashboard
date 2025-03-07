"use client";
import React from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
const chartData = [
    { loja: "Mozart", totalEtiq: 2668, duplicadas: 134, bindSemStk: 78 },
];

const chartConfig = {
    totalEtiq: {
        label: "Total Etiq",
        color: "#26b226",
    },
    duplicadas: {
        label: "Duplicadas",
        color: "#FFA500",
    },
    bindSemStk: {
        label: "Bind Sem Stk",
        color: "#ce0f0f",
    },
} satisfies ChartConfig;

export default function MozartChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Distribuição de Etiquetas</CardTitle>
                <CardDescription>Loja Mozart Lucena</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                    <BarChart accessibilityLayer data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="loja"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 10)}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickCount={3}
                        />
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="totalEtiq" fill="var(--color-totalEtiq)" radius={10}>
                            <LabelList
                                position="top"
                                offset={12}
                                className="fill-foreground"
                                fontSize={12}
                            />
                        </Bar>
                        <Bar dataKey="duplicadas" fill="var(--color-duplicadas)" radius={10}>
                            <LabelList
                                position="top"
                                offset={12}
                                className="fill-foreground"
                                fontSize={12}
                            />
                        </Bar>
                        <Bar dataKey="bindSemStk" fill="var(--color-bindSemStk)" radius={10}>
                            <LabelList
                                position="top"
                                offset={12}
                                className="fill-foreground"
                                fontSize={12}
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
