'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { PermissionGuard } from '../../components/guards/permission-guard';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import Loading from '../vendas-dia/loading';
import { useRouter } from 'next/navigation';
import { FERIADOS } from '../../app/config/feriados';
import {
  getMetaGeral,
  getMetaFilial
} from '../../app/config/metas';
import { OverviewTab } from '../components/dashboard/OverviewTab';
import { VendedoresTab } from '../components/dashboard/VendedoresTab';
import { FiliaisTab } from '../components/dashboard/FiliaisTab';

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

interface DailySales {
  data_emissao: string;
  faturamento_total: number;
}

interface AccumulatedRevenueData {
  date: string;
  accumulated_revenue: number;
  accumulated_target: number;
  forecast_revenue: number;
  is_weekend: boolean;
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
  const [dailySalesData, setDailySalesData] = useState<DailySales[]>([]);
  const [accumulatedRevenueData, setAccumulatedRevenueData] = useState<AccumulatedRevenueData[]>([]);

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

  // Fetch daily sales data for the accumulated revenue chart
  useEffect(() => {
    const fetchDailySalesData = async () => {
      try {
        // Fetch data for any month/year selection
        const url = `/api/vendedores/diario?year=${selectedAno}&month=${selectedMes}`;
        console.log('Fetching daily sales data from:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch daily sales data');
        }
        const data = await response.json();
        console.log('Received daily sales data:', data.data ? data.data.length : 0, 'records');
        
        // Log some sample data to check date format
        if (data.data && data.data.length > 0) {
          console.log('Sample data points:', data.data.slice(0, 3));
        }
        
        setDailySalesData(data.data || []);
        
        // Get the monthly target
        const monthFormatted = selectedMes.padStart(2, '0');
        const monthlyTarget = getMetaGeral(selectedAno, monthFormatted);
        console.log('Getting meta for year:', selectedAno, 'month:', monthFormatted);
        console.log('Monthly Target:', monthlyTarget);
        
        // Process the data for the accumulated revenue chart
        if (diasUteisInfo.diasUteisTotais > 0) {
          processAccumulatedRevenueData(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching daily sales data:', error);
      }
    };

    // Wait for diasUteisInfo to be calculated before fetching data
    if (diasUteisInfo.diasUteisTotais > 0) {
      fetchDailySalesData();
    }
  }, [selectedAno, selectedMes, diasUteisInfo.diasUteisTotais]);

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

  // Helper function to format date as YYYY-MM-DD in the local timezone (GMT-3)
  const formatDateToLocalISODate = (date: Date): string => {
    // Format date to YYYY-MM-DD in local timezone
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  // Nova função para depurar dados
  const debugRevenueData = (data: AccumulatedRevenueData[]): void => {
    console.log('---ANÁLISE COMPLETA DOS DADOS DO GRÁFICO---');
    
    // Procurar especificamente o dia 01/03/2025
    const dia1Marco = data.find(d => d.date === '2025-03-01');
    if (dia1Marco) {
      console.log('DADOS 01/03/2025:', dia1Marco);
    } else {
      console.log('DADOS 01/03/2025: NÃO ENCONTRADO');
    }
    
    // Verificar os 5 primeiros dias
    console.log('PRIMEIROS 5 DIAS:');
    for (let i = 0; i < 5 && i < data.length; i++) {
      console.log(`  ${data[i].date}: accumulated=${data[i].accumulated_revenue}, forecast=${data[i].forecast_revenue}`);
    }
    
    // Verificar se há valores acumulados zerados em dias que deveriam ter valores
    const diasComZero = data.filter(d => d.accumulated_revenue === 0 && new Date(d.date) <= new Date());
    if (diasComZero.length > 0) {
      console.log(`ATENÇÃO: ${diasComZero.length} dias passados têm valor acumulado zero:`);
      diasComZero.slice(0, 5).forEach(d => console.log(`  ${d.date}`));
    }
    
    console.log('-------------------------------------');
  };

  // Helper function to create a date from a YYYY-MM-DD string in the local timezone
  const createDateFromLocalString = (dateStr: string): Date => {
    try {
      // Parse the date string in local timezone
      const [year, month, day] = dateStr.split('-').map(Number);
      
      // Verificar se os valores são válidos
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.error('Formato de data inválido:', dateStr);
        throw new Error('Formato de data inválido: ' + dateStr);
      }
      
      const date = new Date(year, month - 1, day);
      
      // Verificar se a data criada é válida
      if (isNaN(date.getTime())) {
        console.error('Data inválida criada:', dateStr, date);
        throw new Error('Data inválida criada: ' + dateStr);
      }
      
      return date;
    } catch (error) {
      console.error('Erro ao criar data:', error);
      // Fallback para evitar quebrar o app
      return new Date();
    }
  };

  // Process daily sales data to create accumulated revenue chart data
  const processAccumulatedRevenueData = (data: DailySales[]) => {
    if (!data || data.length === 0) return;

    // Get the target for the current month
    const monthFormatted = selectedMes.padStart(2, '0');
    const monthlyTarget = getMetaGeral(selectedAno, monthFormatted);
    
    // Get the first and last day of the month
    const year = parseInt(selectedAno);
    const month = parseInt(selectedMes);
    
    // Criar datas no fuso horário local (GMT-3)
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    console.log(`Processando dados para ${monthFormatted}/${selectedAno}`);
    console.log('Primeiro dia do mês:', firstDay.toLocaleDateString('pt-BR'));
    console.log('Último dia do mês:', lastDay.toLocaleDateString('pt-BR'));
    
    // Calculate business days in the month
    const businessDays = diasUteisInfo.diasUteisTotais;
    
    // Daily target (only for business days)
    const dailyTarget = businessDays > 0 ? monthlyTarget / businessDays : 0;
    
    // Create array with all days in the month
    const allDaysData: AccumulatedRevenueData[] = [];
    let accumulatedTarget = 0;
    
    // Map to store actual revenue by date
    const revenueByDate = new Map<string, number>();
    
    // Log para verificar formato das datas
    if (data.length > 0) {
      console.log('Exemplo de data_emissao:', data[0].data_emissao);
    }
    
    data.forEach(item => {
      // Verificar se a data está no formato correto
      if (item.data_emissao) {
        // Verificação mais direta usando o formato da string de data
        // As datas vêm no formato YYYY-MM-DD da API
        const [ano, mes, dia] = item.data_emissao.split('-');
        const selectedMonthNum = parseInt(selectedMes);
        const mesNumerico = parseInt(mes);
        
        // Log para data específica de 01/03/2025
        if (item.data_emissao === '2025-03-01') {
          console.log('Encontrado dado para 01/03/2025:', item);
          console.log('Comparação de meses para 01/03/2025:', {
            mesNaData: mesNumerico,
            mesSelecionado: selectedMonthNum,
            formato: item.data_emissao
          });
        }
        
        // Comparação direta dos números do mês, sem criar objetos Date
        // Isso elimina qualquer problema potencial com fuso horário
        if (mesNumerico === selectedMonthNum) {
          console.log(`Adicionando faturamento para ${item.data_emissao}: ${item.faturamento_total}`);
          // Usar a string da data original para garantir consistência
          revenueByDate.set(item.data_emissao, item.faturamento_total);
        }
      }
    });
    
    console.log(`Dados de receita filtrados: ${revenueByDate.size} dias com faturamento`);
    if (revenueByDate.size > 0) {
      console.log('Exemplo de datas no mapa:', Array.from(revenueByDate.keys()).slice(0, 3));
    }
    
    // Find the current date to determine which days are in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayFormatted = formatDateToLocalISODate(today);
    console.log('Data de hoje formatada:', todayFormatted);
    
    // Gerar dados para cada dia do mês usando abordagem mais direta
    // Primeiro, determine quantos dias tem o mês
    const diasNoMes = new Date(year, month, 0).getDate();
    console.log(`Mês ${month}/${year} tem ${diasNoMes} dias`);
    
    // Criar uma entrada para cada dia do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
      // Formato YYYY-MM-DD
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      
      // Criar um objeto Date para verificar se é fim de semana
      const dayDate = new Date(year, month - 1, dia);
      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
      
      // Only add to target on business days
      if (!isWeekend && !FERIADOS.includes(dateStr)) {
        accumulatedTarget += dailyTarget;
      }
      
      allDaysData.push({
        date: dateStr,
        accumulated_revenue: 0, // Will be calculated in the next step
        accumulated_target: accumulatedTarget,
        forecast_revenue: 0, // Will be calculated in the next step
        is_weekend: isWeekend
      });
    }
    
    console.log(`Gerados ${allDaysData.length} dias para o gráfico, primeiro dia: ${allDaysData[0]?.date}, último dia: ${allDaysData[allDaysData.length-1]?.date}`);
    
    // Calculate accumulated actual revenue
    let accumulatedRevenue = 0;
    
    // Adicionar log para ver se o dia 01/03/2025 está no mapa de faturamento
    console.log('Verificando se 01/03/2025 está no mapa:', revenueByDate.has('2025-03-01'));
    
    // Dar um dump dos primeiros 5 dias do array para verificação
    console.log('Primeiros 5 dias antes de processar:', allDaysData.slice(0, 5));
    
    // ABORDAGEM COMPLETAMENTE REVISADA PARA CALCULAR O FATURAMENTO ACUMULADO
    // Primeiro, vamos garantir que todos os dias com vendas têm seu próprio valor não-acumulado registrado
    allDaysData.forEach(day => {
      if (revenueByDate.has(day.date)) {
        // Atribuir o valor diário diretamente (antes de acumular)
        const valorDiario = revenueByDate.get(day.date) || 0;
        
        // Adicionamos uma propriedade extra para rastrear o valor diário
        (day as any).daily_revenue = valorDiario;
        
        // Log especial para o dia 01/03/2025
        if (day.date === '2025-03-01') {
          console.log(`VALOR DIÁRIO 01/03/2025: ${valorDiario}`);
        }
      } else {
        // Dias sem faturamento recebem 0
        (day as any).daily_revenue = 0;
      }
    });
    
    // Agora acumulamos corretamente os valores para todos os dias até hoje
    accumulatedRevenue = 0;
    allDaysData.forEach(day => {
      const isPastOrToday = day.date <= todayFormatted;
      
      if (isPastOrToday) {
        // Adicionar o valor diário ao acumulado
        accumulatedRevenue += (day as any).daily_revenue || 0;
        
        // Atribuir o acumulado atualizado
        day.accumulated_revenue = accumulatedRevenue;
        
        // Log especial para o dia 01/03/2025
        if (day.date === '2025-03-01') {
          console.log(`ACUMULADO 01/03/2025: ${accumulatedRevenue}`);
        }
      }
    });
    
    // Dar um dump dos primeiros 5 dias depois de processar
    console.log('Primeiros 5 dias depois de processar:', allDaysData.slice(0, 5));
    
    // Verificação específica para o dia 01/03/2025
    const dia1Marco = allDaysData.find(d => d.date === '2025-03-01');
    if (dia1Marco) {
      // Se o dia 01/03 não tiver valor acumulado mas tiver receita no mapa
      if (dia1Marco.accumulated_revenue === 0 && revenueByDate.has('2025-03-01')) {
        const valor = revenueByDate.get('2025-03-01') || 0;
        console.log(`CORREÇÃO: Forçando valor acumulado do dia 01/03/2025 para ${valor}`);
        dia1Marco.accumulated_revenue = valor;
      }
    }
    
    // Debug completo dos dados
    debugRevenueData(allDaysData);
    
    // Calculate forecast revenue
    
    // Count business days passed and calculate total revenue
    let businessDaysPassed = 0;
    allDaysData.forEach(day => {
      // Comparar strings de data em vez de objetos Date
      const isPastOrToday = day.date <= todayFormatted;
      if (isPastOrToday && !day.is_weekend && !FERIADOS.includes(day.date)) {
        businessDaysPassed++;
      }
    });
    
    // Calculate daily average revenue based on business days passed
    const dailyAverageRevenue = businessDaysPassed > 0 ? accumulatedRevenue / businessDaysPassed : 0;
    
    // Apply forecast to all days
    let forecastRevenue = 0;
    
    allDaysData.forEach((day, index) => {
      // Comparar strings de data em vez de objetos Date
      const isPastOrToday = day.date <= todayFormatted;
      
      if (isPastOrToday) {
        // For past days, forecast is the same as actual revenue
        day.forecast_revenue = day.accumulated_revenue;
        forecastRevenue = day.accumulated_revenue;
      } else {
        // For future days
        const isBusinessDay = !day.is_weekend && !FERIADOS.includes(day.date);
        
        if (isBusinessDay) {
          forecastRevenue += dailyAverageRevenue;
        }
        
        day.forecast_revenue = forecastRevenue;
      }
    });
    
    // Verificação final para garantir que os dados estão consistentes
    const dadosFiltrados = allDaysData.filter(day => {
      // Remover qualquer dia que tenha dados inconsistentes (acumulado e previsão zerados em dias passados)
      if (day.date <= todayFormatted) {
        // Dias passados com acumulado zerado mas previsão diferente de zero são inconsistentes
        if (day.accumulated_revenue === 0 && day.forecast_revenue !== 0) {
          console.log(`INCONSISTÊNCIA: Dia ${day.date} tem previsão ${day.forecast_revenue} mas acumulado zero`);
          return false;
        }
      }
      return true;
    });
    
    // Verificação detalhada antes de enviar para o gráfico
    console.log(`Dados finais: ${allDaysData.length} dias, sendo ${dadosFiltrados.length} consistentes`);
    debugRevenueData(allDaysData);
    
    // Definir os dados finais do gráfico
    setAccumulatedRevenueData(allDaysData);
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
    const diasUteisTotais: string[] = [];
    const diasUteisDecorridos: string[] = [];
    const diasUteisRestantes: string[] = [];

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
                  const monthFormatted = selectedMes.padStart(2, '0');
                  const metaGeral = getMetaGeral(selectedAno, monthFormatted);
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
                  const monthFormatted = selectedMes.padStart(2, '0');
                  const metaGeral = getMetaGeral(selectedAno, monthFormatted);
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
                  const monthFormatted = selectedMes.padStart(2, '0');
                  const metaFilial = getMetaFilial(filial.nome, selectedAno, monthFormatted);
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

                      {/* Informação sobre dias úteis */}
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
                        {diasUteisInfo.diasUteisDecorridos > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Média por dia útil:</span>
                            <span>{(filial.vlfaturamento / diasUteisInfo.diasUteisDecorridos).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}</span>
                          </div>
                        )}
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
          <OverviewTab 
            branchChartData={branchChartData}
            topSalespeopleData={topSalespeopleData}
            topSalespeopleChartConfig={topSalespeopleChartConfig}
            accumulatedRevenueData={accumulatedRevenueData}
          />
        )}

        {activeView === 'vendedores' && (
          <VendedoresTab 
            vendedoresPerformance={vendedoresPerformance}
            getMarginBackgroundColor={getMarginBackgroundColor}
            getMarginTextColor={getMarginTextColor}
          />
        )}

        {activeView === 'filiais' && (
          <FiliaisTab 
            filiaisPerformance={filiaisPerformance}
            getMarginBackgroundColor={getMarginBackgroundColor}
            getMarginTextColor={getMarginTextColor}
            getProgressColor={getProgressColor}
            diasUteisInfo={diasUteisInfo}
            calcularProjecaoFilial={calcularProjecaoFilial}
            getMetaFilial={getMetaFilial}
            selectedAno={selectedAno}
            selectedMes={selectedMes}
          />
        )}
      </div>
    </PermissionGuard>
  );
}