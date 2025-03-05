'use client';

import { useState, useEffect } from 'react';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import Loading from '../vendas-dia/loading';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { FERIADOS } from '@/app/config/feriados';
import { 
  getMetaGeral, 
  getMetaFilial 
} from '@/app/config/metas';

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
  const router = useRouter();
  const [data, setData] = useState<VendedorMensal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filiais, setFiliais] = useState<string[]>([]);
  const [selectedFilial, setSelectedFilial] = useState<string>('all');
  const [vendedoresPerformance, setVendedoresPerformance] = useState<VendedorPerformance[]>([]);
  const [filiaisPerformance, setFiliaisPerformance] = useState<FilialPerformance[]>([]);
  const [totalVendas, setTotalVendas] = useState(0);
  const [totalMargem, setTotalMargem] = useState(0);
  const [activeView, setActiveView] = useState('overview');
  
  // Obter o mês atual (formato '01', '02', etc.)
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  
  // Novos estados para filtros de ano e mês
  const [anos, setAnos] = useState<string[]>([]);
  const [selectedAno, setSelectedAno] = useState<string>(new Date().getFullYear().toString());
  const [selectedMes, setSelectedMes] = useState<string>(currentMonth);

  const [diasUteisInfo, setDiasUteisInfo] = useState<{
    diasUteisTotais: number;
    diasUteisDecorridos: number;
    diasUteisRestantes: number;
    mediaPorDiaUtil: number;
    projecaoFaturamento: number;
  }>({
    diasUteisTotais: 0,
    diasUteisDecorridos: 0,
    diasUteisRestantes: 0,
    mediaPorDiaUtil: 0,
    projecaoFaturamento: 0
  });

  // Fetch branches for filter
  useEffect(() => {
    const fetchFiliais = async () => {
      try {
        const response = await fetch('/api/vendedores/filiais');
        if (!response.ok) {
          throw new Error('Failed to fetch branches');
        }
        const data = await response.json();
        setFiliais(data);
      } catch (error) {
        console.error('Error fetching branches:', error);
        setError('Erro ao carregar filiais');
      }
    };

    fetchFiliais();
  }, []);

  // Fetch anos disponíveis
  useEffect(() => {
    const fetchAnos = async () => {
      try {
        const response = await fetch('/api/vendedores/anos');
        if (!response.ok) {
          throw new Error('Failed to fetch years');
        }
        const data = await response.json();
        
        // Ordenar anos em ordem decrescente
        const sortedAnos = [...data].sort((a, b) => b.localeCompare(a));
        setAnos(sortedAnos);
        
        // Definir o ano atual como padrão se disponível
        const currentYear = new Date().getFullYear().toString();
        if (sortedAnos.includes(currentYear)) {
          setSelectedAno(currentYear);
        } else if (sortedAnos.length > 0) {
          setSelectedAno(sortedAnos[0]); // Selecionar o ano mais recente
        }
      } catch (error) {
        console.error('Error fetching years:', error);
      }
    };

    fetchAnos();
  }, []);

  // Fetch sales data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Construir URL com todos os filtros
        let url = `/api/vendedores/mensal?`;
        
        const params = new URLSearchParams();
        if (selectedFilial !== 'all') {
          params.append('branch', selectedFilial);
        }
        if (selectedAno !== 'all') {
          params.append('year', selectedAno);
        }
        if (selectedMes !== 'all') {
          params.append('month', selectedMes);
        }
        
        url += params.toString();
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch sales data');
        }
        
        const responseData = await response.json();
        setData(responseData);
        processData(responseData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Erro ao carregar dados de vendas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedFilial, selectedAno, selectedMes]);

  // Process the data to get performance metrics
  const processData = (data: VendedorMensal[]) => {
    // Process vendedores performance
    const vendedoresMap = new Map<string, VendedorPerformance>();
    const filiaisMap = new Map<string, FilialPerformance>();
    let totalVendas = 0;
    let totalCusto = 0;

    data.forEach(item => {
      // Skip invalid data
      if (!item.nmrepresentantevenda || !item.nmempresacurtovenda) return;
      
      // Parse margem from string (e.g., "1,14%" to 1.14) with null check
      let margemValue = 0;
      if (item.margem) {
        try {
          margemValue = parseFloat(item.margem.replace('%', '').replace(',', '.'));
        } catch (e) {
          console.warn('Error parsing margem:', item.margem);
        }
      }
      
      // Agrupar SV FILIAL e SV MATRIZ como "Corporativo"
      let filialNome = item.nmempresacurtovenda;
      if (filialNome === "SV FILIAL" || filialNome === "SV MATRIZ") {
        filialNome = "Corporativo";
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
        });
      }
      
      const vendedor = vendedoresMap.get(item.nmrepresentantevenda)!;
      
      // Add filial data for this vendedor
      if (!vendedor.filiais[filialNome]) {
        vendedor.filiais[filialNome] = {
          vlfaturamento: 0,
          vltotalcustoproduto: 0,
          margem: 0
        };
      }
      
      // Update filial data with null checks
      vendedor.filiais[filialNome].vlfaturamento += item.vlfaturamento || 0;
      vendedor.filiais[filialNome].vltotalcustoproduto += item.vltotalcustoproduto || 0;
      
      // Update vendedor totals
      vendedor.total.vlfaturamento += item.vlfaturamento || 0;
      vendedor.total.vltotalcustoproduto += item.vltotalcustoproduto || 0;
      
      // Update filial performance
      if (!filiaisMap.has(filialNome)) {
        filiaisMap.set(filialNome, {
          nome: filialNome,
          vlfaturamento: 0,
          vltotalcustoproduto: 0,
          margem: 0,
          vendedores: 0
        });
      }
      
      const filial = filiaisMap.get(filialNome)!;
      filial.vlfaturamento += item.vlfaturamento || 0;
      filial.vltotalcustoproduto += item.vltotalcustoproduto || 0;
      
      // Update global totals
      totalVendas += item.vlfaturamento || 0;
      totalCusto += item.vltotalcustoproduto || 0;
    });
    
    // Calculate margins for vendedores
    vendedoresMap.forEach(vendedor => {
      // Calculate margin for each filial
      Object.keys(vendedor.filiais).forEach(filialNome => {
        const filial = vendedor.filiais[filialNome];
        filial.margem = calculateMargem(filial.vlfaturamento, filial.vltotalcustoproduto);
      });
      
      // Calculate total margin
      vendedor.total.margem = calculateMargem(vendedor.total.vlfaturamento, vendedor.total.vltotalcustoproduto);
    });
    
    // Calculate margins for filiais and count unique vendedores
    const vendedoresPorFilial = new Map<string, Set<string>>();
    
    data.forEach(item => {
      if (!item.nmempresacurtovenda) return;
      
      // Agrupar SV FILIAL e SV MATRIZ como "Corporativo"
      let filialNome = item.nmempresacurtovenda;
      if (filialNome === "SV FILIAL" || filialNome === "SV MATRIZ") {
        filialNome = "Corporativo";
      }
      
      if (!vendedoresPorFilial.has(filialNome)) {
        vendedoresPorFilial.set(filialNome, new Set());
      }
      if (item.nmrepresentantevenda) {
        vendedoresPorFilial.get(filialNome)!.add(item.nmrepresentantevenda);
      }
    });
    
    filiaisMap.forEach((filial, nome) => {
      filial.margem = calculateMargem(filial.vlfaturamento, filial.vltotalcustoproduto);
      filial.vendedores = vendedoresPorFilial.get(nome)?.size || 0;
    });
    
    // Sort vendedores by total sales
    const sortedVendedores = Array.from(vendedoresMap.values())
      .sort((a, b) => b.total.vlfaturamento - a.total.vlfaturamento);
    
    // Sort filiais by total sales
    const sortedFiliais = Array.from(filiaisMap.values())
      .sort((a, b) => b.vlfaturamento - a.vlfaturamento);
    
    // Calculate total margin
    const totalMargemValue = calculateMargem(totalVendas, totalCusto);
    
    setVendedoresPerformance(sortedVendedores);
    setFiliaisPerformance(sortedFiliais);
    setTotalVendas(totalVendas);
    setTotalMargem(totalMargemValue);
  };
  
  // Calculate margin using the same formula as in the existing code
  const calculateMargem = (faturamento: number, custo: number): number => {
    if (faturamento === 0) return 0;
    return ((faturamento - (faturamento * 0.268 + custo)) / faturamento) * 100;
  };
  
  // Get background color based on margin
  const getMarginBackgroundColor = (margin: number) => {
    if (margin >= 5) return 'bg-green-50 dark:bg-green-900/20';
    if (margin >= 0) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  };
  
  // Get text color based on margin
  const getMarginTextColor = (margin: number) => {
    if (margin >= 5) return 'text-green-600 dark:text-green-400';
    if (margin >= 0) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Get progress color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600 dark:text-green-400';
    if (percentage >= 75) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Calcular projeção para uma filial específica
  const calcularProjecaoFilial = (faturamentoAtual: number, filialNome: string, diasUteisInfo: any) => {
    if (diasUteisInfo.diasUteisDecorridos === 0 || diasUteisInfo.diasUteisRestantes === 0) {
      return { projecao: faturamentoAtual, percentualMeta: 0, meta: 0 };
    }
    
    const mediaPorDiaUtil = faturamentoAtual / diasUteisInfo.diasUteisDecorridos;
    
    // Verificar se hoje é o último dia útil do mês
    const ehUltimoDiaUtil = diasUteisInfo.diasUteisRestantes === 1 && 
                            diasUteisInfo.diasUteisDecorridos + diasUteisInfo.diasUteisRestantes === diasUteisInfo.diasUteisTotais;
    
    let projecao = faturamentoAtual;
    
    if (ehUltimoDiaUtil) {
      // Se hoje é o último dia útil, calculamos a projeção considerando que ainda temos
      // parte do dia para faturar. Assumimos que o faturamento do dia será proporcional
      // à parte do dia que já passou.
      const agora = new Date();
      const horaAtual = agora.getHours() + (agora.getMinutes() / 60);
      const jornadaTrabalho = 9; // Considerando uma jornada de 9h (8h às 17h)
      const percentualDiaDecorrido = Math.min(horaAtual / jornadaTrabalho, 1);
      
      // Se já estamos fora do horário comercial, consideramos o dia como completo
      if (horaAtual >= jornadaTrabalho) {
        projecao = faturamentoAtual;
      } else {
        // Estimar quanto ainda será faturado hoje
        const faturamentoEstimadoHoje = mediaPorDiaUtil * (1 / percentualDiaDecorrido);
        const faturamentoRestanteHoje = faturamentoEstimadoHoje - faturamentoAtual;
        projecao = faturamentoAtual + Math.max(0, faturamentoRestanteHoje);
      }
    } else {
      // Caso normal: projeção baseada na média diária e dias restantes
      projecao = faturamentoAtual + (mediaPorDiaUtil * diasUteisInfo.diasUteisRestantes);
    }
    
    const meta = getMetaFilial(filialNome, selectedAno, selectedMes);
    const percentualMeta = meta > 0 ? (projecao / meta) * 100 : 0;
    
    return { projecao, percentualMeta, meta };
  };

  // Formatar o título do período selecionado
  const getPeriodoTitle = () => {
    let periodo = '';
    
    if (selectedMes !== 'all' && selectedAno !== 'all') {
      const mesNome = MESES.find(m => m.value === selectedMes)?.label;
      periodo = `${mesNome} de ${selectedAno}`;
    } else if (selectedAno !== 'all') {
      periodo = `Ano de ${selectedAno}`;
    } else if (selectedMes !== 'all') {
      const mesNome = MESES.find(m => m.value === selectedMes)?.label;
      periodo = `${mesNome} (Todos os Anos)`;
    } else {
      periodo = 'Todo o Período';
    }
    
    return periodo;
  };

  // Função para calcular dias úteis e projeção de faturamento
  const calcularDiasUteis = (feriados: string[]) => {
    // Data atual
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Verificar se estamos olhando para o mês atual ou um mês passado/futuro
    const anoAtual = hoje.getFullYear().toString();
    const mesAtual = (hoje.getMonth() + 1).toString().padStart(2, '0');
    
    // Se selectedAno ou selectedMes for 'all', usamos o mês atual para cálculos
    const anoParaCalculo = selectedAno === 'all' ? anoAtual : selectedAno;
    const mesParaCalculo = selectedMes === 'all' ? mesAtual : selectedMes;
    
    // Verificar se o mês selecionado é passado, atual ou futuro
    const ehMesPassado = new Date(parseInt(anoParaCalculo), parseInt(mesParaCalculo) - 1, 1) < new Date(parseInt(anoAtual), parseInt(mesAtual) - 1, 1);
    const ehMesFuturo = new Date(parseInt(anoParaCalculo), parseInt(mesParaCalculo) - 1, 1) > new Date(parseInt(anoAtual), parseInt(mesAtual), 0);
    const ehMesAtual = !ehMesPassado && !ehMesFuturo;
    
    // Primeiro dia do mês selecionado
    const primeiroDiaMes = new Date(parseInt(anoParaCalculo), parseInt(mesParaCalculo) - 1, 1);
    primeiroDiaMes.setHours(0, 0, 0, 0);
    
    // Último dia do mês selecionado
    const ultimoDiaMes = new Date(parseInt(anoParaCalculo), parseInt(mesParaCalculo), 0);
    ultimoDiaMes.setHours(0, 0, 0, 0);
    
    // Arrays para armazenar os dias
    const diasUteisTotais = [];
    const diasUteisDecorridos = [];
    const diasUteisRestantes = [];
    
    // Calcular todos os dias úteis do mês
    const dataIteracaoTotal = new Date(primeiroDiaMes);
    while (dataIteracaoTotal <= ultimoDiaMes) {
      const dataFormatada = dataIteracaoTotal.toISOString().split('T')[0];
      
      // Verifica se é dia útil (não é fim de semana)
      if (dataIteracaoTotal.getDay() !== 0 && dataIteracaoTotal.getDay() !== 6) {
        // Verifica se não é feriado
        if (!feriados.includes(dataFormatada)) {
          diasUteisTotais.push(dataFormatada);
          
          // Se for mês passado, todos os dias são decorridos
          // Se for mês atual, dias até ontem são decorridos, o dia de hoje é considerado restante
          // Se for mês futuro, nenhum dia é decorrido
          if (ehMesPassado) {
            diasUteisDecorridos.push(dataFormatada);
          } else if (ehMesAtual) {
            const ehHoje = dataIteracaoTotal.getDate() === hoje.getDate() && 
                          dataIteracaoTotal.getMonth() === hoje.getMonth() && 
                          dataIteracaoTotal.getFullYear() === hoje.getFullYear();
            
            if (ehHoje) {
              // O dia atual é sempre considerado como restante, pois ainda não acabou
              diasUteisRestantes.push(dataFormatada);
            } else if (dataIteracaoTotal < hoje) {
              diasUteisDecorridos.push(dataFormatada);
            } else {
              diasUteisRestantes.push(dataFormatada);
            }
          } else if (ehMesFuturo) {
            diasUteisRestantes.push(dataFormatada);
          }
        }
      }
      
      // Avança para o próximo dia
      dataIteracaoTotal.setDate(dataIteracaoTotal.getDate() + 1);
    }
    
    return {
      diasUteisTotais: diasUteisTotais.length,
      diasUteisDecorridos: diasUteisDecorridos.length,
      diasUteisRestantes: diasUteisRestantes.length
    };
  };

  // Calcular dias úteis e projeção quando o componente montar ou quando mudar o mês/ano selecionado
  useEffect(() => {
    const diasInfo = calcularDiasUteis(FERIADOS);
    setDiasUteisInfo({
      ...diasInfo,
      mediaPorDiaUtil: 0,
      projecaoFaturamento: 0
    });
  }, [selectedMes, selectedAno]);

  // Atualizar média por dia útil e projeção quando o faturamento mudar
  useEffect(() => {
    if (diasUteisInfo.diasUteisDecorridos > 0) {
      const mediaPorDiaUtil = totalVendas / diasUteisInfo.diasUteisDecorridos;
      
      // Verificar se hoje é o último dia útil do mês
      const hoje = new Date();
      const ehUltimoDiaUtil = diasUteisInfo.diasUteisRestantes === 1 && 
                              diasUteisInfo.diasUteisDecorridos + diasUteisInfo.diasUteisRestantes === diasUteisInfo.diasUteisTotais;
      
      // Só calcular projeção se houver dias úteis restantes
      let projecaoFaturamento = totalVendas;
      
      if (diasUteisInfo.diasUteisRestantes > 0) {
        if (ehUltimoDiaUtil) {
          // Se hoje é o último dia útil, calculamos a projeção considerando que ainda temos
          // parte do dia para faturar. Assumimos que o faturamento do dia será proporcional
          // à parte do dia que já passou.
          const agora = new Date();
          const horaAtual = agora.getHours() + (agora.getMinutes() / 60);
          const jornadaTrabalho = 9; // Considerando uma jornada de 9h (8h às 17h)
          const percentualDiaDecorrido = Math.min(horaAtual / jornadaTrabalho, 1);
          
          // Se já estamos fora do horário comercial, consideramos o dia como completo
          if (horaAtual >= jornadaTrabalho) {
            projecaoFaturamento = totalVendas;
          } else {
            // Estimar quanto ainda será faturado hoje
            const faturamentoEstimadoHoje = mediaPorDiaUtil * (1 / percentualDiaDecorrido);
            const faturamentoRestanteHoje = faturamentoEstimadoHoje - totalVendas;
            projecaoFaturamento = totalVendas + Math.max(0, faturamentoRestanteHoje);
          }
        } else {
          // Caso normal: projeção baseada na média diária e dias restantes
          projecaoFaturamento = totalVendas + (mediaPorDiaUtil * diasUteisInfo.diasUteisRestantes);
        }
      }
      
      setDiasUteisInfo(prev => ({
        ...prev,
        mediaPorDiaUtil,
        projecaoFaturamento
      }));
    }
  }, [totalVendas, diasUteisInfo.diasUteisDecorridos, diasUteisInfo.diasUteisRestantes, diasUteisInfo.diasUteisTotais]);

  if (isLoading) return <Loading />;

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
    );
  }

  // Prepare data for branch performance chart
  const branchChartData = filiaisPerformance.map((filial, index) => ({
    name: filial.nome,
    value: filial.vlfaturamento,
    margin: filial.margem.toFixed(2),
    fill: COLORS[index % COLORS.length]
  }));

  // Prepare data for top salespeople chart
  const topSalespeopleData = vendedoresPerformance
    .slice(0, 10)
    .map((vendedor, index) => ({
      name: vendedor.nome,
      value: vendedor.total.vlfaturamento,
      margin: vendedor.total.margem.toFixed(2),
      fill: COLORS[index % COLORS.length]
    }));

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
                {(() => {
                  const metaGeral = getMetaGeral(selectedAno, selectedMes);
                  return metaGeral > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Meta mensal:</span>
                        <span>{metaGeral.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}</span>
                      </div>
                      
                      {totalVendas < metaGeral ? (
                        <div className="flex justify-between text-sm">
                          <span>Falta atingir:</span>
                          <span className="font-medium">{(metaGeral - totalVendas).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span>Meta superada:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">{(totalVendas - metaGeral).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}</span>
                        </div>
                      )}
                      
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${Math.min(100, (totalVendas / metaGeral) * 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-end mt-1">
                          <span className={`text-xs font-medium ${getProgressColor((totalVendas / metaGeral) * 100)}`}>
                            {((totalVendas / metaGeral) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              
              {/* Informação sobre projeção de faturamento */}
              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span>Dias úteis totais:</span>
                  <span>{diasUteisInfo.diasUteisTotais}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Dias úteis decorridos:</span>
                  <span>{diasUteisInfo.diasUteisDecorridos}</span>
                </div>
                {diasUteisInfo.diasUteisRestantes > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Dias úteis restantes:</span>
                    <span>{diasUteisInfo.diasUteisRestantes}</span>
                  </div>
                )}
                {/* Mostrar mensagem especial quando hoje é o último dia útil */}
                {diasUteisInfo.diasUteisRestantes === 1 && 
                 diasUteisInfo.diasUteisDecorridos + diasUteisInfo.diasUteisRestantes === diasUteisInfo.diasUteisTotais && (
                  <>
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                      Hoje é o último dia útil do mês
                    </div>
                    {(() => {
                      const agora = new Date();
                      const horaAtual = agora.getHours() + (agora.getMinutes() / 60);
                      const jornadaTrabalho = 9; // Considerando uma jornada de 9h (8h às 17h)
                      const percentualDiaDecorrido = Math.min(horaAtual / jornadaTrabalho, 1) * 100;
                      
                      return (
                        <div className="flex justify-between text-xs mt-1">
                          <span>Progresso do dia:</span>
                          <span className={percentualDiaDecorrido >= 100 ? 'text-green-600 dark:text-green-400' : ''}>
                            {percentualDiaDecorrido.toFixed(0)}%
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}
                {diasUteisInfo.diasUteisDecorridos > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Média por dia útil:</span>
                    <span>{diasUteisInfo.mediaPorDiaUtil.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}</span>
                  </div>
                )}
                {(() => {
                  const metaGeral = getMetaGeral(selectedAno, selectedMes);
                  return metaGeral > 0 && diasUteisInfo.diasUteisDecorridos > 0 && diasUteisInfo.diasUteisRestantes > 0 && (
                    <>
                      <div className="flex justify-between text-sm font-medium mt-1">
                        <span>Projeção mensal:</span>
                        <span className={diasUteisInfo.projecaoFaturamento >= metaGeral ? 
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
                            className={`h-2.5 rounded-full ${diasUteisInfo.projecaoFaturamento >= metaGeral ? 'bg-green-600' : 'bg-yellow-600'}`}
                            style={{ width: `${Math.min(100, (diasUteisInfo.projecaoFaturamento / metaGeral) * 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-end mt-1">
                          <span className={`text-xs font-medium ${getProgressColor((diasUteisInfo.projecaoFaturamento / metaGeral) * 100)}`}>
                            {((diasUteisInfo.projecaoFaturamento / metaGeral) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
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
                {(() => {
                  const metaFilial = getMetaFilial(filial.nome, selectedAno, selectedMes);
                  return metaFilial > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Meta mensal:</span>
                        <span>{metaFilial.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}</span>
                      </div>
                      
                      {filial.vlfaturamento < metaFilial ? (
                        <div className="flex justify-between text-sm">
                          <span>Falta atingir:</span>
                          <span className="font-medium">{(metaFilial - filial.vlfaturamento).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span>Meta superada:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">{(filial.vlfaturamento - metaFilial).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}</span>
                        </div>
                      )}
                      
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${Math.min(100, (filial.vlfaturamento / metaFilial) * 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-end mt-1">
                          <span className={`text-xs font-medium ${getProgressColor((filial.vlfaturamento / metaFilial) * 100)}`}>
                            {((filial.vlfaturamento / metaFilial) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Projeção para a filial */}
                      {diasUteisInfo.diasUteisDecorridos > 0 && diasUteisInfo.diasUteisRestantes > 0 && (
                        <>
                          {/* Mostrar mensagem especial quando hoje é o último dia útil */}
                          {diasUteisInfo.diasUteisRestantes === 1 && 
                           diasUteisInfo.diasUteisDecorridos + diasUteisInfo.diasUteisRestantes === diasUteisInfo.diasUteisTotais && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                              Hoje é o último dia útil do mês
                            </div>
                          )}
                          
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
                                  <span className={projecao >= metaFilial ? 
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
                                      className={`h-2.5 rounded-full ${projecao >= metaFilial ? 'bg-green-600' : 'bg-yellow-600'}`}
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
                  );
                })()}
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
                            <div key={filialNome} className="flex justify-between text-sm font-bold">
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
                      
                      {/* Meta e projeção para a filial */}
                      {(() => {
                        const metaFilial = getMetaFilial(filial.nome, selectedAno, selectedMes);
                        return metaFilial > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex justify-between text-sm">
                              <span>Meta mensal:</span>
                              <span>{metaFilial.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}</span>
                            </div>
                            
                            {filial.vlfaturamento < metaFilial ? (
                              <div className="flex justify-between text-sm">
                                <span>Falta atingir:</span>
                                <span className="font-medium">{(metaFilial - filial.vlfaturamento).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })}</span>
                              </div>
                            ) : (
                              <div className="flex justify-between text-sm">
                                <span>Meta superada:</span>
                                <span className="font-medium text-green-600 dark:text-green-400">{(filial.vlfaturamento - metaFilial).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })}</span>
                              </div>
                            )}
                            
                            <div className="mt-1">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div 
                                  className="bg-blue-600 h-2.5 rounded-full" 
                                  style={{ width: `${Math.min(100, (filial.vlfaturamento / metaFilial) * 100)}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-end mt-1">
                                <span className={`text-xs font-medium ${getProgressColor((filial.vlfaturamento / metaFilial) * 100)}`}>
                                  {((filial.vlfaturamento / metaFilial) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            
                            {/* Projeção para a filial */}
                            {diasUteisInfo.diasUteisDecorridos > 0 && diasUteisInfo.diasUteisRestantes > 0 && (
                              <>
                                {/* Mostrar mensagem especial quando hoje é o último dia útil */}
                                {diasUteisInfo.diasUteisRestantes === 1 && 
                                 diasUteisInfo.diasUteisDecorridos + diasUteisInfo.diasUteisRestantes === diasUteisInfo.diasUteisTotais && (
                                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                                    Hoje é o último dia útil do mês
                                  </div>
                                )}
                                
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
                                        <span className={projecao >= metaFilial ? 
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
                                            className={`h-2.5 rounded-full ${projecao >= metaFilial ? 'bg-green-600' : 'bg-yellow-600'}`}
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
                        );
                      })()}
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
  );
} 