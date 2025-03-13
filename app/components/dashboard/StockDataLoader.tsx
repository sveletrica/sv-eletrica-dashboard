'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export function StockDataLoader() {
  const [totalStockItems, setTotalStockItems] = useState(0)
  const [totalStockValue, setTotalStockValue] = useState("R$ 0,00")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStockData() {
      try {
        // Create Supabase client
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL as string,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
        )
        
        // Get total stock items
        const { count: totalItems, error: stockError } = await supabase
          .from('DBestoque')
          .select('CdChamada', { count: 'exact', head: true })
          .gt('StkTotal', 0)
          .limit(1)
        
        if (stockError) {
          console.error('Supabase Error (Stock Items):', stockError)
        } else {
          setTotalStockItems(totalItems || 0)
        }
        
        // Get total stock value
        const { data: stockValueData, error: stockValueError } = await supabase
          .from('mvw_mssql_etiquetasio_estoques')
          .select('stktotal, vlprecoreposicao')
          .gt('stktotal', 0)
        
        if (stockValueError) {
          console.error('Supabase Error (Stock Value):', stockValueError)
        } else if (stockValueData && stockValueData.length > 0) {
          // Calculate the total value
          const totalValue = stockValueData.reduce((sum: number, item: { stktotal: number; vlprecoreposicao: number }) => {
            if (item.stktotal && item.vlprecoreposicao) {
              return sum + (item.stktotal * item.vlprecoreposicao)
            }
            return sum
          }, 0)
          
          // Format the value in Brazilian currency with compact notation for millions
          const formattedValue = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            notation: 'compact',
            maximumFractionDigits: 1
          }).format(totalValue)
          
          setTotalStockValue(formattedValue)
        }
      } catch (error) {
        console.error('Error fetching stock data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStockData()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Skus</p>
          <div className="h-8 bg-gray-200 animate-pulse rounded-md mt-1"></div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Valor Total</p>
          <div className="h-8 bg-gray-200 animate-pulse rounded-md mt-1"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <p className="text-sm text-muted-foreground">Total Skus</p>
        <p className="font-bold text-2xl">{totalStockItems.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Valor Total</p>
        <p className="font-bold text-2xl">{totalStockValue}</p>
      </div>
    </div>
  )
}