'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'
import { useState } from 'react'

type ChartProps = {
    data: any[]
    config: Record<string, { 
        label: string
        color: string
        showValue?: boolean
        useLogScale?: boolean
    }>
}

export function Chart({ data, config }: ChartProps) {
    const [activeBar, setActiveBar] = useState<string>(Object.keys(config)[0])

    const maxValue = Math.max(
        ...data.flatMap(item => 
            Object.keys(config).map(key => Number(item[key]) || 0)
        )
    )

    const yAxisMax = Math.ceil(maxValue / 500) * 500

    const yAxisTicks = Array.from(
        { length: (yAxisMax / 500) + 1 },
        (_, i) => i * 500
    )

    return (
        <div className="w-full h-[250px] md:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    domain={[0, yAxisMax]}
                    ticks={yAxisTicks}
                />
                <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null

                        const activePayload = payload.find(p => p.dataKey === activeBar)
                        if (!activePayload) return null

                        const configItem = config[activePayload.dataKey as string]
                        const value = activePayload.value !== undefined 
                            ? (configItem.useLogScale 
                                ? Math.pow(10, Number(activePayload.value))
                                : Number(activePayload.value)
                            )
                            : 0

                        return (
                            <Card className="w-64 shadow-lg">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">{label}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center">
                                            <div
                                                className="w-3 h-3 rounded-full mr-2"
                                                style={{ backgroundColor: configItem.color }}
                                            />
                                            <span className="text-sm font-medium">
                                                {configItem.label}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold">
                                            {value.toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    }}
                />
                <Legend 
                    formatter={(value) => {
                        const labelMap: Record<string, string> = {
                            totalTagged: "Total",
                            tagsUsedTwice: "Duplicadas",
                            taggedNoStock: "Sem Estoque"
                        }
                        return labelMap[value] || value
                    }}
                    wrapperStyle={{ 
                        paddingBottom: '20px',
                        fontSize: '0.75rem',
                        lineHeight: '1rem'
                    }}
                    align="right"
                    verticalAlign="top"
                    iconSize={8}
                    iconType="circle"
                />
                {Object.entries(config).map(([key, { color, showValue }]) => (
                    <Bar
                        key={key}
                        dataKey={key}
                        fill={color}
                        radius={[4, 4, 0, 0]}
                        onMouseEnter={() => setActiveBar(key)}
                        label={showValue ? {
                            position: 'top',
                            formatter: (value: number) => {
                                const finalValue = config[key].useLogScale 
                                    ? Math.pow(10, value)
                                    : value
                                return finalValue.toLocaleString('pt-BR')
                            }
                        } : false}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
        </div>
    )
}