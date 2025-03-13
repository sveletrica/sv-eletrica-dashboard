'use client'

import { useEffect, useState } from 'react'

interface SalesData {
  DataHoje: string
  TotalFaturamentoHoje: string
  DataOntem: string
  TotalFaturamentoOntem: string
  VariacaoPercentual: string
}

export function SalesDataLoader() {
  const [salesData, setSalesData] = useState<SalesData>({
    DataHoje: new Date().toLocaleDateString('pt-BR'),
    TotalFaturamentoHoje: "R$ 0,00",
    DataOntem: new Date(Date.now() - 86400000).toLocaleDateString('pt-BR'),
    TotalFaturamentoOntem: "R$ 0,00",
    VariacaoPercentual: "0%"
  })
  const [loading, setLoading] = useState(true)
  const [variationColorClass, setVariationColorClass] = useState('text-gray-600')

  useEffect(() => {
    async function fetchSalesData() {
      try {
        // Fetch data from the webhook
        const response = await fetch('https://wh.sveletrica.com/webhook/vendadiatotal', { 
          cache: 'no-store'  // Always fetch fresh data
        })
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`)
        }
        
        const apiData = await response.json()
        
        // Check if the API returned data in the expected format
        if (apiData) {
          // Handle both possible formats: single object or array of objects
          if (Array.isArray(apiData) && apiData.length > 0) {
            setSalesData(apiData[0])
          } else if (typeof apiData === 'object' && apiData.DataHoje) {
            // The API returned a single object directly
            setSalesData(apiData)
          } else {
            console.error('API returned unexpected data format:', apiData)
          }
          
          // Determine if the variation is positive or negative for styling
          // Ensure we're working with strings since the API returns string values
          const isPositiveVariation = !String(apiData.VariacaoPercentual || '0%').includes('-')
          setVariationColorClass(isPositiveVariation ? 'text-green-600' : 'text-red-600')
        } else {
          console.error('API returned unexpected data format:', apiData)
        }
      } catch (error) {
        console.error('Error fetching sales data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSalesData()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Hoje</p>
          <div className="h-8 bg-gray-200 animate-pulse rounded-md mt-1"></div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">vs Ontem</p>
          <div className="h-8 bg-gray-200 animate-pulse rounded-md mt-1"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <p className="text-sm text-muted-foreground">Hoje ({salesData.DataHoje})</p>
        <p className="font-bold text-2xl">{salesData.TotalFaturamentoHoje}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">vs Ontem ({salesData.DataOntem})</p>
        <p className={`font-bold text-2xl ${variationColorClass}`}>{salesData.VariacaoPercentual}</p>
      </div>
    </div>
  )
}