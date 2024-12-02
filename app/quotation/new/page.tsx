'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { InventoryItem } from "@/types/inventory"
import { X } from "lucide-react"
import { toast } from "sonner"

interface OrderItem {
    product: InventoryItem;
    quantity: number;
}

interface QuotationForm {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    clientCompany: string;
    observations: string;
    paymentMethod: string;
    discount: number;
}

const PAYMENT_METHODS = [
    { id: 'boleto', label: 'Boleto Bancário' },
    { id: 'pix', label: 'PIX' },
    { id: 'credit_card', label: 'Cartão de Crédito' },
    { id: 'bank_transfer', label: 'Transferência Bancária' },
]

export default function NewQuotation() {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [orderItems, setOrderItems] = useState<OrderItem[]>([])
    const [form, setForm] = useState<QuotationForm>({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        clientCompany: '',
        observations: '',
        paymentMethod: '',
        discount: 0,
    })
    const [isFromPrint, setIsFromPrint] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return;

        const loadQuotationData = async () => {
            try {
                console.log('New quotation page - Starting to load data')
                const currentQuotation = localStorage.getItem('currentQuotation')
                const quotationItems = localStorage.getItem('quotationItems')
                
                console.log('New quotation page - LocalStorage state:', {
                    currentQuotation,
                    quotationItems
                })

                if (currentQuotation) {
                    console.log('New quotation page - Found current quotation')
                    const quotation = JSON.parse(currentQuotation)
                    console.log('New quotation page - Parsed quotation:', quotation)

                    if (!quotation || !quotation.items) {
                        throw new Error('Invalid quotation data')
                    }

                    setOrderItems(quotation.items)
                    setForm({
                        clientName: quotation.clientName || '',
                        clientEmail: quotation.clientEmail || '',
                        clientPhone: quotation.clientPhone || '',
                        clientCompany: quotation.clientCompany || '',
                        observations: quotation.observations || '',
                        paymentMethod: quotation.paymentMethod || '',
                        discount: quotation.discountPercentage || 0,
                    })
                    setIsFromPrint(true)

                } else if (quotationItems) {
                    const items = JSON.parse(quotationItems)
                    if (!items || !Array.isArray(items) || items.length === 0) {
                        throw new Error('Invalid items data')
                    }
                    setOrderItems(items)
                } else {
                    window.location.href = '/inventory'
                    return
                }
            } catch (error) {
                console.error('New quotation page - Error loading data:', error)
                window.location.href = '/inventory'
                return
            } finally {
                setIsLoading(false)
            }
        }

        loadQuotationData()
    }, [mounted])

    const handleUpdateQuantity = (productCode: string, quantity: number) => {
        if (quantity <= 0) {
            setOrderItems(current => current.filter(item => item.product.CdChamada !== productCode))
            return
        }
        
        setOrderItems(current =>
            current.map(item =>
                item.product.CdChamada === productCode
                    ? { ...item, quantity }
                    : item
            )
        )
    }

    const handleRemoveItem = (productCode: string) => {
        setOrderItems(current => current.filter(item => item.product.CdChamada !== productCode))
    }

    const getSubtotal = () => {
        return orderItems.reduce((sum, item) => {
            const price = item.product.VlPreco_Empresa59 || 0
            return sum + (price * item.quantity)
        }, 0)
    }

    const getDiscount = () => {
        const subtotal = getSubtotal()
        return (subtotal * (form.discount / 100))
    }

    const getTotal = () => {
        return getSubtotal() - getDiscount()
    }

    const handleBack = useCallback(() => {
        try {
            if (isFromPrint) {
                localStorage.removeItem('currentQuotation')
            }
            
            if (orderItems.length > 0) {
                localStorage.setItem('quotationItems', JSON.stringify(orderItems))
            }
            
            window.location.href = '/inventory'
        } catch (error) {
            console.error('Error handling back:', error)
            window.location.href = '/inventory'
        }
    }, [isFromPrint, orderItems])

    const handleSubmit = async () => {
        try {
            const subtotal = getSubtotal()
            const discountAmount = getDiscount()
            const total = subtotal - discountAmount

            const quotation = {
                ...form,
                items: orderItems,
                subtotal: subtotal,
                discountAmount: discountAmount,
                discountPercentage: form.discount,
                total: total,
                createdAt: isFromPrint ? JSON.parse(localStorage.getItem('currentQuotation')!).createdAt : new Date().toISOString(),
            }

            localStorage.setItem('currentQuotation', JSON.stringify(quotation))
            localStorage.setItem('quotationItems', JSON.stringify(orderItems))
            
            const loadingToast = toast.loading('Salvando cotação...')
            
            try {
                const response = await fetch('/api/quotations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(quotation),
                })

                if (!response.ok) {
                    throw new Error('Falha ao salvar cotação')
                }
                
                toast.dismiss(loadingToast)
                toast.success('Cotação salva com sucesso!')
                
                window.location.href = '/quotation/print'
            } catch (error) {
                toast.dismiss(loadingToast)
                toast.error(error instanceof Error ? error.message : 'Falha ao salvar cotação')
            }
        } catch (error) {
            toast.error('Erro ao processar cotação')
            console.error('Failed to process quotation:', error)
        }
    }

    if (!mounted || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <h2 className="text-xl font-semibold">Carregando Cotação</h2>
                    <p className="text-muted-foreground">
                        Aguarde enquanto processamos os dados...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Nova Cotação</h1>
                <Button
                    variant="outline"
                    onClick={handleBack}
                >
                    Voltar
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Informações do Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="clientName">Nome</Label>
                            <Input
                                id="clientName"
                                value={form.clientName}
                                onChange={(e) => setForm(prev => ({
                                    ...prev,
                                    clientName: e.target.value
                                }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clientEmail">Email</Label>
                            <Input
                                id="clientEmail"
                                type="email"
                                value={form.clientEmail}
                                onChange={(e) => setForm(prev => ({
                                    ...prev,
                                    clientEmail: e.target.value
                                }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clientPhone">Telefone</Label>
                            <Input
                                id="clientPhone"
                                value={form.clientPhone}
                                onChange={(e) => setForm(prev => ({
                                    ...prev,
                                    clientPhone: e.target.value
                                }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clientCompany">Empresa</Label>
                            <Input
                                id="clientCompany"
                                value={form.clientCompany}
                                onChange={(e) => setForm(prev => ({
                                    ...prev,
                                    clientCompany: e.target.value
                                }))}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Pagamento e Observações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                            <Select
                                value={form.paymentMethod}
                                onValueChange={(value) => setForm(prev => ({
                                    ...prev,
                                    paymentMethod: value
                                }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma forma de pagamento" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map(method => (
                                        <SelectItem key={method.id} value={method.id}>
                                            {method.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="discount">Desconto (%)</Label>
                            <Input
                                id="discount"
                                type="number"
                                min="0"
                                max="100"
                                value={form.discount}
                                onChange={(e) => setForm(prev => ({
                                    ...prev,
                                    discount: Number(e.target.value)
                                }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="observations">Observações</Label>
                            <Textarea
                                id="observations"
                                value={form.observations}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(prev => ({
                                    ...prev,
                                    observations: e.target.value
                                }))}
                                rows={4}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Produtos</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Produto</TableHead>
                                <TableHead className="text-right">Preço Unit.</TableHead>
                                <TableHead className="text-right">Qtd.</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orderItems.map((item) => (
                                <TableRow key={item.product.CdChamada}>
                                    <TableCell>{item.product.CdChamada}</TableCell>
                                    <TableCell>{item.product.NmProduto}</TableCell>
                                    <TableCell className="text-right">
                                        {item.product.VlPreco_Empresa59?.toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleUpdateQuantity(
                                                item.product.CdChamada,
                                                parseInt(e.target.value) || 0
                                            )}
                                            className="w-20 ml-auto"
                                            min="1"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {((item.product.VlPreco_Empresa59 || 0) * item.quantity).toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveItem(item.product.CdChamada)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>
                                {getSubtotal().toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                })}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Desconto ({form.discount}%):</span>
                            <span>
                                {getDiscount().toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                })}
                            </span>
                        </div>
                        <div className="flex justify-between font-medium text-lg pt-2 border-t">
                            <span>Total:</span>
                            <span>
                                {getTotal().toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                })}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button
                    variant="outline"
                    onClick={handleBack}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!form.clientName || !form.paymentMethod || orderItems.length === 0}
                >
                    Gerar Cotação
                </Button>
            </div>
        </div>
    )
} 