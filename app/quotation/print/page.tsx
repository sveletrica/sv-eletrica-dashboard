'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from "@/components/ui/button"

interface OrderItem {
    product: {
        CdChamada: string
        NmProduto: string
        VlPreco_Empresa59: number
    }
    quantity: number
}

interface QuotationData {
    clientName: string
    clientEmail: string
    clientPhone: string
    clientCompany: string
    observations: string
    paymentMethod: string
    discountPercentage: number
    discountAmount: number
    items: OrderItem[]
    subtotal: number
    total: number
    createdAt: string
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    'boleto': 'Boleto Bancário',
    'pix': 'PIX',
    'credit_card': 'Cartão de Crédito',
    'bank_transfer': 'Transferência Bancária',
}

export default function QuotationPrint() {
    const router = useRouter()
    const [quotation, setQuotation] = useState<QuotationData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadQuotation = async () => {
            try {
                console.log('Print page - Starting to load quotation')
                const savedQuotation = localStorage.getItem('currentQuotation')
                console.log('Print page - Saved quotation from localStorage:', savedQuotation)

                if (!savedQuotation) {
                    console.log('Print page - No saved quotation found')
                    router.push('/inventory')
                    return
                }

                const parsedQuotation = JSON.parse(savedQuotation)
                console.log('Print page - Parsed quotation:', parsedQuotation)

                if (!parsedQuotation || !parsedQuotation.items || !Array.isArray(parsedQuotation.items)) {
                    console.log('Print page - Invalid quotation structure')
                    throw new Error('Invalid quotation data structure')
                }

                setQuotation(parsedQuotation)
                await localStorage.setItem('quotationItems', JSON.stringify(parsedQuotation.items))
                console.log('Print page - Quotation loaded successfully')
            } catch (error) {
                console.error('Print page - Error loading quotation:', error)
                router.push('/inventory')
            } finally {
                setIsLoading(false)
            }
        }

        loadQuotation()
    }, [router])

    if (isLoading || !quotation) {
        return null
    }

    const handleBack = async () => {
        if (quotation) {
            try {
                localStorage.setItem('currentQuotation', JSON.stringify(quotation))
                localStorage.setItem('quotationItems', JSON.stringify(quotation.items))
                
                window.location.href = '/quotation/new'
            } catch (error) {
                console.error('Print page - Error storing data:', error)
                router.replace('/inventory')
            }
        } else {
            router.replace('/inventory')
        }
    }

    return (
        <>
            {/* Controls - Hidden in print */}
            <div className="fixed top-4 right-4 flex gap-2 print:hidden z-50">
                <Button
                    variant="outline"
                    onClick={handleBack}
                >
                    Voltar
                </Button>
                <Button
                    onClick={() => window.print()}
                >
                    Imprimir / Salvar PDF
                </Button>
            </div>

            {/* Print Content */}
            <div className="p-8 print:p-0 bg-white">
                <div className="max-w-4xl mx-auto">
                    {/* Header - Made sticky for print */}
                    <div className="print:fixed print:top-0 print:left-0 print:right-0 print:bg-white print:pt-8 print:pb-4">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex justify-between items-start">
                                <div className="flex items-start gap-6">
                                    <Image
                                        src="/logo-sv.png"
                                        alt="SV Elétrica"
                                        width={200}
                                        height={80}
                                        priority
                                        className="object-contain"
                                    />
                                    <div>
                                        <h1 className="text-md font-semibold">Filial XXX</h1>
                                        <p className="text-xs text-gray-600">
                                            Rua Doutor Gilberto Studart, 1189 - Cocó<br />
                                            Fortaleza - CE, 60192-095<br />
                                            Tel: (85) 3099-9999<br />
                                            Email: vendas@sveletrica.com.br
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-xl font-semibold print:pr-4">Cotação #{format(new Date(quotation.createdAt), "yyyyMMdd-HHmm")}</h2>
                                    <p className="text-sm text-gray-600 print:pr-4">
                                        Data: {format(new Date(quotation.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Add margin to content to account for fixed header */}
                    <div className="print:mt-48">
                        {/* Client Information */}
                        <div className="border-t border-b py-2">
                            <h3 className="text-sm font-semibold mb-2">Informações do Cliente</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-xs text-gray-600">Nome:</p>
                                    <p className="text-xs font-medium">{quotation.clientName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Empresa:</p>
                                    <p className="text-xs font-medium">{quotation.clientCompany}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Email:</p>
                                    <p className="text-xs font-medium">{quotation.clientEmail}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Telefone:</p>
                                    <p className="text-xs font-medium">{quotation.clientPhone}</p>
                                </div>
                            </div>
                        </div>

                        {/* Products Table */}
                        <div className="mt-8">
                            <table className="w-full">
                                <thead className="print:table-header-group">
                                    <tr className="border-b">
                                        <th className="text-sm py-2 text-left">Código</th>
                                        <th className="text-sm py-2 text-left">Produto</th>
                                        <th className="text-sm py-2 text-right">Preço Unit.</th>
                                        <th className="text-sm py-2 text-right">Qtd.</th>
                                        <th className="text-sm py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quotation.items.map((item) => (
                                        <tr key={item.product.CdChamada} className="border-b">
                                            <td className="text-xs py-1">{item.product.CdChamada}</td>
                                            <td className="text-xs py-1">{item.product.NmProduto}</td>
                                            <td className="text-xs py-1 text-right">
                                                {item.product.VlPreco_Empresa59.toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL'
                                                })}
                                            </td>
                                            <td className="text-xs py-1 text-right">{item.quantity}</td>
                                            <td className="text-xs py-1 text-right">
                                                {(item.product.VlPreco_Empresa59 * item.quantity).toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL'
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="space-y-2 mt-4">
                            <div className="text-sm flex justify-between">
                                <span>Subtotal:</span>
                                <span>
                                    {quotation.subtotal.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    })}
                                </span>
                            </div>
                            <div className="text-sm font-bold text-red-500 flex justify-between">
                                <span>Desconto ({quotation.discountPercentage}%):</span>
                                <span>
                                    {quotation.discountAmount.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between text-lg font-semibold border-t pt-2">
                                <span>Total:</span>
                                <span>
                                    {quotation.total.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    })}
                                </span>
                            </div>
                        </div>

                        {/* Payment and Observations */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-1">Forma de Pagamento</h3>
                                <p>{PAYMENT_METHOD_LABELS[quotation.paymentMethod]}</p>
                            </div>
                            {quotation.observations && (
                                <div>
                                    <h3 className="font-semibold mb-1">Observações</h3>
                                    <p className="whitespace-pre-wrap">{quotation.observations}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer - Made sticky for print */}
                    <div className="mt-16 print:fixed print:bottom-0 print:left-0 print:right-0 print:bg-white print:pb-8 print:pl-4">
                        <div className="max-w-4xl mx-auto">
                            <div className="pt-8 border-t text-sm text-gray-600">
                                <p>* Esta cotação é válida por 7 dias.</p>
                                <p>* Preços sujeitos a alteração sem aviso prévio.</p>
                                <p>* Prazo de entrega a combinar.</p>
                            </div>
                        </div>
                    </div>

                    {/* Add margin to prevent content from being hidden behind footer */}
                    <div className="print:mb-40"></div>
                </div>
            </div>
        </>
    )
} 