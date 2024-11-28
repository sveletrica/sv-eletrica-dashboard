import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from './button'
import { DailySale } from '@/types/sales'
import { Table, TableBody, TableCell, TableRow } from './table'
import Link from 'next/link'

interface ExpandableRowProps {
  row: DailySale
  columns: {
    header: string
    accessor: keyof DailySale
    format?: (value: any) => string | null
  }[]
}

export function ExpandableRow({ row, columns }: ExpandableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatValue = (value: any, accessor: keyof DailySale, format?: (value: any) => string | null) => {
    if (format) {
      const formatted = format(value)
      if (formatted !== null) return formatted
    }

    switch(accessor) {
      case 'cdpedido':
        return (
          <Link
            href={`/vendas-dia/${row.cdpedido}?nrdocumento=${row.nrdocumento}&dtemissao=${row.dtemissao}`}
            className="text-blue-500 hover:text-blue-700 underline text-xs"
          >
            {row.cdpedido}
          </Link>
        )
      case 'total_faturamento':
      case 'total_custo_produto':
        return value.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        })
      case 'margem':
        const margin = parseFloat(value)
        let color = margin < 0 ? 'text-red-600' : 
                   margin <= 3 ? 'text-yellow-700' : 
                   'text-green-600'
        return <span className={`font-bold ${color}`}>{margin.toFixed(2)}%</span>
      case 'qtdsku':
        return value.toLocaleString('pt-BR')
      default:
        return value
    }
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  const getMarginColor = (margin: number) => {
    return margin < 0 ? 'text-red-600' : 
           margin <= 3 ? 'text-yellow-700' : 
           'text-green-600'
  }

  const margin = parseFloat(row.margem)

  return (
    <div className="mb-4 rounded-lg border bg-card">
      <Table>
        <TableBody>
          <TableRow className="hover:bg-muted/50 data-[state=selected]:bg-muted">
            <TableCell className="w-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </TableCell>
            <TableCell className="p-2">
              <div className="flex flex-col gap-1">
                <Link
                  href={`/vendas-dia/${row.cdpedido}?nrdocumento=${row.nrdocumento}&dtemissao=${row.dtemissao}`}
                  className="text-blue-500 hover:text-blue-700 underline text-xs"
                >
                  {row.cdpedido}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {truncateText(row.nmpessoa, 30)}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex flex-col items-end gap-1">
                <span>
                  {row.total_faturamento.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </span>
                <span className={`text-xs font-medium ${getMarginColor(margin)}`}>
                  {margin.toFixed(2)}%
                </span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      
      {isExpanded && (
        <div className="border-t bg-muted/30">
          <div className="p-4 space-y-2">
            {columns.map((column) => {
              // Skip the columns that are already shown in the main row
              if (column.accessor === 'cdpedido' || 
                  column.accessor === 'total_faturamento' || 
                  column.accessor === 'margem' ||
                  column.accessor === 'nmpessoa') {
                return null
              }
              
              return (
                <div key={String(column.accessor)} className="flex justify-between text-xs">
                  <span className="font-medium">
                    {column.header}
                  </span>
                  <span>
                    {formatValue(row[column.accessor], column.accessor, column.format)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
} 