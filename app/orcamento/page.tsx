'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Calculator, Info, Check, X } from 'lucide-react'
import Loading from '../vendas-dia/loading'
import { Roboto } from 'next/font/google'
import { useRouter } from 'next/navigation'
import { StockPopover } from "@/components/stock-popover"
import { cn } from "@/lib/utils"
import './styles.css'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const roboto = Roboto({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
})

interface QuotationItem {
    tipopedido: string
    dtemissao: string
    cdpedidodevenda: string
    nmpessoa: string
    cdproduto: string
    nmproduto: string
    qtpedida: number
    qtestoqueatualempresa: number
    qtcomprada: number
    vlprecovendainformado: number
    vlfaturamento: number
    nmrepresentantevenda: string
    vlprecocustoinformado: number
    nmcidade: string
    dsobservacaopedido: string
    nmempresacurtovenda: string
    vltotalcustoproduto: number
    dataextracao: string
}

interface StockData {
    QtEstoque_Empresa1?: number;
    QtEstoque_Empresa4?: number;
    QtEstoque_Empresa12?: number;
    QtEstoque_Empresa13?: number;
    QtEstoque_Empresa15?: number;
    QtEstoque_Empresa17?: number;
    QtEstoque_Empresa59?: number;
    StkTotal: number;
}

interface SaveSimulationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (notes: string) => Promise<void>
}

interface SavedSimulation {
  id: string
  cdpedidodevenda: string
  discounts: Record<string, number>
  created_at: string
  notes?: string
  created_by?: string
}

const getMarginStyle = (margin: number) => {
    if (margin > 5) {
        return "bg-gradient-to-br from-green-50 to-green-200 dark:from-green-900/20 dark:to-green-900/10"
    } else if (margin >= 0) {
        return "bg-gradient-to-br from-yellow-50 to-yellow-200 dark:from-yellow-900/20 dark:to-yellow-900/10"
    } else {
        return "bg-gradient-to-br from-red-50 to-red-200 dark:from-red-900/20 dark:to-red-900/10"
    }
}

interface QuotationDetailsProps {
    initialCode?: string
}

