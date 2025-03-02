"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings2 } from "lucide-react"
import { columnDefinitions, ColumnId } from "@/types/inventory"

interface ColumnSelectorProps {
  visibleColumns: Set<ColumnId>;
  onColumnChange: (columnId: ColumnId) => void;
}

export function ColumnSelector({ visibleColumns, onColumnChange }: ColumnSelectorProps) {
  // Organize columns by category for better UX
  const stockColumns = Object.entries(columnDefinitions)
    .filter(([id]) => id.startsWith('QtEstoque_') || id === 'StkTotal')
    .sort() as [ColumnId, { label: string }][];
  
  const priceColumns = Object.entries(columnDefinitions)
    .filter(([id]) => id.startsWith('VlPreco') || id === 'PrecoPromo' || id === 'PrecoDe')
    .sort() as [ColumnId, { label: string }][];
  
  const otherColumns = Object.entries(columnDefinitions)
    .filter(([id]) => !id.startsWith('QtEstoque_') && !id.startsWith('VlPreco') && 
                      id !== 'StkTotal' && id !== 'PrecoPromo' && id !== 'PrecoDe')
    .sort() as [ColumnId, { label: string }][];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <Settings2 className="mr-2 h-4 w-4" />
          Colunas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel>Colunas Visíveis</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">Informações</DropdownMenuLabel>
        {otherColumns.map(
          ([id, { label }]) => (
            <DropdownMenuCheckboxItem
              key={id}
              checked={visibleColumns.has(id)}
              onCheckedChange={() => onColumnChange(id)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          )
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Estoque</DropdownMenuLabel>
        {stockColumns.map(
          ([id, { label }]) => (
            <DropdownMenuCheckboxItem
              key={id}
              checked={visibleColumns.has(id)}
              onCheckedChange={() => onColumnChange(id)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          )
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Preços</DropdownMenuLabel>
        {priceColumns.map(
          ([id, { label }]) => (
            <DropdownMenuCheckboxItem
              key={id}
              checked={visibleColumns.has(id)}
              onCheckedChange={() => onColumnChange(id)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 