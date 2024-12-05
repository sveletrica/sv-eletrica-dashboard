import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StockData {
    QtEstoque_Empresa1?: number
    QtEstoque_Empresa4?: number
    QtEstoque_Empresa12?: number
    QtEstoque_Empresa13?: number
    QtEstoque_Empresa15?: number
    QtEstoque_Empresa17?: number
    QtEstoque_Empresa59?: number
    StkTotal: number
}

const companyNames: Record<string, string> = {
    'QtEstoque_Empresa1': 'Matriz',
    'QtEstoque_Empresa4': 'Filial 4',
    'QtEstoque_Empresa12': 'Filial 12',
    'QtEstoque_Empresa13': 'Filial 13',
    'QtEstoque_Empresa15': 'Filial 15',
    'QtEstoque_Empresa17': 'Filial 17',
    'QtEstoque_Empresa59': 'Filial 59',
}

export function ProductStockCard({ stockData }: { stockData: StockData }) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Estoque por Empresa</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(stockData)
                        .filter(([key]) => key.startsWith('QtEstoque_'))
                        .map(([key, value]) => (
                            <div key={key} className="flex flex-col">
                                <span className="text-sm font-medium">{companyNames[key]}</span>
                                <span className="text-2xl font-bold">{value}</span>
                            </div>
                        ))}
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Total</span>
                        <span className="text-2xl font-bold text-primary">{stockData.StkTotal}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
} 