function SaveSimulationDialog({ open, onOpenChange, onSave }: SaveSimulationDialogProps) {
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(notes)
      onOpenChange(false)
      setNotes('')
    } catch (error) {
      console.error('Error saving simulation:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar Simulação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <Textarea
              placeholder="Adicione observações sobre esta simulação..."
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Salvando..." : "Salvar Simulação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function QuotationDetails({ initialCode }: QuotationDetailsProps = {}) {
    const router = useRouter()
    const [quotationCode, setQuotationCode] = useState(initialCode || '')
    const [data, setData] = useState<QuotationItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [simulatedDiscounts, setSimulatedDiscounts] = useState<Record<string, number>>({})
    const [isSimulating, setIsSimulating] = useState(false)
    const [globalDiscount, setGlobalDiscount] = useState<string>('')
    const [stockData, setStockData] = useState<Record<string, StockData>>({})
    const [loadingStock, setLoadingStock] = useState<Record<string, boolean>>({})
    const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)
    const [saveDialogOpen, setSaveDialogOpen] = useState(false)
    const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([])
    const [loadingSimulations, setLoadingSimulations] = useState(false)
    const [targetMargin, setTargetMargin] = useState<string>('')

    const calculateMargin = (revenue: number, cost: number) => {
        return ((revenue - (revenue * 0.268 + cost)) / revenue) * 100
    }

    const calculateDiscount = (listPrice: number, salePrice: number) => {
        return ((listPrice - salePrice) / listPrice) * 100
    }

    const calculateMarginWithDiscount = (listPrice: number, cost: number, discountPercentage: number) => {
        const priceAfterDiscount = listPrice * (1 - discountPercentage / 100)
        return ((priceAfterDiscount - (priceAfterDiscount * 0.268 + cost)) / priceAfterDiscount) * 100
    }

    const handleSimulatedDiscountChange = (productCode: string, discount: string) => {
        const numericDiscount = parseFloat(discount) || 0
        setSimulatedDiscounts(prev => ({
            ...prev,
            [productCode]: numericDiscount
        }))
    }

    const fetchQuotation = async () => {
        if (!quotationCode.trim()) return

        if (!initialCode) {
            router.push(`/orcamento/${quotationCode}`)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(
                `https://kinftxezwizaoyrcbfqc.supabase.co/rest/v1/pub_biorcamento_aux?cdpedidodevenda=eq.${quotationCode}`,
                {
                    headers: {
                        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
                    }
                }
            )

            if (!response.ok) {
                throw new Error('Failed to fetch quotation data')
            }

            const quotationData = await response.json()
            if (quotationData.length === 0) {
                setError('Nenhum orçamento encontrado com este código')
                setData([])
            } else {
                setData(quotationData)
            }
        } catch (err) {
            setError('Erro ao buscar dados do orçamento')
            console.error('Error fetching quotation:', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (initialCode) {
            fetchQuotation()
        }
    }, [initialCode])

    // Calculate totals including simulated values
    const totals = data.reduce((acc, item) => {
        const simulatedDiscount = simulatedDiscounts[item.cdproduto]
        const currentPrice = isSimulating && simulatedDiscount !== undefined
            ? item.vlprecovendainformado * (1 - simulatedDiscount / 100)
            : item.vlfaturamento

        return {
            faturamento: acc.faturamento + currentPrice,
            custo: acc.custo + item.vltotalcustoproduto,
            quantidade: acc.quantidade + item.qtpedida,
            precoLista: acc.precoLista + item.vlprecovendainformado
        }
    }, { faturamento: 0, custo: 0, quantidade: 0, precoLista: 0 })

    const marginTotal = data.length > 0 
        ? calculateMargin(totals.faturamento, totals.custo)
        : 0

    const discountTotal = data.length > 0
        ? calculateDiscount(totals.precoLista, totals.faturamento)
        : 0

    // Add function to apply global discount
    const applyGlobalDiscount = () => {
        const discount = parseFloat(globalDiscount)
        if (isNaN(discount)) return

        const newDiscounts: Record<string, number> = {}
        data.forEach(item => {
            newDiscounts[item.cdproduto] = discount
        })
        setSimulatedDiscounts(newDiscounts)
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            fetchQuotation()
        }
    }

    const handleDiscountKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            applyGlobalDiscount()
        }
    }

    const fetchStockData = async (cdproduto: string) => {
        try {
            setLoadingStock(prev => ({ ...prev, [cdproduto]: true }))
            const response = await fetch(`/api/produto/${cdproduto}`)
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch stock data')
            }
            const data = await response.json()
            
            if (data.stock && data.stock[0]) {
                const stockData = {
                    QtEstoque_Empresa1: data.stock[0].QtEstoque_Empresa1 || data.stock[0].qtestoque_empresa1 || 0,
                    QtEstoque_Empresa4: data.stock[0].QtEstoque_Empresa4 || data.stock[0].qtestoque_empresa4 || 0,
                    QtEstoque_Empresa12: data.stock[0].QtEstoque_Empresa12 || data.stock[0].qtestoque_empresa12 || 0,
                    QtEstoque_Empresa13: data.stock[0].QtEstoque_Empresa13 || data.stock[0].qtestoque_empresa13 || 0,
                    QtEstoque_Empresa15: data.stock[0].QtEstoque_Empresa15 || data.stock[0].qtestoque_empresa15 || 0,
                    QtEstoque_Empresa17: data.stock[0].QtEstoque_Empresa17 || data.stock[0].qtestoque_empresa17 || 0,
                    QtEstoque_Empresa59: data.stock[0].QtEstoque_Empresa59 || data.stock[0].qtestoque_empresa59 || 0,
                    StkTotal: data.stock[0].StkTotal || data.stock[0].sktotal || 
                        (data.stock[0].QtEstoque_Empresa1 || data.stock[0].qtestoque_empresa1 || 0) +
                        (data.stock[0].QtEstoque_Empresa4 || data.stock[0].qtestoque_empresa4 || 0) +
                        (data.stock[0].QtEstoque_Empresa12 || data.stock[0].qtestoque_empresa12 || 0) +
                        (data.stock[0].QtEstoque_Empresa13 || data.stock[0].qtestoque_empresa13 || 0) +
                        (data.stock[0].QtEstoque_Empresa15 || data.stock[0].qtestoque_empresa15 || 0) +
                        (data.stock[0].QtEstoque_Empresa17 || data.stock[0].qtestoque_empresa17 || 0) +
                        (data.stock[0].QtEstoque_Empresa59 || data.stock[0].qtestoque_empresa59 || 0)
                }
                setStockData(prev => ({
                    ...prev,
                    [cdproduto]: stockData
                }))
            }
        } catch (error) {
            console.error('Error fetching stock data:', error)
        } finally {
            setLoadingStock(prev => ({ ...prev, [cdproduto]: false }))
        }
    }

    // Add this function after other calculation functions
    const calculateDiscountForZeroMargin = (listPrice: number, cost: number) => {
        // We need to solve: (price * (1 - x) - (price * (1 - x) * 0.268 + cost)) / (price * (1 - x)) = 0
        // Where x is the discount percentage we want to find
        // Simplified: price * (1 - x) * (1 - 0.268) = cost
        // Therefore: x = 1 - (cost / (price * (1 - 0.268)))
        const taxRate = 0.268
        const discountDecimal = 1 - (cost / (listPrice * (1 - taxRate)))
        return Math.max(Math.min(discountDecimal * 100, 100), 0) // Ensure discount is between 0 and 100
    }

    // Add this function to handle setting zero margin discounts
    const applyZeroMarginDiscounts = () => {
        const newDiscounts: Record<string, number> = {}
        data.forEach(item => {
            const zeroMarginDiscount = calculateDiscountForZeroMargin(
                item.vlprecovendainformado,
                item.vltotalcustoproduto
            )
            newDiscounts[item.cdproduto] = parseFloat(zeroMarginDiscount.toFixed(2))
        })
        setSimulatedDiscounts(newDiscounts)
    }

    const calculateDiscountForTargetMargin = (listPrice: number, cost: number, targetMarginPercent: number) => {
        // We need to solve: (price * (1 - x) - (price * (1 - x) * 0.268 + cost)) / (price * (1 - x)) = targetMargin/100
        // Where x is the discount percentage we want to find
        // Simplified: price * (1 - x) * (1 - 0.268) - cost = price * (1 - x) * (targetMargin/100)
        // Therefore: price * (1 - x) * (1 - 0.268 - targetMargin/100) = cost
        // x = 1 - (cost / (price * (1 - 0.268 - targetMargin/100)))
        const taxRate = 0.268
        const discountDecimal = 1 - (cost / (listPrice * (1 - taxRate - targetMarginPercent/100)))
        return Math.max(Math.min(discountDecimal * 100, 100), 0) // Ensure discount is between 0 and 100
    }

    // Add this function to handle applying target margin discounts
    const applyTargetMarginDiscounts = () => {
        const marginValue = parseFloat(targetMargin)
        if (isNaN(marginValue)) return

        const newDiscounts: Record<string, number> = {}
        data.forEach(item => {
            const targetMarginDiscount = calculateDiscountForTargetMargin(
                item.vlprecovendainformado,
                item.vltotalcustoproduto,
                marginValue
            )
            newDiscounts[item.cdproduto] = parseFloat(targetMarginDiscount.toFixed(2))
        })
        setSimulatedDiscounts(newDiscounts)
    }

    const saveSimulation = async (notes: string) => {
        try {
            const response = await fetch('/api/simulations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cdpedidodevenda: quotationCode,
                    discounts: simulatedDiscounts,
                    notes,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save simulation')
            }

            toast.success('Simulação salva com sucesso!')
            loadSavedSimulations()
        } catch (error) {
            console.error('Error saving simulation:', error)
            toast.error(error instanceof Error ? error.message : 'Erro ao salvar simulação')
        }
    }

    const loadSavedSimulations = async () => {
        if (!quotationCode) return

        setLoadingSimulations(true)
        try {
            const response = await fetch(`/api/simulations/${quotationCode}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load simulations')
            }

            setSavedSimulations(data)
        } catch (error) {
            console.error('Error loading simulations:', error)
            toast.error(error instanceof Error ? error.message : 'Erro ao carregar simulações salvas')
        } finally {
            setLoadingSimulations(false)
        }
    }

    useEffect(() => {
        if (initialCode) {
            loadSavedSimulations()
        }
    }, [initialCode])

    const deleteSimulation = async (simulationId: string) => {
        try {
            const response = await fetch(
                `/api/simulations/${quotationCode}?id=${simulationId}`,
                {
                    method: 'DELETE',
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete simulation')
            }

            toast.success('Simulação excluída com sucesso!')
            loadSavedSimulations()
        } catch (error) {
            console.error('Error deleting simulation:', error)
            toast.error(error instanceof Error ? error.message : 'Erro ao excluir simulação')
        }
    }

    if (isLoading) return <Loading />

    if (!initialCode && data.length === 0) {
        return (
            <div className="h-[80vh] flex items-center justify-center">
                <Card className="w-full max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-center text-2xl font-bold">
                            Consulta de Orçamentos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-full max-w-md">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Digite o código do orçamento"
                                        value={quotationCode}
                                        onChange={(e) => setQuotationCode(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                    />
                                    <Button onClick={fetchQuotation}>
                                        <Search className="h-4 w-4 mr-2" />
                                        Buscar
                                    </Button>
                                </div>
                            </div>
                            
                            {error && (
                                <p className="text-center text-red-500 text-sm">{error}</p>
                            )}
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Info className="h-5 w-5" />
                                <h3 className="font-semibold">O que você encontrará aqui:</h3>
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>• Detalhes completos do orçamento</li>
                                <li>• Informações do cliente e localização</li>
                                <li>• Lista detalhada de produtos</li>
                                <li>• Preços, descontos e margens</li>
                                <li>• Simulador de descontos</li>
                            </ul>
                            
                            <div className="text-sm text-muted-foreground mt-4">
                                <p className="font-medium">Como usar:</p>
                                <p>1. Digite o código do orçamento no campo acima</p>
                                <p>2. Clique em "Buscar" ou pressione Enter</p>
                                <p>3. Analise os dados e utilize o simulador de descontos se necessário</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <Input
                    placeholder="Digite o código do orçamento"
                    value={quotationCode}
                    onChange={(e) => setQuotationCode(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="max-w-sm"
                />
                <Button onClick={fetchQuotation}>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                </Button>
                {data.length > 0 && (
                    <Button
                        variant={isSimulating ? "secondary" : "outline"}
                        onClick={() => {
                            setIsSimulating(!isSimulating)
                            if (!isSimulating) {
                                setGlobalDiscount('')
                                setSimulatedDiscounts({})
                            }
                        }}
                    >
                        <Calculator className="h-4 w-4 mr-2" />
                        {isSimulating ? "Cancelar Simulação" : "Simular Desconto"}
                    </Button>
                )}
            </div>

            {isSimulating && data.length > 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Global Discount Section */}
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Aplicar desconto em todos os itens
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={globalDiscount}
                                            onChange={(e) => setGlobalDiscount(e.target.value)}
                                            placeholder="Digite o desconto %"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    applyGlobalDiscount()
                                                }
                                            }}
                                        />
                                        <Button 
                                            onClick={applyGlobalDiscount}
                                            disabled={!globalDiscount}
                                        >
                                            Aplicar
                                        </Button>
                                    </div>
                                </div>

                                {/* Target Margin Section */}
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Definir margem alvo
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={targetMargin}
                                            onChange={(e) => setTargetMargin(e.target.value)}
                                            placeholder="Digite a margem %"
                                            min="-100"
                                            max="100"
                                            step="0.1"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    applyTargetMarginDiscounts()
                                                }
                                            }}
                                        />
                                        <Button 
                                            onClick={applyTargetMarginDiscounts}
                                            disabled={!targetMargin}
                                        >
                                            Aplicar
                                        </Button>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-end gap-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => {
                                            setSimulatedDiscounts({})
                                            setGlobalDiscount('')
                                            setTargetMargin('')
                                        }}
                                    >
                                        Limpar Simulação
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={applyZeroMarginDiscounts}
                                    >
                                        Margem Zero
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setSaveDialogOpen(true)}
                                        disabled={Object.keys(simulatedDiscounts).length === 0}
                                    >
                                        Salvar Simulação
                                    </Button>
                                </div>
                            </div>

                            {/* Saved Simulations Section */}
                            {savedSimulations.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-sm font-medium mb-2">Simulações Salvas:</h3>
                                    <ScrollArea className="h-[100px]">
                                        <div className="space-y-2">
                                            {savedSimulations.map((sim) => (
                                                <div
                                                    key={sim.id}
                                                    className="flex items-center justify-between p-2 rounded border"
                                                >
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">
                                                            {new Date(sim.created_at).toLocaleString()}
                                                        </p>
                                                        {sim.notes && (
                                                            <p className="text-sm text-muted-foreground">{sim.notes}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSimulatedDiscounts(sim.discounts)}
                                                        >
                                                            Aplicar
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => {
                                                                if (window.confirm('Tem certeza que deseja excluir esta simulação?')) {
                                                                    deleteSimulation(sim.id)
                                                                }
                                                            }}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {error && (
                <Card>
                    <CardContent className="p-6">
                        <p className="text-center text-red-500">{error}</p>
                    </CardContent>
                </Card>
            )}

            {data.length > 0 && (
                <>
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-bold">
                                    Informações do Orçamento
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <p className="text-xs"><span className="font-bold">Data:</span> {data[0].dtemissao}</p>
                                    <p className="text-xs"><span className="font-bold">Código:</span> {data[0].cdpedidodevenda}</p>
                                    <p className="text-xs"><span className="font-bold">Observação:</span> {data[0].dsobservacaopedido}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-bold">
                                    Cliente e Localização
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <p className="text-xs"><span className="font-bold">Cliente:</span> {data[0].nmpessoa}</p>
                                    <p className="text-xs"><span className="font-bold">Cidade:</span> {data[0].nmcidade}</p>
                                    <p className="text-xs"><span className="font-bold">Filial:</span> {data[0].nmempresacurtovenda}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-bold">
                                    Preços
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <p>
                                        <span className="font-medium">Preço Lista:</span>{' '}
                                        {totals.precoLista.toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        })}
                                    </p>
                                    <p>
                                        <span className="font-medium">Faturamento:</span>{' '}
                                        {totals.faturamento.toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        })}
                                    </p>
                                    <p>
                                        <span className="font-medium">Desconto Total:</span>{' '}
                                        {discountTotal.toFixed(2)}%
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={getMarginStyle(marginTotal)}>
                            <CardHeader>
                                <CardTitle className="text-sm font-bold">
                                    Totais
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p>
                                        <span className="font-medium">Quantidade:</span>{' '}
                                        {totals.quantidade}
                                    </p>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Margem
                                        </p>
                                        <p className={`text-4xl font-bold ${
                                            marginTotal >= 5
                                                ? 'text-green-600 dark:text-green-400'
                                                : marginTotal >= 0
                                                    ? 'text-yellow-600 dark:text-yellow-400'
                                                    : 'text-red-600 dark:text-red-400'
                                        }`}>
                                            {marginTotal.toFixed(2)}%
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Produtos do Orçamento</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative rounded-md border">
                                <div className="max-h-[600px] overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Código</TableHead>
                                                <TableHead>Produto</TableHead>
                                                <TableHead className="text-right">Estoque</TableHead>
                                                <TableHead className="text-right">Comprado</TableHead>
                                                <TableHead className="text-right">Qtd</TableHead>
                                                <TableHead className="text-right">Preço Lista</TableHead>
                                                <TableHead className="text-right">Desconto</TableHead>
                                                <TableHead className="text-right">Preço Final</TableHead>
                                                <TableHead className="text-right">Custo</TableHead>
                                                <TableHead className="text-right">Margem</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className={roboto.className}>
                                            {data.map((item, index) => {
                                                const currentDiscount = calculateDiscount(
                                                    item.vlprecovendainformado,
                                                    item.vlfaturamento
                                                )
                                                const simulatedDiscount = simulatedDiscounts[item.cdproduto]
                                                const margin = isSimulating && simulatedDiscount !== undefined
                                                    ? calculateMarginWithDiscount(
                                                        item.vlprecovendainformado,
                                                        item.vltotalcustoproduto,
                                                        simulatedDiscount
                                                    )
                                                    : calculateMargin(item.vlfaturamento, item.vltotalcustoproduto)
                                                
                                                const simulatedPrice = isSimulating && simulatedDiscount !== undefined
                                                    ? item.vlprecovendainformado * (1 - simulatedDiscount / 100)
                                                    : item.vlfaturamento

                                                return (
                                                    <TableRow 
                                                        key={index}
                                                        className={cn(
                                                            "transition-colors",
                                                            margin < -0.01 && "animate-pulseRow bg-red-500/50"
                                                        )}
                                                    >
                                                        <TableCell>{item.cdproduto}</TableCell>
                                                        <TableCell>{item.nmproduto}</TableCell>
                                                        <TableCell className="text-right">
                                                            <StockPopover 
                                                                stockData={stockData[item.cdproduto] || null}
                                                                open={openPopoverId === item.cdproduto}
                                                                onOpenChange={(open) => {
                                                                    setOpenPopoverId(open ? item.cdproduto : null)
                                                                    if (open && !stockData[item.cdproduto] && !loadingStock[item.cdproduto]) {
                                                                        fetchStockData(item.cdproduto)
                                                                    }
                                                                }}
                                                                loading={loadingStock[item.cdproduto]}
                                                            >
                                                                <button 
                                                                    className="cursor-pointer hover:underline"
                                                                    type="button"
                                                                >
                                                                    {stockData[item.cdproduto]?.StkTotal || item.qtestoqueatualempresa}
                                                                </button>
                                                            </StockPopover>
                                                        </TableCell>
                                                        <TableCell className="text-right">{item.qtcomprada}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {item.qtpedida}
                                                                {(stockData[item.cdproduto]?.StkTotal || item.qtestoqueatualempresa) >= item.qtpedida ? (
                                                                    <Check className="h-4 w-4 text-green-500" />
                                                                ) : (
                                                                    <X className="h-4 w-4 text-red-500" />
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {item.vlprecovendainformado.toLocaleString('pt-BR', {
                                                                style: 'currency',
                                                                currency: 'BRL'
                                                            })}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {isSimulating ? (
                                                                <Input
                                                                    type="number"
                                                                    value={simulatedDiscounts[item.cdproduto] ?? currentDiscount.toFixed(2)}
                                                                    onChange={(e) => handleSimulatedDiscountChange(item.cdproduto, e.target.value)}
                                                                    className="w-20 text-right"
                                                                    min="0"
                                                                    max="100"
                                                                    step="0.1"
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault()
                                                                            const discount = parseFloat(e.currentTarget.value)
                                                                            if (!isNaN(discount)) {
                                                                                handleSimulatedDiscountChange(item.cdproduto, e.currentTarget.value)
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            ) : (
                                                                `${currentDiscount.toFixed(2)}%`
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {simulatedPrice.toLocaleString('pt-BR', {
                                                                style: 'currency',
                                                                currency: 'BRL'
                                                            })}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {item.vltotalcustoproduto.toLocaleString('pt-BR', {
                                                                style: 'currency',
                                                                currency: 'BRL'
                                                            })}
                                                        </TableCell>
                                                        <TableCell className={`text-right ${
                                                            margin >= 0 
                                                                ? 'text-green-600 dark:text-green-400' 
                                                                : 'text-red-600 dark:text-red-400'
                                                        }`}>
                                                            {margin.toFixed(2)}%
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            <SaveSimulationDialog
                open={saveDialogOpen}
                onOpenChange={setSaveDialogOpen}
                onSave={saveSimulation}
            />
        </div>
    )
} 