'use client'
import { PermissionGuard } from '@/components/guards/permission-guard'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Calculator, Info, Check, X, Plus, Trash } from 'lucide-react'
import { StockPopover } from "@/components/stock-popover"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useAuth } from '@/components/providers/auth-provider'

interface Product {
  cdchamada: string
  nmproduto: string
  nmgrupoproduto: string
  vlprecosugerido: number
  vlprecoreposicao: number
  qtestoque_empresa1: number
  qtestoque_empresa4: number
  qtestoque_empresa12: number
  qtestoque_empresa13: number
  qtestoque_empresa15: number
  qtestoque_empresa17: number
  qtestoque_empresa59: number
  stktotal: number
}

interface SimulationItem extends Product {
  quantidade: number
  desconto: number
}

interface AddProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductSelect: (product: Product) => void
}

function AddProductDialog({ open, onOpenChange, onProductSelect }: AddProductDialogProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const searchProducts = async () => {
    if (searchTerm.length < 3) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/produtos/search?q=${encodeURIComponent(searchTerm)}`)
      if (!response.ok) {
        throw new Error('Failed to search products')
      }
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('Error searching products:', error)
      toast.error('Erro ao buscar produtos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Adicionar Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por código ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchProducts()}
            />
            <Button onClick={searchProducts} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>
          
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.cdchamada}>
                    <TableCell>{product.cdchamada}</TableCell>
                    <TableCell>{product.nmproduto}</TableCell>
                    <TableCell>{product.nmgrupoproduto}</TableCell>
                    <TableCell className="text-right">{product.stktotal}</TableCell>
                    <TableCell className="text-right">
                      {product.vlprecosugerido.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          onProductSelect(product)
                          onOpenChange(false)
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (items: { codigo: string; quantidade: number; precoFinal: number }[]) => void
}

function ImportDialog({ open, onOpenChange, onImport }: ImportDialogProps) {
  const [text, setText] = useState('')
  const [processing, setProcessing] = useState(false)

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault() // Previne o comportamento padrão
    const clipboardData = e.clipboardData.getData('text')
    setText(clipboardData)
  }

  const handleImport = () => {
    if (processing) return // Evita processamento duplo
    
    setProcessing(true)
    try {
      const items = parseClipboardData(text)
      if (items.length > 0) {
        onImport(items)
        onOpenChange(false)
        setText('')
      } else {
        toast.error('Nenhum item válido encontrado')
      }
    } finally {
      setProcessing(false)
    }
  }

  // Limpa o texto quando o diálogo é fechado
  useEffect(() => {
    if (!open) {
      setText('')
      setProcessing(false)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar Produtos do Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cole os dados do Excel aqui. O sistema irá extrair o código do produto, 
            quantidade e preço unitário.
          </p>
          <textarea
            className="w-full h-[300px] p-2 border rounded-md font-mono text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            placeholder="Cole os dados do Excel aqui..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport}
              disabled={processing || !text.trim()}
            >
              {processing ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const parseClipboardData = (text: string) => {
  const rows = text.split('\n')
  const items: { codigo: string; quantidade: number; precoFinal: number }[] = []

  // Encontra os índices das colunas importantes no cabeçalho
  const headerRow = rows[0]?.split('\t') || []
  const qtdIndex = headerRow.findIndex(col => col.trim().toLowerCase().startsWith('qtd'))
  const vlUnitIndex = headerRow.findIndex(col => col.trim().toLowerCase().startsWith('vl'))

  if (qtdIndex === -1 || vlUnitIndex === -1) {
    console.error('Colunas Qtd. ou Vl. Unit não encontradas')
    return items
  }

  const parseNumber = (value: string) => {
    // Remove espaços e substitui vírgula por ponto
    const cleanValue = value.trim().replace(/\s/g, '')
    
    // Se contém ponto como separador de milhar e vírgula como decimal
    if (cleanValue.includes('.') && cleanValue.includes(',')) {
      return parseFloat(cleanValue.replace(/\./g, '').replace(',', '.'))
    }
    
    // Se contém apenas vírgula
    if (cleanValue.includes(',')) {
      return parseFloat(cleanValue.replace(',', '.'))
    }
    
    // Se é um número simples
    return parseFloat(cleanValue)
  }

  rows.forEach((row, index) => {
    // Pula o cabeçalho
    if (index === 0 || row.trim() === '') return

    const parts = row.split('\t')
    
    // Procura por um código de 6 dígitos no início da linha
    const codigo = parts[0]?.replace(/\s+/g, '')
    
    if (codigo?.match(/^\d{6}$/)) {
      // Pega os valores diretamente das colunas corretas
      const quantidadeStr = parts[qtdIndex]?.trim()
      const precoStr = parts[vlUnitIndex]?.trim()
      
      const quantidade = parseNumber(quantidadeStr)
      const precoFinal = parseNumber(precoStr)

      // Verifica se os valores são válidos
      if (!isNaN(quantidade) && !isNaN(precoFinal)) {
        items.push({
          codigo,
          quantidade,
          precoFinal
        })
      }
    }
  })

  return items
}

export default function SimulationPage() {
  const [items, setItems] = useState<SimulationItem[]>([])
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [globalDiscount, setGlobalDiscount] = useState('')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const { user } = useAuth()

  const calculateMargin = (revenue: number, cost: number) => {
    return ((revenue - (revenue * 0.268 + cost)) / revenue) * 100
  }

  const handleAddProduct = (product: Product) => {
    setItems(prev => [...prev, { ...product, quantidade: 1, desconto: 0 }])
  }

  const handleQuantityChange = (index: number, quantity: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantidade: quantity } : item
    ))
  }

  const handleDiscountChange = (index: number, discount: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, desconto: discount } : item
    ))
  }

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const applyGlobalDiscount = () => {
    const discount = parseFloat(globalDiscount)
    if (isNaN(discount)) return

    setItems(prev => prev.map(item => ({
      ...item,
      desconto: discount
    })))
  }

  // Calculate totals
  const totals = items.reduce((acc, item) => {
    const priceAfterDiscount = item.vlprecosugerido * (1 - item.desconto / 100)
    const totalPrice = priceAfterDiscount * item.quantidade
    const totalCost = item.vlprecoreposicao * item.quantidade

    return {
      precoLista: acc.precoLista + (item.vlprecosugerido * item.quantidade),
      faturamento: acc.faturamento + totalPrice,
      custo: acc.custo + totalCost,
      quantidade: acc.quantidade + item.quantidade
    }
  }, { precoLista: 0, faturamento: 0, custo: 0, quantidade: 0 })

  const marginTotal = items.length > 0 
    ? calculateMargin(totals.faturamento, totals.custo)
    : 0

  const handleImportItems = async (importedItems: { codigo: string; quantidade: number; precoFinal: number }[]) => {
    try {
      // Buscar detalhes dos produtos
      const products: SimulationItem[] = []
      
      for (const item of importedItems) {
        const response = await fetch(`/api/produtos/search?q=${item.codigo}`)
        if (!response.ok) continue
        
        const data = await response.json()
        const product = data.find((p: Product) => p.cdchamada.trim() === item.codigo)
        
        if (product) {
          // Calcular o desconto baseado no preço final desejado
          const desconto = ((product.vlprecosugerido - item.precoFinal) / product.vlprecosugerido) * 100
          
          products.push({
            ...product,
            quantidade: item.quantidade,
            desconto: Math.max(0, Math.min(100, desconto)) // Limita o desconto entre 0 e 100
          })
        }
      }

      if (products.length > 0) {
        setItems(prev => [...prev, ...products])
        toast.success(`${products.length} produtos importados`)
      } else {
        toast.error('Nenhum produto encontrado')
      }
    } catch (error) {
      console.error('Error importing items:', error)
      toast.error('Erro ao importar produtos')
    }
  }

  return (
    <PermissionGuard permission="quotations">
      <div className="container py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Simulação de Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => setAddProductOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
                <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                  <Search className="h-4 w-4 mr-2" />
                  Importar do Excel
                </Button>
              </div>

              {items.length > 0 && (
                <div className="space-y-4">
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Desconto global %"
                      value={globalDiscount}
                      onChange={(e) => setGlobalDiscount(e.target.value)}
                      className="w-40"
                    />
                    <Button variant="secondary" onClick={applyGlobalDiscount}>
                      Aplicar
                    </Button>
                  </div>

                  <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Totais</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p>
                            <span className="font-medium">Quantidade:</span>{' '}
                            {totals.quantidade}
                          </p>
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
                            <span className="font-medium">Custo:</span>{' '}
                            {totals.custo.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </p>
                          <p className={cn(
                            "font-medium",
                            marginTotal >= 5 ? "text-green-600" :
                            marginTotal >= 0 ? "text-yellow-600" : "text-red-600"
                          )}>
                            <span>Margem:</span>{' '}
                            {marginTotal.toFixed(2)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Estoque</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead className="text-right">Preço Lista</TableHead>
                        <TableHead className="text-right">Desconto %</TableHead>
                        <TableHead className="text-right">Preço Final</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Margem</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => {
                        const priceAfterDiscount = item.vlprecosugerido * (1 - item.desconto / 100)
                        const totalPrice = priceAfterDiscount * item.quantidade
                        const margin = calculateMargin(totalPrice, item.vlprecoreposicao * item.quantidade)

                        return (
                          <TableRow key={index}>
                            <TableCell>{item.cdchamada}</TableCell>
                            <TableCell>{item.nmproduto}</TableCell>
                            <TableCell className="text-right">{item.stktotal}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.quantidade}
                                onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                                className="w-20"
                                min="1"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {item.vlprecosugerido.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.desconto}
                                onChange={(e) => handleDiscountChange(index, Number(e.target.value))}
                                className="w-20"
                                min="0"
                                max="100"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {priceAfterDiscount.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              {totalPrice.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right",
                              margin >= 5 ? "text-green-600" :
                              margin >= 0 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {margin.toFixed(2)}%
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <AddProductDialog
          open={addProductOpen}
          onOpenChange={setAddProductOpen}
          onProductSelect={handleAddProduct}
        />

        <ImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={handleImportItems}
        />
      </div>
    </PermissionGuard>
  )
} 