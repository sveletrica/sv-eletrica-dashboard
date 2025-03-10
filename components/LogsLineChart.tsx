import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { subDays, format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SQLImportLog {
    id: string;
    user_id: string;
    user_name: string;
    order_number: string;
    timestamp: string;
    created_at: string;
}

interface LogsLineChartProps {
    logs: SQLImportLog[];
}

export default function LogsLineChart({ logs }: LogsLineChartProps) {
    // Get the current date and the date 10 days ago
    const today = new Date();
    const tenDaysAgo = subDays(today, 9);

    // Create an array of the last 10 days
    const last10Days = Array.from({ length: 10 }, (_, i) => {
        const date = subDays(today, i);
        return {
            date,
            formattedDate: format(date, 'dd/MM', { locale: ptBR }),
            count: 0,
        };
    }).reverse();

    // Count logs for each day
    logs.forEach(log => {
        const logDate = new Date(log.timestamp);

        // Check if the log is within the last 10 days
        if (isWithinInterval(logDate, { start: tenDaysAgo, end: today })) {
            // Find the corresponding day in our array
            const dayIndex = last10Days.findIndex(day =>
                isWithinInterval(logDate, {
                    start: startOfDay(day.date),
                    end: endOfDay(day.date)
                })
            );

            if (dayIndex !== -1) {
                last10Days[dayIndex].count += 1;
            }
        }
    });

    // Calculate trend line data
    const calculateTrendLine = (data: any[]) => {
        const n = data.length;
        if (n <= 1) return data.map(item => ({ ...item, trend: item.count }));

        // Calculate the sum of x, y, xy, and x^2
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        data.forEach((item, index) => {
            sumX += index;
            sumY += item.count;
            sumXY += index * item.count;
            sumXX += index * index;
        });

        // Calculate the slope and y-intercept
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate the trend line values
        return data.map((item, index) => ({
            ...item,
            trend: Math.max(0, Math.round(intercept + slope * index))
        }));
    };

    const chartData = calculateTrendLine(last10Days);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Uso Diário (Últimos 10 dias)</CardTitle>
                <CardDescription>
                    Quantidade de importações SQL por dia com linha de tendência
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="formattedDate"
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                                formatter={(value: number, name: string) => {
                                    if (name === "count") {
                                        return [`${value} importações`, 'Importações'];
                                    }
                                    if (name === "trend") {
                                        return [`${value} importações`, 'Tendência'];
                                    }
                                    return [value, name];
                                }}
                                labelFormatter={(label) => `Data: ${label}`}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                name="Importações"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="trend"
                                name="Tendência"
                                stroke="#ef4444"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
} 