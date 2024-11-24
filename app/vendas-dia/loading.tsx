import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Vendas do Dia</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Skeleton className="h-10 w-full sm:w-[300px]" />
                        </div>

                        <div className="border rounded-lg">
                            <div className="border-b">
                                <div className="grid grid-cols-5 gap-4 p-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-6" />
                                    ))}
                                </div>
                            </div>

                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="border-b">
                                    <div className="grid grid-cols-5 gap-4 p-4">
                                        {[...Array(5)].map((_, j) => (
                                            <Skeleton key={j} className="h-4" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 