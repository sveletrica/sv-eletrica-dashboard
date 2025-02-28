'use client'

import { useState, useEffect } from 'react'
import { PermissionGuard } from '@/components/guards/permission-guard'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"
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

// Meta de faturamento mensal
const META_FATURAMENTO = 20300000;

// Metas por filial
const METAS_FILIAIS: Record<string, number> = {
  "Corporativo": 17380000,
  "SV WS EXPRESS": 1350000,
  "SV MARACANAU": 700000
};

// Lista de feriados 2025
const FERIADOS = [
  "2025-01-01", // Ano Novo
  "2025-03-03", // Segunda de Carnaval
  "2025-03-04", // Terça de Carnaval
  "2025-03-19", // São José
  "2025-03-25", // Data Magna do Ceará
  "2025-04-18", // Sexta-feira Santa
  "2025-04-21", // Tiradentes
  "2025-05-01", // Dia do Trabalho
  "2025-06-19", // Corpus Christi
  "2025-08-15", // Nossa Senhora da Assunção
  "2025-09-07", // Independência do Brasil
  "2025-10-12", // Nossa Senhora Aparecida
  "2025-11-02", // Finados
  "2025-11-15", // Proclamação da República
  "2025-11-20", // Dia da Consciência Negra
  "2025-12-25"  // Natal
];

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
  
  // Obter o mês atual (formato '01', '02', etc.)
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')
  
  // Novos estados para filtros de ano e mês
  const [anos, setAnos] = useState<string[]>([])
  const [selectedAno, setSelectedAno] = useState<string>(new Date().getFullYear().toString())
  const [selectedMes, setSelectedMes] = useState<string>(currentMonth)

  const [diasUteisInfo, setDiasUteisInfo] = useState<{
    diasUteisDecorridos: number;
    diasUteisRestantes: number;
    mediaPorDiaUtil: number;
    projecaoFaturamento: number;
  }>({
    diasUteisDecorridos: 0,
    diasUteisRestantes: 0,
    mediaPorDiaUtil: 0,
    projecaoFaturamento: 0
  });

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
      
      // Agrupar SV FILIAL e SV MATRIZ como "Corporativo"
      let filialNome = item.nmempresacurtovenda
      if (filialNome === "SV FILIAL" || filialNome === "SV MATRIZ") {
        filialNome = "Corporativo"
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
      if (!vendedor.filiais[filialNome]) {
        vendedor.filiais[filialNome] = {
          vlfaturamento: 0,
          vltotalcustoproduto: 0,
          margem: 0
        }
      }
      
      // Update filial data with null checks
      vendedor.filiais[filialNome].vlfaturamento += item.vlfaturamento || 0
      vendedor.filiais[filialNome].vltotalcustoproduto += item.vltotalcustoproduto || 0
      
      // Update vendedor totals
      vendedor.total.vlfaturamento += item.vlfaturamento || 0
      vendedor.total.vltotalcustoproduto += item.vltotalcustoproduto || 0
      
      // Update filial performance
      if (!filiaisMap.has(filialNome)) {
        filiaisMap.set(filialNome, {
          nome: filialNome,
          vlfaturamento: 0,
          vltotalcustoproduto: 0,
          margem: 0,
          vendedores: 0
        })
      }
      
      const filial = filiaisMap.get(filialNome)!
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
      
      // Agrupar SV FILIAL e SV MATRIZ como "Corporativo"
      let filialNome = item.nmempresacurtovenda
      if (filialNome === "SV FILIAL" || filialNome === "SV MATRIZ") {
        filialNome = "Corporativo"
      }
      
      if (!vendedoresPorFilial.has(filialNome)) {
        vendedoresPorFilial.set(filialNome, new Set())
      }
      if (item.nmrepresentantevenda) {
        vendedoresPorFilial.get(filialNome)!.add(item.nmrepresentantevenda)
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

  // Get progress color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600 dark:text-green-400'
    if (percentage >= 75) return 'text-blue-600 dark:text-blue-400'
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  // Calcular projeção para uma filial específica
  const calcularProjecaoFilial = (faturamentoAtual: number, filialNome: string, diasUteisInfo: any) => {
    if (diasUteisInfo.diasUteisDecorridos === 0) return { projecao: 0, percentualMeta: 0 };
    
    const mediaPorDiaUtil = faturamentoAtual / diasUteisInfo.diasUteisDecorridos;
    const projecao = faturamentoAtual + (mediaPorDiaUtil * diasUteisInfo.diasUteisRestantes);
    
    const meta = METAS_FILIAIS[filialNome] || 0;
    const percentualMeta = meta > 0 ? (projecao / meta) * 100 : 0;
    
    return { projecao, percentualMeta, meta };
  };

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

  // Função para calcular dias úteis e projeção de faturamento
  const calcularDiasUteis = (feriados: string[]) => {
    // Data atual
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Primeiro dia do mês atual
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    primeiroDiaMes.setHours(0, 0, 0, 0);
    
    // Último dia do mês atual
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    ultimoDiaMes.setHours(0, 0, 0, 0);
    
    // Arrays para armazenar os dias
    const diasUteis = [];
    const diasUteisDecorridos = [];
    
    // Itera do primeiro dia do mês até ontem para dias decorridos
    const dataIteracaoDecorridos = new Date(primeiroDiaMes);
    while (dataIteracaoDecorridos < hoje) {
      const dataFormatada = dataIteracaoDecorridos.toISOString().split('T')[0];
      
      // Verifica se é dia útil (não é fim de semana)
      if (dataIteracaoDecorridos.getDay() !== 0 && dataIteracaoDecorridos.getDay() !== 6) {
        // Verifica se não é feriado
        if (!feriados.includes(dataFormatada)) {
          diasUteisDecorridos.push(dataFormatada);
        }
      }
      
      // Avança para o próximo dia
      dataIteracaoDecorridos.setDate(dataIteracaoDecorridos.getDate() + 1);
    }
    
    // Itera para dias restantes (a partir de hoje)
    const dataIteracao = new Date(hoje);
    while (dataIteracao <= ultimoDiaMes) {
      const dataFormatada = dataIteracao.toISOString().split('T')[0];
      
      // Verifica se é dia útil (não é fim de semana)
      if (dataIteracao.getDay() !== 0 && dataIteracao.getDay() !== 6) {
        // Verifica se não é feriado
        if (!feriados.includes(dataFormatada)) {
          diasUteis.push(dataFormatada);
        }
      }
      
      // Avança para o próximo dia
      dataIteracao.setDate(dataIteracao.getDate() + 1);
    }
    
    return {
      diasUteisDecorridos: diasUteisDecorridos.length,
      diasUteisRestantes: diasUteis.length
    };
  };

  // Calcular dias úteis e projeção quando o componente montar
  useEffect(() => {
    const diasInfo = calcularDiasUteis(FERIADOS);
    setDiasUteisInfo({
      ...diasInfo,
      mediaPorDiaUtil: 0,
      projecaoFaturamento: 0
    });
  }, []);

  // Atualizar média por dia útil e projeção quando o faturamento mudar
  useEffect(() => {
    if (diasUteisInfo.diasUteisDecorridos > 0) {
      const mediaPorDiaUtil = totalVendas / diasUteisInfo.diasUteisDecorridos;
      const projecaoFaturamento = totalVendas + (mediaPorDiaUtil * diasUteisInfo.diasUteisRestantes);
      
      setDiasUteisInfo(prev => ({
        ...prev,
        mediaPorDiaUtil,
        projecaoFaturamento
      }));
    }
  }, [totalVendas, diasUteisInfo.diasUteisDecorridos, diasUteisInfo.diasUteisRestantes]);

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
  const branchChartData = filiaisPerformance.map((filial, index) => ({
    name: filial.nome,
    value: filial.vlfaturamento,
    margin: filial.margem.toFixed(2),
    fill: COLORS[index % COLORS.length]
  }))

  // Prepare data for top salespeople chart
  const topSalespeopleData = vendedoresPerformance
    .slice(0, 10)
    .map((vendedor, index) => ({
      name: vendedor.nome,
      value: vendedor.total.vlfaturamento,
      margin: vendedor.total.margem.toFixed(2),
      fill: COLORS[index % COLORS.length]
    }))

  // Create chart configs
  const branchChartConfig = filiaisPerformance.reduce((acc, filial, index) => {
    acc[filial.nome] = {
      label: filial.nome,
      color: COLORS[index % COLORS.length]
    };
    return acc;
  }, {
    value: {
      label: "Faturamento",
      color: "#2563eb"
    }
  } as Record<string, { label: string, color: string }>);

  const topSalespeopleChartConfig = vendedoresPerformance.slice(0, 10).reduce((acc, vendedor, index) => {
    acc[vendedor.nome] = {
      label: vendedor.nome,
      color: COLORS[index % COLORS.length]
    };
    return acc;
  }, {
    value: {
      label: "Faturamento",
      color: "#2563eb"
    }
  } as Record<string, { label: string, color: string }>);

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
              
              {/* Informação sobre a meta de faturamento */}
              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span>Meta mensal:</span>
                  <span>{META_FATURAMENTO.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}</span>
                </div>
                
                {totalVendas < META_FATURAMENTO ? (
                  <div className="flex justify-between text-sm">
                    <span>Falta atingir:</span>
                    <span className="font-medium">{(META_FATURAMENTO - totalVendas).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span>Meta superada:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{(totalVendas - META_FATURAMENTO).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}</span>
                  </div>
                )}
                
                <div className="mt-1">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.min(100, (totalVendas / META_FATURAMENTO) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className={`text-xs font-medium ${getProgressColor((totalVendas / META_FATURAMENTO) * 100)}`}>
                      {((totalVendas / META_FATURAMENTO) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Informação sobre projeção de faturamento */}
              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span>Dias úteis decorridos:</span>
                  <span>{diasUteisInfo.diasUteisDecorridos}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Dias úteis restantes:</span>
                  <span>{diasUteisInfo.diasUteisRestantes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Média por dia útil:</span>
                  <span>{diasUteisInfo.mediaPorDiaUtil.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}</span>
                </div>
                <div className="flex justify-between text-sm font-medium mt-1">
                  <span>Projeção mensal:</span>
                  <span className={diasUteisInfo.projecaoFaturamento >= META_FATURAMENTO ? 
                    'text-green-600 dark:text-green-400' : 
                    'text-yellow-600 dark:text-yellow-400'
                  }>
                    {diasUteisInfo.projecaoFaturamento.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </span>
                </div>
                
                {/* Barra de progresso da projeção */}
                <div className="mt-1">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${diasUteisInfo.projecaoFaturamento >= META_FATURAMENTO ? 'bg-green-600' : 'bg-yellow-600'}`}
                      style={{ width: `${Math.min(100, (diasUteisInfo.projecaoFaturamento / META_FATURAMENTO) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className={`text-xs font-medium ${getProgressColor((diasUteisInfo.projecaoFaturamento / META_FATURAMENTO) * 100)}`}>
                      {((diasUteisInfo.projecaoFaturamento / META_FATURAMENTO) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
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
                
                {/* Meta e projeção para a filial */}
                {METAS_FILIAIS[filial.nome] && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Meta mensal:</span>
                      <span>{METAS_FILIAIS[filial.nome].toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}</span>
                    </div>
                    
                    {filial.vlfaturamento < METAS_FILIAIS[filial.nome] ? (
                      <div className="flex justify-between text-sm">
                        <span>Falta atingir:</span>
                        <span className="font-medium">{(METAS_FILIAIS[filial.nome] - filial.vlfaturamento).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span>Meta superada:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">{(filial.vlfaturamento - METAS_FILIAIS[filial.nome]).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}</span>
                      </div>
                    )}
                    
                    <div className="mt-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${Math.min(100, (filial.vlfaturamento / METAS_FILIAIS[filial.nome]) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-end mt-1">
                        <span className={`text-xs font-medium ${getProgressColor((filial.vlfaturamento / METAS_FILIAIS[filial.nome]) * 100)}`}>
                          {((filial.vlfaturamento / METAS_FILIAIS[filial.nome]) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Projeção para a filial */}
                    {diasUteisInfo.diasUteisDecorridos > 0 && (
                      <>
                        {(() => {
                          const { projecao, percentualMeta } = calcularProjecaoFilial(
                            filial.vlfaturamento, 
                            filial.nome, 
                            diasUteisInfo
                          );
                          
                          return (
                            <div className="mt-2 pt-2 border-t">
                              <div className="flex justify-between text-sm font-medium">
                                <span>Projeção mensal:</span>
                                <span className={projecao >= METAS_FILIAIS[filial.nome] ? 
                                  'text-green-600 dark:text-green-400' : 
                                  'text-yellow-600 dark:text-yellow-400'
                                }>
                                  {projecao.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  })}
                                </span>
                              </div>
                              
                              <div className="mt-1">
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                  <div 
                                    className={`h-2.5 rounded-full ${projecao >= METAS_FILIAIS[filial.nome] ? 'bg-green-600' : 'bg-yellow-600'}`}
                                    style={{ width: `${Math.min(100, percentualMeta)}%` }}
                                  ></div>
                                </div>
                                <div className="flex justify-end mt-1">
                                  <span className={`text-xs font-medium ${getProgressColor(percentualMeta)}`}>
                                    {percentualMeta.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}
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
                  <div className="h-[350px] w-full">
                    {branchChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                          <Tooltip 
                            formatter={(value) => [
                              new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(Number(value)),
                              'Faturamento'
                            ]}
                          />
                          <Legend 
                            layout="vertical" 
                            verticalAlign="middle" 
                            align="right"
                          />
                          <Pie
                            data={branchChartData}
                            cx="40%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                          >
                            {branchChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
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
                      <ChartContainer 
                        config={topSalespeopleChartConfig}
                        className="h-[300px]"
                      >
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
                          <ChartTooltip 
                            content={
                              <ChartTooltipContent 
                                formatter={(value) => [
                                  new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(Number(value)),
                                  'Faturamento'
                                ]}
                              />
                            }
                          />
                          <Bar dataKey="value" fill="#2563eb" />
                        </BarChart>
                      </ChartContainer>
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
                      
                      {/* Meta e projeção para a filial na visão detalhada */}
                      {METAS_FILIAIS[filial.nome] && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex justify-between text-sm">
                            <span>Meta mensal:</span>
                            <span>{METAS_FILIAIS[filial.nome].toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}</span>
                          </div>
                          
                          {filial.vlfaturamento < METAS_FILIAIS[filial.nome] ? (
                            <div className="flex justify-between text-sm">
                              <span>Falta atingir:</span>
                              <span className="font-medium">{(METAS_FILIAIS[filial.nome] - filial.vlfaturamento).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between text-sm">
                              <span>Meta superada:</span>
                              <span className="font-medium text-green-600 dark:text-green-400">{(filial.vlfaturamento - METAS_FILIAIS[filial.nome]).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}</span>
                            </div>
                          )}
                          
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                              <div 
                                className="bg-blue-600 h-2.5 rounded-full" 
                                style={{ width: `${Math.min(100, (filial.vlfaturamento / METAS_FILIAIS[filial.nome]) * 100)}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-end mt-1">
                              <span className={`text-xs font-medium ${getProgressColor((filial.vlfaturamento / METAS_FILIAIS[filial.nome]) * 100)}`}>
                                {((filial.vlfaturamento / METAS_FILIAIS[filial.nome]) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          
                          {/* Projeção para a filial */}
                          {diasUteisInfo.diasUteisDecorridos > 0 && (
                            <>
                              {(() => {
                                const { projecao, percentualMeta } = calcularProjecaoFilial(
                                  filial.vlfaturamento, 
                                  filial.nome, 
                                  diasUteisInfo
                                );
                                
                                return (
                                  <div className="mt-2 pt-2 border-t">
                                    <div className="flex justify-between text-sm font-medium">
                                      <span>Projeção mensal:</span>
                                      <span className={projecao >= METAS_FILIAIS[filial.nome] ? 
                                        'text-green-600 dark:text-green-400' : 
                                        'text-yellow-600 dark:text-yellow-400'
                                      }>
                                        {projecao.toLocaleString('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL'
                                        })}
                                      </span>
                                    </div>
                                    
                                    <div className="mt-1">
                                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                        <div 
                                          className={`h-2.5 rounded-full ${projecao >= METAS_FILIAIS[filial.nome] ? 'bg-green-600' : 'bg-yellow-600'}`}
                                          style={{ width: `${Math.min(100, percentualMeta)}%` }}
                                        ></div>
                                      </div>
                                      <div className="flex justify-end mt-1">
                                        <span className={`text-xs font-medium ${getProgressColor(percentualMeta)}`}>
                                          {percentualMeta.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      )}
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