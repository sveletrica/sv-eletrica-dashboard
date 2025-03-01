import { formatStockNumber } from "@/lib/utils"
import { Card } from "./ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"

interface StockData {
    QtEstoque_Empresa1?: number;
    QtEstoque_Empresa4?: number;
    QtEstoque_Empresa12?: number;
    QtEstoque_Empresa13?: number;
    QtEstoque_Empresa15?: number;
    QtEstoque_Empresa17?: number;
    QtEstoque_Empresa20?: number;
    QtEstoque_Empresa59?: number;
    StkTotal: number;
}

interface StockPopoverProps {
    stockData: StockData | null;
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    loading?: boolean;
}

export function StockPopover({ 
    stockData, 
    children, 
    open, 
    onOpenChange,
    loading = false
}: StockPopoverProps) {
    return (
        <Popover 
            open={open} 
            onOpenChange={onOpenChange}
        >
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-2 p-6">
                    <h4 className="font-medium">Estoque por Filial</h4>
                    {loading ? (
                        <div className="space-y-2">
                            <div className="animate-pulse space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div className="h-4 bg-muted rounded w-20" />
                                            <div className="h-4 bg-muted rounded w-12" />
                                        </div>
                                        <div className="h-2 bg-muted rounded w-full" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : stockData ? (
                        <>
                            <div className="grid gap-2">
                                {Object.entries(stockData || {})
                                    .filter(([key]) => key.startsWith('QtEstoque_'))
                                    .sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))
                                    .map(([key, value]) => {
                                        if (!value || value === 0) return null;
                                        const filialNumber = key.replace('QtEstoque_Empresa', '');
                                        const percentage = ((value as number) / stockData.StkTotal) * 100;
                                        
                                        return (
                                            <div key={key} className="relative">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium">
                                                        {filialNumber === '1' ? 'Matriz' :
                                                         filialNumber === '4' ? 'CD' :
                                                         filialNumber === '12' ? 'Express BM' :
                                                         filialNumber === '13' ? 'Express Maracanau' :
                                                         filialNumber === '15' ? 'Juazeiro' :
                                                         filialNumber === '17' ? 'Express Sobral' :
                                                         filialNumber === '20' ? 'Express Mozart' :
                                                         filialNumber === '59' ? 'Express WS' :
                                                         `Filial ${filialNumber}`}
                                                    </span>
                                                    <span>{formatStockNumber(value as number)} un</span>
                                                </div>
                                                <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-primary transition-all duration-500 ease-in-out"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                            <div className="pt-2 border-t mt-2">
                                <div className="flex justify-between items-center font-medium">
                                    <span>Total</span>
                                    <span>{formatStockNumber(stockData.StkTotal)} un</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="py-4 text-center text-muted-foreground">
                            Nenhum dado de estoque disponível
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
} 