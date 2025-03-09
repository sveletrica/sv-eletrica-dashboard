import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Mark this as an Edge Function
export const runtime = 'edge'

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
const supabase = createClient(supabaseUrl, supabaseKey)

// Helper function to format currency values
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Helper function to calculate monthly data
const getMonthlyData = (orders: any[]) => {
  const monthlyMap = new Map<string, number>()
  
  orders.forEach(order => {
    const [day, month, year] = order.dtemissao.split('/')
    const monthKey = `${year}-${month}`
    const faturamento = typeof order.total_faturamento === 'number' ? order.total_faturamento : 0
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + faturamento)
  })

  // Convert to array and sort by date
  return Array.from(monthlyMap.entries())
    .map(([month, value]) => ({
      month: month.split('-').reverse().join('/'), // Convert YYYY-MM to MM/YYYY
      value
    }))
    .sort((a, b) => {
      const [monthA, yearA] = a.month.split('/')
      const [monthB, yearB] = b.month.split('/')
      return (yearA + monthA).localeCompare(yearB + monthB)
    })
}

// Helper function to calculate yearly comparison
const getYearlyComparison = (orders: any[]) => {
  const currentYear = new Date().getFullYear()
  const lastYear = currentYear - 1

  const yearlyTotals = orders.reduce((acc, order) => {
    const [, , year] = order.dtemissao.split('/')
    const orderYear = parseInt(year)
    const faturamento = typeof order.total_faturamento === 'number' ? order.total_faturamento : 0
    
    if (orderYear === currentYear) {
      acc.currentYear += faturamento
    } else if (orderYear === lastYear) {
      acc.lastYear += faturamento
    }
    
    return acc
  }, { currentYear: 0, lastYear: 0 })

  const percentageChange = yearlyTotals.lastYear > 0
    ? ((yearlyTotals.currentYear - yearlyTotals.lastYear) / yearlyTotals.lastYear) * 100
    : 0

  return {
    currentYear: yearlyTotals.currentYear,
    lastYear: yearlyTotals.lastYear,
    percentageChange,
    formattedCurrentYear: formatCurrency(yearlyTotals.currentYear),
    formattedLastYear: formatCurrency(yearlyTotals.lastYear)
  }
}

// Helper function to calculate yearly totals
const getYearlyTotals = (orders: any[]) => {
  const totals = orders.reduce((acc, order) => {
    const year = order.dtemissao.split('/')[2]
    const faturamento = typeof order.total_faturamento === 'number' ? order.total_faturamento : 0
    acc[year] = (acc[year] || 0) + faturamento
    return acc
  }, {} as Record<string, number>)
  
  // Add formatted values
  const formattedTotals = Object.entries(totals).map(([year, value]) => ({
    year,
    value,
    formatted: formatCurrency(value as number)
  }))
  
  return formattedTotals
}

// Helper function to calculate totals
const calculateTotals = (orders: any[]) => {
  return orders.reduce((acc, order) => ({
    faturamento: acc.faturamento + (typeof order.total_faturamento === 'number' ? order.total_faturamento : 0),
    quantidade: acc.quantidade + (typeof order.qtdsku === 'number' ? order.qtdsku : 0),
    pedidos: acc.pedidos + 1
  }), { faturamento: 0, quantidade: 0, pedidos: 0 })
}

export async function GET(
  request: NextRequest,
  context: { params: { nmempresacurtovenda: string } }
) {
  try {
    const startTime = Date.now()
    const nmempresacurtovenda = decodeURIComponent(context.params.nmempresacurtovenda)
    
    // Fetch all data in parallel
    const [ordersPromise, quotationsPromise, performancePromise] = await Promise.all([
      // 1. Fetch store orders
      supabase
        .from('vw_vendamesporpedido_geral2')
        .select(`
          cdpedido,
          nrdocumento,
          dtemissao,
          nmpessoa,
          nmrepresentantevenda,
          nmempresacurtovenda,
          tpmovimentooperacao,
          qtdsku,
          total_faturamento,
          total_custo_produto,
          margem
        `)
        .eq('nmempresacurtovenda', nmempresacurtovenda)
        .neq('tpmovimentooperacao', 'Saída')
        .order('dtemissao', { ascending: false }),
      
      // 2. Fetch recent quotations
      supabase
        .from('vw_biorcamento_aux_agregado')
        .select('*')
        .eq('nmempresacurtovenda', nmempresacurtovenda)
        .order('data_ordenacao', { ascending: false })
        .order('cdpedidodevenda', { ascending: false })
        .limit(10),
      
      // 3. Fetch monthly performance
      supabase
        .from('vw_vendedor_mes_atual')
        .select('*')
        .eq('nmempresacurtovenda', nmempresacurtovenda)
    ])
    
    // Process results
    const { data: orders, error: ordersError } = ordersPromise
    const { data: quotations, error: quotationsError } = quotationsPromise
    const { data: performance, error: performanceError } = performancePromise
    
    // Handle errors
    if (ordersError) {
      throw new Error(`Error fetching orders: ${ordersError.message}`)
    }
    
    if (!orders || orders.length === 0) {
      return NextResponse.json({ 
        orders: [],
        quotations: [],
        performance: [],
        totals: { faturamento: 0, quantidade: 0, pedidos: 0 },
        monthlyData: [],
        yearlyComparison: { currentYear: 0, lastYear: 0, percentageChange: 0 },
        yearlyTotals: []
      })
    }
    
    // Pre-calculate all the derived data at the edge
    const monthlyData = getMonthlyData(orders)
    const yearlyComparison = getYearlyComparison(orders)
    const yearlyTotals = getYearlyTotals(orders)
    const totals = calculateTotals(orders)
    
    // Calculate monthly performance totals
    const monthlyTotals = performance?.reduce((acc: any, item: any) => {
      const faturamento = typeof item.total_faturamento === 'number' ? item.total_faturamento : 
                          typeof item.vlfaturamento === 'number' ? item.vlfaturamento : 0
      
      const custo = typeof item.total_custo_produto === 'number' ? item.total_custo_produto : 
                    typeof item.vltotalcustoproduto === 'number' ? item.vltotalcustoproduto : 0
      
      acc.faturamento += faturamento
      acc.custo += custo
      
      // Track performance by channel
      if (!acc.channels[item.nmempresacurtovenda]) {
        acc.channels[item.nmempresacurtovenda] = {
          faturamento: 0,
          custo: 0
        }
      }
      
      acc.channels[item.nmempresacurtovenda].faturamento += faturamento
      acc.channels[item.nmempresacurtovenda].custo += custo
      
      return acc
    }, { faturamento: 0, custo: 0, channels: {} }) || { faturamento: 0, custo: 0, channels: {} }
    
    // Calculate overall margin
    const monthlyMargin = monthlyTotals.faturamento > 0
      ? ((monthlyTotals.faturamento - (monthlyTotals.faturamento * 0.268 + monthlyTotals.custo)) / monthlyTotals.faturamento) * 100
      : 0
    
    // Prepare the consolidated response
    const response = {
      orders,
      quotations: quotationsError ? [] : quotations || [],
      performance: performanceError ? [] : performance || [],
      totals,
      monthlyData,
      yearlyComparison,
      yearlyTotals,
      monthlyTotals: {
        ...monthlyTotals,
        margin: monthlyMargin,
        formattedFaturamento: formatCurrency(monthlyTotals.faturamento)
      },
      processingTime: Date.now() - startTime
    }
    
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Edge API Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    )
  }
} 