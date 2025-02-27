'use client'

import { useState, useEffect } from 'react'
import { PermissionGuard } from '@/components/guards/permission-guard'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Loading from '../vendas-dia/loading'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink } from 'lucide-react'

// Define interfaces for the data
interface VendedorMensal {
  nmrepresentantevenda: string
  nmempresacurtovenda: string
  mes_pedido: string
  vlfaturamento: number
  vltotalcustoproduto: number
  margem: string
}

interface VendedorPerformance {
  nome: string
  filiais: {
    [filial: string]: {
      vlfaturamento: number
      vltotalcustoproduto: number
      margem: number
    }
  }
  total: {
    vlfaturamento: number
    vltotalcustoproduto: number
    margem: number
  }
}

interface FilialPerformance {
  nome: string
  vlfaturamento: number
  vltotalcustoproduto: number
  margem: number
  vendedores: number
}

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

// Meses para o filtro
const MESES = [
  { value: 'all', label: 'Todos os Meses' },
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
];

export default function DashboardVendas() {
  const router = useRouter()
  const [data, setData] = useState<VendedorMensal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filiais, setFiliais] = useState<string[]>([])
  const [selectedFilial, setSelectedFilial] = useState<string>('all')
  const [vendedoresPerformance, setVendedoresPerformance] = useState<VendedorPerformance[]>([])
  const [filiaisPerformance, setFiliaisPerformance] = useState<FilialPerformance[]>([])
  const [totalVendas, setTotalVendas] = useState(0)
  const [totalMargem, setTotalMargem] = useState(0)
  const [activeView, setActiveView] = useState('overview')
  
  // Novos estados para filtros de ano e mês
  const [anos, setAnos] = useState<string[]>([])
  const [selectedAno, setSelectedAno] = useState<string>('all')
  const [selectedMes, setSelectedMes] = useState<string>('all')

  // Fetch branches for filter
  useEffect(() => {
    const fetchFiliais = async () => {
      try {
        const response = await fetch('/api/vendedores/filiais')
        if (!response.ok) {
          throw new Error('Failed to fetch branches')
        }
        const data = await response.json()
        setFiliais(data)
      } catch (error) {
        console.error('Error fetching branches:', error)
        setError('Erro ao carregar filiais')
      }
    }

    fetchFiliais()
  }, [])

  // Fetch anos disponíveis
  useEffect(() => {
    const fetchAnos = async () => {
      try {
        const response = await fetch('/api/vendedores/anos')
        if (!response.ok) {
          throw new Error('Failed to fetch years')
        }
        const data = await response.json()
        
        // Ordenar anos em ordem decrescente
        const sortedAnos = [...data].sort((a, b) => b.localeCompare(a))
        setAnos(sortedAnos)
        
        // Definir o ano atual como padrão se disponível
        const currentYear = new Date().getFullYear().toString()
        if (sortedAnos.includes(currentYear)) {
          setSelectedAno(currentYear)
        } else if (sortedAnos.length > 0) {
          setSelectedAno(sortedAnos[0]) // Selecionar o ano mais recente
        }
      } catch (error) {
        console.error('Error fetching years:', error)
      }
    }

    fetchAnos()
  }, [])

  // Fetch sales data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Construir URL com todos os filtros
        let url = `/api/vendedores/mensal?`
        
        const params = new URLSearchParams()
        if (selectedFilial !== 'all') {
          params.append('branch', selectedFilial)
        }
        if (selectedAno !== 'all') {
          params.append('year', selectedAno)
        }
        if (selectedMes !== 'all') {
          params.append('month', selectedMes)
        }
        
        url += params.toString()
        
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error('Failed to fetch sales data')
        }
        
        const responseData = await response.json()
        setData(responseData)
        processData(responseData)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Erro ao carregar dados de vendas')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedFilial, selectedAno, selectedMes])

  // Process the data to get performance metrics
  const processData = (data: VendedorMensal[]) => {
    // Process vendedores performance
    const vendedoresMap = new Map<string, VendedorPerformance>()
    const filiaisMap = new Map<string, FilialPerformance>()
    let totalVendas = 0
    let totalCusto = 0

    data.forEach(item => {
      // Skip invalid data
      if (!item.nmrepresentantevenda || !item.nmempresacurtovenda) return
      
      // Parse margem from string (e.g., "1,14%" to 1.14) with null check
      let margemValue = 0
      if (item.margem) {
        try {
          margemValue = parseFloat(item.margem.replace('%', '').replace(',', '.'))
        } catch (e) {
          console.warn('Error parsing margem:', item.margem)
        }
      }
      
      // Update vendedor data
      if (!vendedoresMap.has(item.nmrepresentantevenda)) {
        vendedoresMap.set(item.nmrepresentantevenda, {
          nome: item.nmrepresentantevenda,
          filiais: {},
          total: {
            vlfaturamento: 0,
            vltotalcustoproduto: 0,
            margem: 0
          }
        })
      }
      
      const vendedor = vendedoresMap.get(item.nmrepresentantevenda)!
      
      // Add filial data for this vendedor
      if (!vendedor.filiais[item.nmempresacurtovenda]) {
        vendedor.filiais[item.nmempresacurtovenda] = {
          vlfaturamento: 0,
          vltotalcustoproduto: 0,
          margem: 0
        }
      }
      
      // Update filial data with null checks
      vendedor.filiais[item.nmempresacurtovenda].vlfaturamento += item.vlfaturamento || 0
      vendedor.filiais[item.nmempresacurtovenda].vltotalcustoproduto += item.vltotalcustoproduto || 0
      
      // Update vendedor totals
      vendedor.total.vlfaturamento += item.vlfaturamento || 0
      vendedor.total.vltotalcustoproduto += item.vltotalcustoproduto || 0
      
      // Update filial performance
      if (!filiaisMap.has(item.nmempresacurtovenda)) {
        filiaisMap.set(item.nmempresacurtovenda, {
          nome: item.nmempresacurtovenda,
          vlfaturamento: 0,
          vltotalcustoproduto: 0,
          margem: 0,
          vendedores: 0
        })
      }
      
      const filial = filiaisMap.get(item.nmempresacurtovenda)!
      filial.vlfaturamento += item.vlfaturamento || 0
      filial.vltotalcustoproduto += item.vltotalcustoproduto || 0
      
      // Update global totals
      totalVendas += item.vlfaturamento || 0
      totalCusto += item.vltotalcustoproduto || 0
    })
    
    // Calculate margins for vendedores
    vendedoresMap.forEach(vendedor => {
      // Calculate margin for each filial
      Object.keys(vendedor.filiais).forEach(filialNome => {
        const filial = vendedor.filiais[filialNome]
        filial.margem = calculateMargem(filial.vlfaturamento, filial.vltotalcustoproduto)
      })
      
      // Calculate total margin
      vendedor.total.margem = calculateMargem(vendedor.total.vlfaturamento, vendedor.total.vltotalcustoproduto)
    })
    
    // Calculate margins for filiais and count unique vendedores
    const vendedoresPorFilial = new Map<string, Set<string>>()
    
    data.forEach(item => {
      if (!item.nmempresacurtovenda) return
      
      if (!vendedoresPorFilial.has(item.nmempresacurtovenda)) {
        vendedoresPorFilial.set(item.nmempresacurtovenda, new Set())
      }
      if (item.nmrepresentantevenda) {
        vendedoresPorFilial.get(item.nmempresacurtovenda)!.add(item.nmrepresentantevenda)
      }
    })
    
    filiaisMap.forEach((filial, nome) => {
      filial.margem = calculateMargem(filial.vlfaturamento, filial.vltotalcustoproduto)
      filial.vendedores = vendedoresPorFilial.get(nome)?.size || 0
    })
    
    // Sort vendedores by total sales
    const sortedVendedores = Array.from(vendedoresMap.values())
      .sort((a, b) => b.total.vlfaturamento - a.total.vlfaturamento)
    
    // Sort filiais by total sales
    const sortedFiliais = Array.from(filiaisMap.values())
      .sort((a, b) => b.vlfaturamento - a.vlfaturamento)
    
    // Calculate total margin
    const totalMargemValue = calculateMargem(totalVendas, totalCusto)
    
    setVendedoresPerformance(sortedVendedores)
    setFiliaisPerformance(sortedFiliais)
    setTotalVendas(totalVendas)
    setTotalMargem(totalMargemValue)
  }
  
  // Calculate margin using the same formula as in the existing code
  const calculateMargem = (faturamento: number, custo: number): number => {
    if (faturamento === 0) return 0
    return ((faturamento - (faturamento * 0.268 + custo)) / faturamento) * 100
  }
  
  // Get background color based on margin
  const getMarginBackgroundColor = (margin: number) => {
    if (margin >= 5) return 'bg-green-50 dark:bg-green-900/20'
    if (margin >= 0) return 'bg-yellow-50 dark:bg-yellow-900/20'
    return 'bg-red-50 dark:bg-red-900/20'
  }
  
  // Get text color based on margin
  const getMarginTextColor = (margin: number) => {
    if (margin >= 5) return 'text-green-600 dark:text-green-400'
    if (margin >= 0) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  // Formatar o título do período selecionado
  const getPeriodoTitle = () => {
    let periodo = ''
    
    if (selectedMes !== 'all' && selectedAno !== 'all') {
      const mesNome = MESES.find(m => m.value === selectedMes)?.label
      periodo = `${mesNome} de ${selectedAno}`
    } else if (selectedAno !== 'all') {
      periodo = `Ano de ${selectedAno}`
    } else if (selectedMes !== 'all') {
      const mesNome = MESES.find(m => m.value === selectedMes)?.label
      periodo = `${mesNome} (Todos os Anos)`
    } else {
      periodo = 'Todo o Período'
    }
    
    return periodo
  }

  if (isLoading) return <Loading />

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              {error}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Prepare data for branch performance chart
  const branchChartData = filiaisPerformance.map(filial => ({
    name: filial.nome,
    value: filial.vlfaturamento,
    margin: filial.margem.toFixed(2)
  }))

  // Prepare data for top salespeople chart
  const topSalespeopleData = vendedoresPerformance
    .slice(0, 10)
    .map(vendedor => ({
      name: vendedor.nome,
      value: vendedor.total.vlfaturamento,
      margin: vendedor.total.margem.toFixed(2)
    }))

  return (
    <PermissionGuard permission="sales">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard de Vendas
          </h1>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filial:</span>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={selectedFilial}
                onChange={(e) => setSelectedFilial(e.target.value)}
              >
                <option value="all">Todas as Filiais</option>
                {filiais.map(filial => (
                  <option key={filial} value={filial}>
                    {filial}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Ano:</span>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={selectedAno}
                onChange={(e) => setSelectedAno(e.target.value)}
              >
                <option value="all">Todos os Anos</option>
                {anos.map(ano => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Mês:</span>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={selectedMes}
                onChange={(e) => setSelectedMes(e.target.value)}
              >
                {MESES.map(mes => (
                  <option key={mes.value} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Período: <span className="font-medium">{getPeriodoTitle()}</span>
          {selectedFilial !== 'all' && (
            <span> | Filial: <span className="font-medium">{selectedFilial}</span></span>
          )}
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Card className={getMarginBackgroundColor(totalMargem)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Faturamento Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalVendas.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </div>
              <div className={`text-sm font-medium ${getMarginTextColor(totalMargem)}`}>
                Margem: {totalMargem.toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          {filiaisPerformance.slice(0, 3).map((filial, index) => (
            <Card key={filial.nome} className={getMarginBackgroundColor(filial.margem)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {filial.nome}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filial.vlfaturamento.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </div>
                <div className="flex justify-between">
                  <div className={`text-sm font-medium ${getMarginTextColor(filial.margem)}`}>
                    Margem: {filial.margem.toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {filial.vendedores} vendedores
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex space-x-2 border-b">
          <button
            className={`px-4 py-2 font-medium text-sm ${activeView === 'overview' ? 'border-b-2 border-primary' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            Visão Geral
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${activeView === 'vendedores' ? 'border-b-2 border-primary' : ''}`}
            onClick={() => setActiveView('vendedores')}
          >
            Vendedores
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${activeView === 'filiais' ? 'border-b-2 border-primary' : ''}`}
            onClick={() => setActiveView('filiais')}
          >
            Filiais
          </button>
        </div>
        
        {activeView === 'overview' && (
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Faturamento por Filial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {branchChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={branchChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {branchChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [
                              new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(value),
                              'Faturamento'
                            ]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Nenhum dado disponível para o período selecionado</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Top 10 Vendedores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {topSalespeopleData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topSalespeopleData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" 
                            tickFormatter={(value) => 
                              new Intl.NumberFormat('pt-BR', {
                                notation: 'compact',
                                compactDisplay: 'short',
                                style: 'currency',
                                currency: 'BRL'
                              }).format(value)
                            }
                          />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            width={80}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            formatter={(value: number) => [
                              new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(value),
                              'Faturamento'
                            ]}
                          />
                          <Bar dataKey="value" fill="#2563eb" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Nenhum dado disponível para o período selecionado</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {activeView === 'vendedores' && (
          <div className="space-y-4">
            {vendedoresPerformance.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {vendedoresPerformance.map(vendedor => (
                  <Card 
                    key={vendedor.nome} 
                    className={`${getMarginBackgroundColor(vendedor.total.margem)} cursor-pointer hover:shadow-md transition-shadow relative group`}
                    onClick={() => {
                      // Abrir em uma nova aba/página
                      window.open(`/vendedor/${encodeURIComponent(vendedor.nome)}`, '_blank');
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex justify-between items-center">
                        <span className="truncate" title={vendedor.nome}>{vendedor.nome}</span>
                        <span className={getMarginTextColor(vendedor.total.margem)}>
                          {vendedor.total.margem.toFixed(2)}%
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold mb-2">
                        {vendedor.total.vlfaturamento.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </div>
                      <div className="space-y-1">
                        {Object.entries(vendedor.filiais)
                          .sort(([, a], [, b]) => b.vlfaturamento - a.vlfaturamento)
                          .map(([filialNome, filialData]) => (
                            <div key={filialNome} className="flex justify-between text-xs">
                              <span className="truncate" title={filialNome}>{filialNome}:</span>
                              <span className={getMarginTextColor(filialData.margem)}>
                                {new Intl.NumberFormat('pt-BR', {
                                  notation: 'compact',
                                  compactDisplay: 'short',
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(filialData.vlfaturamento)}
                                {' '}({filialData.margem.toFixed(1)}%)
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink size={14} className="text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    Nenhum dado disponível para o período selecionado
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {activeView === 'filiais' && (
          <div className="space-y-4">
            {filiaisPerformance.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filiaisPerformance.map(filial => (
                  <Card key={filial.nome} className={getMarginBackgroundColor(filial.margem)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex justify-between items-center">
                        <span>{filial.nome}</span>
                        <span className={getMarginTextColor(filial.margem)}>
                          {filial.margem.toFixed(2)}%
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold mb-2">
                        {filial.vlfaturamento.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Custo:</span>
                        <span>
                          {filial.vltotalcustoproduto.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Vendedores:</span>
                        <span>{filial.vendedores}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    Nenhum dado disponível para o período selecionado
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </PermissionGuard>
  )
} 