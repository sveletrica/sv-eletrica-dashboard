'use client'
import { PermissionGuard } from '@/components/guards/permission-guard'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Calculator, Info, Check, X, Copy, Share2 } from 'lucide-react'
import Loading from './loading'
import { Roboto } from 'next/font/google'
import { useRouter } from 'next/navigation'
import { StockPopover } from "@/components/stock-popover"
import { cn } from "@/lib/utils"
import './styles.css'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { CountdownTimer, TIMER_CONFIG } from "@/components/countdown-timer"
import { useAuth } from '@/components/providers/auth-provider'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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
    nmgrupoproduto: string
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
  onSave: (notes: string) => Promise<{ shareUrl?: string } | void>
}

interface SavedSimulation {
  id: string
  cdpedidodevenda: string
  discounts: Record<string, number>
  created_at: string
  notes?: string
  created_by_email?: string
  share_id?: string
  shareUrl?: string
}

interface DataExtractionInfo {
    dataextracao: string;
}

interface QuotationSummary {
    dtemissao: string
    data_ordenacao: string
    cdpedidodevenda: string
    nmempresacurtovenda: string
    nmpessoa: string
    nmrepresentantevenda: string
    qtd_produtos: number
    total_preco_venda: number
    total_faturamento: number
    total_preco_custo: number
    total_custo_produto: number
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
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await onSave(notes)
      if (result?.shareUrl) {
        setShareUrl(result.shareUrl)
      }
    } catch (error) {
      console.error('Error saving simulation:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const copyShareUrl = async () => {
    if (shareUrl) {
      const fullUrl = `${window.location.origin}${shareUrl}`
      await navigator.clipboard.writeText(fullUrl)
      toast.success('Link copiado para a área de transferência!')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        setShareUrl(null)
        setNotes('')
      }
      onOpenChange(newOpen)
    }}>
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
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {shareUrl && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Link para compartilhar</label>
              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}${shareUrl}`}
                  readOnly
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyShareUrl}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Fechar
          </Button>
          {!shareUrl && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar Simulação"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Keep the interfaces outside
interface GroupTotals {
    precoLista: number
    precoFinal: number
    custo: number
    quantidade: number
}

const formatBrazilianDate = (dateStr: string) => {
    // Se já estiver no formato dd/mm/aaaa, retorna direto
    if (dateStr.includes('/')) {
        return dateStr
    }
    
    // Se não, tenta converter
    try {
        const [day, month, year] = dateStr.split('/')
        return `${day}/${month}/${year}`
    } catch (error) {
        return dateStr // Em caso de erro, retorna a string original
    }
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
    const [groupDiscounts, setGroupDiscounts] = useState<Record<string, number>>({})
    const [showGroupDiscounts, setShowGroupDiscounts] = useState(false)
    const [lastExtraction, setLastExtraction] = useState<string | null>(null)
    const [timeLeftMinutes, setTimeLeftMinutes] = useState<number | null>(null)
    const [targetValue, setTargetValue] = useState<string>('')
    const [recentQuotations, setRecentQuotations] = useState<QuotationSummary[]>([])
    const [loadingRecent, setLoadingRecent] = useState(false)
    const [selectedBranch, setSelectedBranch] = useState<string>('all')
    const [selectedSeller, setSelectedSeller] = useState<string>('all')
    const { user } = useAuth()

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
                `https://kinftxezwizaoyrcbfqc.supabase.co/rest/v1/vw_biorcamento_aux?cdpedidodevenda=eq.${quotationCode}`,
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
    const updateDiscountsAndGroupDiscounts = (newDiscounts: Record<string, number>) => {
        setSimulatedDiscounts(newDiscounts)
        
        // Calculate and update group discounts
        const newGroupDiscounts: Record<string, number> = {}
        getUniqueProductGroups().forEach(group => {
            const groupProducts = data.filter(item => item.nmgrupoproduto === group)
            const groupDiscount = groupProducts.reduce((sum, item) => {
                return sum + (newDiscounts[item.cdproduto] || 0)
            }, 0) / groupProducts.length
            
            newGroupDiscounts[group] = parseFloat(groupDiscount.toFixed(2))
        })
        
        setGroupDiscounts(newGroupDiscounts)
    }

    const applyGlobalDiscount = () => {
        const discount = parseFloat(globalDiscount)
        if (isNaN(discount)) return

        const newDiscounts: Record<string, number> = {}
        data.forEach(item => {
            newDiscounts[item.cdproduto] = discount
        })
        updateDiscountsAndGroupDiscounts(newDiscounts)
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

    // Update the applyZeroMarginDiscounts function
    const applyZeroMarginDiscounts = () => {
        const newDiscounts: Record<string, number> = {}
        data.forEach(item => {
            const zeroMarginDiscount = calculateDiscountForZeroMargin(
                item.vlprecovendainformado,
                item.vltotalcustoproduto
            )
            newDiscounts[item.cdproduto] = parseFloat(zeroMarginDiscount.toFixed(2))
        })
        updateDiscountsAndGroupDiscounts(newDiscounts)
    }

    const calculateDiscountForTargetMargin = (listPrice: number, cost: number, targetMarginPercent: number) => {
        // We need to solve: (price * (1 - x) - (price * (1 - x) * 0.268 + cost)) / (price * (1 - x)) = targetMargin/100
        // Where x is the discount percentage we want to find
        // Simplified: price * (1 - x) * (1 - 0.268 - targetMargin/100) = cost
        // Therefore: price * (1 - x) * (1 - 0.268 - targetMargin/100) = cost
        // x = 1 - (cost / (price * (1 - 0.268 - targetMargin/100)))
        const taxRate = 0.268
        const discountDecimal = 1 - (cost / (listPrice * (1 - taxRate - targetMarginPercent/100)))
        return Math.max(Math.min(discountDecimal * 100, 100), 0) // Ensure discount is between 0 and 100
    }

    // Update the applyTargetMarginDiscounts function
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
        updateDiscountsAndGroupDiscounts(newDiscounts)
    }

    const applyTargetValue = () => {
        const desiredTotal = parseFloat(targetValue)
        if (isNaN(desiredTotal) || desiredTotal <= 0) return

        const currentTotal = totals.precoLista
        const globalDiscountNeeded = ((currentTotal - desiredTotal) / currentTotal) * 100

        // Removendo a limitação de 0 a 100 para permitir acréscimos (descontos negativos)
        const newDiscounts: Record<string, number> = {}
        data.forEach(item => {
            newDiscounts[item.cdproduto] = parseFloat(globalDiscountNeeded.toFixed(2))
        })
        updateDiscountsAndGroupDiscounts(newDiscounts)
    }

    const saveSimulation = async (notes: string) => {
        if (!user?.email) {
            console.error('No user email available:', user)
            toast.error('Erro: Email do usuário não encontrado')
            return
        }

        try {
            console.log('Saving simulation with user:', user) // Debug log
            
            const response = await fetch('/api/simulations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cdpedidodevenda: quotationCode,
                    discounts: simulatedDiscounts,
                    notes,
                    created_by_email: user.email,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save simulation')
            }

            toast.success('Simulação salva com sucesso!')
            loadSavedSimulations()
            return data
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

    const getUniqueProductGroups = () => {
        const groups = new Set(data.map(item => item.nmgrupoproduto))
        return Array.from(groups).sort()
    }

    const applyGroupDiscount = (group: string, discount: number) => {
        const newDiscounts = { ...simulatedDiscounts }
        data.forEach(item => {
            if (item.nmgrupoproduto === group) {
                newDiscounts[item.cdproduto] = discount
            }
        })
        updateDiscountsAndGroupDiscounts(newDiscounts)
    }

    // Update the clearSimulation function to ensure group discounts are cleared
    const clearSimulation = () => {
        updateDiscountsAndGroupDiscounts({})
        setGlobalDiscount('')
        setTargetMargin('')
        setTargetValue('')
    }

    // Move calculateGroupTotals inside the component
    const calculateGroupTotals = () => {
        const groupTotals: Record<string, GroupTotals> = {}
        
        data.forEach((item: QuotationItem) => {
            const group = item.nmgrupoproduto
            const simulatedDiscount = simulatedDiscounts[item.cdproduto]
            const currentPrice = isSimulating && simulatedDiscount !== undefined
                ? item.vlprecovendainformado * (1 - simulatedDiscount / 100)
                : item.vlfaturamento

            if (!groupTotals[group]) {
                groupTotals[group] = {
                    precoLista: 0,
                    precoFinal: 0,
                    custo: 0,
                    quantidade: 0
                }
            }

            groupTotals[group].precoLista += item.vlprecovendainformado
            groupTotals[group].precoFinal += currentPrice
            groupTotals[group].custo += item.vltotalcustoproduto
            groupTotals[group].quantidade += item.qtpedida
        })

        return groupTotals
    }

    // Fix the groupDiscounts state handling
    const handleGroupDiscountChange = (group: string, value: string) => {
        setGroupDiscounts(prev => ({
            ...prev,
            [group]: value ? Number(value) : undefined
        }) as Record<string, number>)
    }

    const fetchLastExtraction = async () => {
        try {
            const response = await fetch('/api/quotations/extraction-date')
            if (!response.ok) {
                throw new Error('Failed to fetch extraction date')
            }
            const data = await response.json()
            setLastExtraction(data.dataextracao)
        } catch (error) {
            console.error('Error fetching extraction date:', error)
        }
    }

    useEffect(() => {
        fetchLastExtraction();
    }, []);

    useEffect(() => {
        if (initialCode) {
            const searchParams = new URLSearchParams(window.location.search)
            const simId = searchParams.get('sim')
            
            if (simId) {
                const loadSimulation = async () => {
                    try {
                        const response = await fetch(`/api/simulations/${initialCode}`)
                        const simulations = await response.json()
                        
                        const simulation = simulations.find((sim: SavedSimulation) => sim.share_id === simId)
                        if (simulation) {
                            updateDiscountsAndGroupDiscounts(simulation.discounts)
                            setIsSimulating(true)
                        }
                    } catch (error) {
                        console.error('Error loading shared simulation:', error)
                    }
                }
                
                loadSimulation()
            }
        }
    }, [initialCode])

    useEffect(() => {
        console.log('Current auth user:', user) // Debug log
    }, [user])

    const fetchRecentQuotations = async (branch = selectedBranch, seller = selectedSeller) => {
        setLoadingRecent(true)
        try {
            const params = new URLSearchParams()
            if (branch !== 'all') params.append('branch', branch)
            if (seller !== 'all') params.append('seller', seller)

            const response = await fetch(`/api/quotations/recent?${params}`)
            if (!response.ok) {
                throw new Error('Failed to fetch recent quotations')
            }
            const data = await response.json()
            setRecentQuotations(data)
        } catch (error) {
            console.error('Error fetching recent quotations:', error)
            toast.error('Erro ao carregar orçamentos recentes')
        } finally {
            setLoadingRecent(false)
        }
    }

    // Atualizar os handlers dos filtros
    const handleBranchChange = (value: string) => {
        setSelectedBranch(value)
        fetchRecentQuotations(value, selectedSeller)
    }

    const handleSellerChange = (value: string) => {
        setSelectedSeller(value)
        fetchRecentQuotations(selectedBranch, value)
    }

    // Função para obter filiais únicas
    const getUniqueBranches = (quotations: QuotationSummary[]) => {
        const branches = new Set(quotations.map(q => q.nmempresacurtovenda))
        return Array.from(branches).sort()
    }

    // Função para obter vendedores únicos
    const getUniqueSellers = (quotations: QuotationSummary[]) => {
        const sellers = new Set(quotations.map(q => q.nmrepresentantevenda))
        return Array.from(sellers).sort()
    }

    // Atualizar a função de filtro para incluir vendedor
    const filteredQuotations = recentQuotations.filter(quotation => 
        (selectedBranch === 'all' || quotation.nmempresacurtovenda === selectedBranch) &&
        (selectedSeller === 'all' || quotation.nmrepresentantevenda === selectedSeller)
    )

    // Adicionar o useEffect para o fetch inicial
    useEffect(() => {
        if (!initialCode) {
            fetchRecentQuotations()
        }
    }, []) // Executar apenas uma vez ao montar o componente

    if (isLoading) return <Loading />

    if (!initialCode && data.length === 0) {
        return (
            <PermissionGuard permission="quotations">
            <div className="h-full p-4 space-y-4">
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
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-x-4">
                        <CardTitle>Orçamentos Recentes</CardTitle>
                        <div className="flex items-center gap-2">
                            <Select
                                value={selectedBranch}
                                onValueChange={handleBranchChange}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Filtrar por filial" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as filiais</SelectItem>
                                    {getUniqueBranches(recentQuotations).map(branch => (
                                        <SelectItem key={branch} value={branch}>
                                            {branch}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={selectedSeller}
                                onValueChange={handleSellerChange}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Filtrar por vendedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os vendedores</SelectItem>
                                    {getUniqueSellers(recentQuotations).map(seller => (
                                        <SelectItem key={seller} value={seller}>
                                            {seller}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loadingRecent ? (
                            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                                <Loading />
                                <p className="text-sm text-muted-foreground">
                                    Carregando orçamentos recentes...
                                </p>
                            </div>
                        ) : (
                            <div className="relative rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Código</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Filial</TableHead>
                                            <TableHead>Vendedor</TableHead>
                                            <TableHead className="text-right">Qtd Produtos</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Margem</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredQuotations.map((quotation) => {
                                            const margin = ((quotation.total_faturamento - (quotation.total_faturamento * 0.268 + quotation.total_custo_produto)) / quotation.total_faturamento) * 100

                                            return (
                                                <TableRow 
                                                    key={quotation.cdpedidodevenda}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => router.push(`/orcamento/${quotation.cdpedidodevenda}`)}
                                                >
                                                    <TableCell>
                                                        {quotation.dtemissao}
                                                    </TableCell>
                                                    <TableCell>{quotation.cdpedidodevenda}</TableCell>
                                                    <TableCell>{quotation.nmpessoa}</TableCell>
                                                    <TableCell>{quotation.nmempresacurtovenda}</TableCell>
                                                    <TableCell>{quotation.nmrepresentantevenda}</TableCell>
                                                    <TableCell className="text-right">
                                                        {quotation.qtd_produtos}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {quotation.total_faturamento.toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL'
                                                        })}
                                                    </TableCell>
                                                    <TableCell className={`text-right ${
                                                        margin >= 5
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : margin >= 0
                                                                ? 'text-yellow-600 dark:text-yellow-400'
                                                                : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                        {margin.toFixed(2)}%
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                router.push(`/orcamento/${quotation.cdpedidodevenda}`)
                                                            }}
                                                        >
                                                            <Search className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {lastExtraction && (
                    <div className="text-center text-sm text-muted-foreground">
                        Dados atualizados em: {new Date(lastExtraction).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </div>
                )}
            </div>
            </PermissionGuard>
        )
    }

    return (
        <PermissionGuard permission="quotations">
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

                                {/* Target Value Section */}
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Definir valor final do pedido
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={targetValue}
                                            onChange={(e) => setTargetValue(e.target.value)}
                                            placeholder="Digite o valor final"
                                            step="0.01"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    applyTargetValue()
                                                }
                                            }}
                                        />
                                        <Button 
                                            onClick={applyTargetValue}
                                            disabled={!targetValue}
                                        >
                                            Aplicar
                                        </Button>
                                    </div>
                                </div>

                                {/* Product Groups Section */}
                                <div className="col-span-full">
                                    <div className="flex items-center mb-4">
                                        <h3 className="text-sm font-medium pr-6">Desconto por Grupo de Produtos</h3>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowGroupDiscounts(!showGroupDiscounts)}
                                        >
                                            {showGroupDiscounts ? 'Ocultar' : 'Mostrar'}
                                        </Button>
                                    </div>
                                    
                                    {showGroupDiscounts && (
                                        <div className="relative rounded-md border">
                                            <div className="overflow-auto">
                                                <div className="min-w-[800px]">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-[200px]">Grupo</TableHead>
                                                                <TableHead className="w-[80px] text-right">Qtd</TableHead>
                                                                <TableHead className="w-[120px] text-right">Preço Lista</TableHead>
                                                                <TableHead className="w-[120px] text-right">Preço Final</TableHead>
                                                                <TableHead className="w-[120px] text-right">Custo</TableHead>
                                                                <TableHead className="w-[100px] text-right">Margem</TableHead>
                                                                <TableHead className="w-[120px] text-right">Desconto %</TableHead>
                                                                <TableHead className="w-[100px]"></TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {getUniqueProductGroups().map(group => {
                                                                const totals = calculateGroupTotals()[group]
                                                                const margin = calculateMargin(totals.precoFinal, totals.custo)
                                                                const currentDiscount = ((totals.precoLista - totals.precoFinal) / totals.precoLista) * 100

                                                                return (
                                                                    <TableRow key={group}>
                                                                        <TableCell className="font-medium">
                                                                            {group}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            {totals.quantidade}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            {totals.precoLista.toLocaleString('pt-BR', {
                                                                                style: 'currency',
                                                                                currency: 'BRL'
                                                                            })}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            {totals.precoFinal.toLocaleString('pt-BR', {
                                                                                style: 'currency',
                                                                                currency: 'BRL'
                                                                            })}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            {totals.custo.toLocaleString('pt-BR', {
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
                                                                        <TableCell>
                                                                            <div className="flex items-center gap-2 justify-end">
                                                                                <Input
                                                                                    type="number"
                                                                                    value={groupDiscounts[group] ?? ''}
                                                                                    onChange={(e) => handleGroupDiscountChange(group, e.target.value)}
                                                                                    placeholder="Desconto %"
                                                                                    className="w-24"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    step="0.1"
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') {
                                                                                            e.preventDefault()
                                                                                            const discount = Number(groupDiscounts[group])
                                                                                            if (!isNaN(discount)) {
                                                                                                applyGroupDiscount(group, discount)
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Button
                                                                                onClick={() => {
                                                                                    const discount = Number(groupDiscounts[group])
                                                                                    if (!isNaN(discount)) {
                                                                                        applyGroupDiscount(group, discount)
                                                                                    }
                                                                                }}
                                                                                disabled={groupDiscounts[group] === undefined}
                                                                                size="sm"
                                                                            >
                                                                                Aplicar
                                                                            </Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-end gap-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={clearSimulation}
                                    >
                                        Limpar
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
                                        Salvar
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
                                                    className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded border"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-sm font-medium truncate">
                                                                {new Date(sim.created_at).toLocaleString()}
                                                            </p>
                                                            {sim.created_by_email && (
                                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded truncate">
                                                                    {sim.created_by_email}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {sim.notes && (
                                                            <p className="text-sm text-muted-foreground mt-1 truncate">
                                                                {sim.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => updateDiscountsAndGroupDiscounts(sim.discounts)}
                                                            className="h-8 w-8"
                                                            title="Aplicar"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        {sim.share_id && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={async () => {
                                                                    const shareUrl = `${window.location.origin}/orcamento/${sim.cdpedidodevenda}?sim=${sim.share_id}`
                                                                    await navigator.clipboard.writeText(shareUrl)
                                                                    toast.success('Link copiado para a área de transferência!')
                                                                }}
                                                                className="h-8 w-8"
                                                                title="Copiar link"
                                                            >
                                                                <Share2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => {
                                                                if (window.confirm('Tem certeza que deseja excluir esta simulação?')) {
                                                                    deleteSimulation(sim.id)
                                                                }
                                                            }}
                                                            title="Excluir"
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
                                    <p className="text-xs"><span className="font-bold">Vendedor:</span> {data[0].nmrepresentantevenda}</p>
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
                                        <span className="font-medium">Custo Total:</span>{' '}
                                        {totals.custo.toLocaleString('pt-BR', {
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
                                                <TableHead className="text-right">Solicitado</TableHead>
                                                <TableHead className="text-right">Qtd</TableHead>
                                                <TableHead className="text-right">Preço Lista</TableHead>
                                                <TableHead className="text-right">Desconto</TableHead>
                                                <TableHead className="text-right">Preço Final</TableHead>
                                                <TableHead className="text-right">Custo</TableHead>
                                                <TableHead className="text-right">Margem</TableHead>
                                                <TableHead>Grupo</TableHead>
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
                                                        <TableCell>{item.nmgrupoproduto}</TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    {lastExtraction && (
                        <div className={cn(
                            "fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black text-white rounded-full shadow-lg text-center text-xs",
                            timeLeftMinutes !== null && 
                            timeLeftMinutes <= TIMER_CONFIG.warningThreshold && 
                            "alert-animate-pulse bg-red-600"
                        )}>
                            <div>
                                Dados atualizados em: {new Date(lastExtraction).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',    
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                            <div>
                                Próxima atualização em: <CountdownTimer onMinutesChange={setTimeLeftMinutes} />
                            </div>
                        </div>
                    )}
                </>
            )}

            <SaveSimulationDialog
                open={saveDialogOpen}
                onOpenChange={setSaveDialogOpen}
                onSave={saveSimulation}
            />
        </div>
        </PermissionGuard>
    )
}