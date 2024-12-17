'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PackageX, RefreshCw, ArrowLeft, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface BindSemEstoqueMaracanau {
    itemBarCode: string
    itemTitle: string
    QtEstoque_Empresa17: number | null
}

export default function BindSemEstoqueMaracanau() {
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [data, setData] = useState<BindSemEstoqueMaracanau[]>([])
    const [error, setError] = useState<string | null>(null)

    const fetchData = async () => {
        setError(null)
        
        try {
            const response = await fetch('/api/bind-sem-estoque-maracanau', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            })
            
            if (!response.ok) {
                throw new Error('Failed to fetch data')
            }

            const data = await response.json()
            setData(data)
        } catch (error) {
            console.error('Error fetching data:', error)
            setError(error instanceof Error ? error.message : 'Failed to load data')
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await fetchData()
    }

    const handleExportToExcel = () => {
        try {
            // Format data for export
            const exportData = data.map(item => ({
                'SKU': item.itemBarCode,
                'Descrição': item.itemTitle,
                'Estoque': item.QtEstoque_Empresa13 ?? 0
            }))

            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(exportData)

            // Set column widths (width is measured in characters)
            // Excel's default character width is about 7 pixels
            // So for 470px we need approximately 67 characters (470/7)
            ws['!cols'] = [
                { wch: 15 },  // Column A (SKU)
                { wch: 67 },  // Column B (Descrição) - 470px equivalent
                { wch: 10 }   // Column C (Estoque)
            ]

            // Create workbook
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Bind sem Estoque')

            // Generate filename with current date
            const date = new Date().toISOString().split('T')[0]
            const fileName = `MARACANAU_bind_sem_estoque_${date}.xlsx`

            // Save file
            XLSX.writeFile(wb, fileName)
        } catch (error) {
            console.error('Error exporting to Excel:', error)
            setError('Falha ao exportar para Excel')
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pl-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold">Produtos com Bind sem Estoque</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportToExcel}
                        disabled={isLoading || data.length === 0}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Excel
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={cn(
                            "h-4 w-4 mr-2",
                            isRefreshing && "animate-spin"
                        )} />
                        Atualizar
                    </Button>
                    <Link href="/sobral">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PackageX className="h-5 w-5" />
                        Produtos ({data.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <RefreshCw className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-muted">
                                    <tr>
                                        <th className="px-6 py-3">SKU</th>
                                        <th className="px-6 py-3">Descrição</th>
                                        <th className="px-6 py-3">Estoque</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item, index) => (
                                        <tr key={index} className="border-b">
                                            <td className="px-6 py-2">{item.itemBarCode}</td>
                                            <td className="px-6 py-2">{item.itemTitle}</td>
                                            <td className="px-6 py-2">{item.QtEstoque_Empresa17 ?? '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
} 