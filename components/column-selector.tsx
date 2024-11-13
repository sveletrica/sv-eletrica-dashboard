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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <Settings2 className="mr-2 h-4 w-4" />
          Colunas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Colunas Visíveis</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.entries(columnDefinitions) as [ColumnId, { label: string }][]).map(
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