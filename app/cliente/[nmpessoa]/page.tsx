'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import Loading from '../../vendas-dia/loading'
import Link from 'next/link'
import { Roboto } from 'next/font/google'

const roboto = Roboto({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
})

interface ClientSale {
    cdpedido: string
    nrdocumento: string
    dtemissao: string
    tppessoa: string
    nmpessoa: string
    nmrepresentantevenda: string
    nmempresacurtovenda: string
    tpmovimentooperacao: string
    qtbrutaproduto: number
    vlfaturamento: number
    vltotalcustoproduto: number
    margem: string
    cdproduto: string
    nmproduto: string
    nmgrupoproduto: string
    dsunidadedenegocio: string
}

interface GroupedOrder {
    cdpedido: string
    nrdocumento: string
    dtemissao: string
    nmrepresentantevenda: string
    nmempresacurtovenda: string
    tpmovimentooperacao: string
    qtdsku: number
    vlfaturamento: number
    vltotalcustoproduto: number
    margem: number
    items: ClientSale[]
}

export default function ClientDetails() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const [data, setData] = useState<GroupedOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Helper function to group orders
    const groupOrders = (sales: ClientSale[]) => {
        const orderMap = new Map<string, {
            cdpedido: string
            nrdocumento: string
            dtemissao: string
            nmrepresentantevenda: string
            nmempresacurtovenda: string
            tpmovimentooperacao: string
            qtdsku: number
            vlfaturamento: number
            vltotalcustoproduto: number
            margem: number
            items: ClientSale[]
        }>();

        sales.forEach(sale => {
            const key = `${sale.cdpedido}-${sale.nrdocumento}`;
            if (!orderMap.has(key)) {
                orderMap.set(key, {
                    cdpedido: sale.cdpedido,
                    nrdocumento: sale.nrdocumento,
                    dtemissao: sale.dtemissao,
                    nmrepresentantevenda: sale.nmrepresentantevenda,
                    nmempresacurtovenda: sale.nmempresacurtovenda,
                    tpmovimentooperacao: sale.tpmovimentooperacao,
                    qtdsku: 0,
                    vlfaturamento: 0,
                    vltotalcustoproduto: 0,
                    margem: 0,
                    items: []
                });
            }
            
            const order = orderMap.get(key)!;
            order.items.push(sale);
            order.qtdsku += sale.qtbrutaproduto;
            order.vlfaturamento += sale.vlfaturamento;
            order.vltotalcustoproduto += sale.vltotalcustoproduto;
        });

        // Calculate margin for each order
        orderMap.forEach(order => {
            order.margem = ((order.vlfaturamento - (order.vlfaturamento * 0.268 + order.vltotalcustoproduto)) / order.vlfaturamento) * 100;
        });

        return Array.from(orderMap.values());
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const nmpessoa = params?.nmpessoa as string
                if (!nmpessoa) {
                    throw new Error('Nome do cliente não encontrado')
                }

                const url = `/api/cliente/${encodeURIComponent(nmpessoa)}`
                console.log('Fetching data from:', url)
                console.log('Client name:', {
                    original: nmpessoa,
                    encoded: encodeURIComponent(nmpessoa),
                    decoded: decodeURIComponent(encodeURIComponent(nmpessoa))
                })

                const response = await fetch(url)
                console.log('Response status:', response.status)
                
                const contentType = response.headers.get('content-type')
                console.log('Response content type:', contentType)

                const responseData = await response.json()
                console.log('Response data:', responseData)

                if (!response.ok) {
                    throw new Error(
                        responseData.details || 
                        responseData.error || 
                        'Failed to fetch client sales'
                    )
                }

                if (!Array.isArray(responseData)) {
                    console.error('Unexpected response format:', responseData)
                    throw new Error('Invalid response format from server')
                }

                const groupedOrders = groupOrders(responseData)
                console.log('Grouped orders:', groupedOrders)

                setData(groupedOrders)
            } catch (err) {
                const error = err as Error
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack,
                    cause: error.cause
                })
                setError(error.message || 'Failed to fetch client sales')
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [params])

    const handleBack = () => {
        const returnUrl = searchParams.get('returnUrl')
        if (returnUrl) {
            router.push(returnUrl)
        } else {
            router.back()
        }
    }

    if (isLoading) return <Loading />

    if (!data.length) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-center text-muted-foreground">
                            Nenhuma venda encontrada para este cliente.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Calculate totals from grouped orders
    const totals = data.reduce((acc, order) => ({
        faturamento: acc.faturamento + order.vlfaturamento,
        quantidade: acc.quantidade + order.qtdsku,
        pedidos: acc.pedidos + 1
    }), { faturamento: 0, quantidade: 0, pedidos: 0 })

    return (
        <div className="space-y-4">
            <Button
                variant="ghost"
                onClick={handleBack}
                className="mb-4"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
            </Button>

            <h1 className="text-3xl font-bold tracking-tight">
                {decodeURIComponent(params?.nmpessoa as string)}
            </h1>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">
                            Total de Pedidos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totals.pedidos}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">
                            Total de Itens
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totals.quantidade}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">
                            Faturamento Total
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totals.faturamento.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Pedido</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead>Vendedor</TableHead>
                                <TableHead>Empresa</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Qtd Items</TableHead>
                                <TableHead className="text-right">Faturamento</TableHead>
                                <TableHead className="text-right">Custo</TableHead>
                                <TableHead className="text-right">Margem</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className={roboto.className}>
                            {data.map((order, index) => (
                                <TableRow key={index}>
                                    <TableCell>{order.dtemissao}</TableCell>
                                    <TableCell>
                                        <Link
                                            href={`/vendas-dia/${order.cdpedido}?nrdocumento=${order.nrdocumento}&dtemissao=${order.dtemissao}`}
                                            className="text-blue-500 hover:text-blue-700 underline"
                                        >
                                            {order.cdpedido}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{order.nrdocumento}</TableCell>
                                    <TableCell>{order.nmrepresentantevenda}</TableCell>
                                    <TableCell>{order.nmempresacurtovenda}</TableCell>
                                    <TableCell>{order.tpmovimentooperacao}</TableCell>
                                    <TableCell className="text-right">{order.qtdsku}</TableCell>
                                    <TableCell className="text-right">
                                        {order.vlfaturamento.toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {order.vltotalcustoproduto.toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right">{order.margem.toFixed(2)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
} 