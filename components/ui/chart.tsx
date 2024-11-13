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

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
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
    )
}