import { supabase } from '@/lib/supabase-client';
import { NextResponse } from 'next/server';

// Interface para os dados de estoque
interface StockData {
    CdChamada: string;
    NmProduto: string;
    NmGrupoProduto: string;
    NmFornecedorPrincipal: string;
    QtEstoque_Empresa1?: number; // Mozart
    QtEstoque_Empresa4?: number; // Maracanau
    QtEstoque_Empresa12?: number; // Sobral
    QtEstoque_Empresa13?: number;
    QtEstoque_Empresa15?: number;
    QtEstoque_Empresa17?: number;
    QtEstoque_Empresa20?: number;
    QtEstoque_Empresa59?: number;
    StkTotal: number;
    Atualizacao: string;
}

// Interface para os dados de vendas
interface SalesData {
    cdproduto: string;
    nmproduto: string;
    nmgrupoproduto: string;
    nmfornecedorprincipal: string;
    qtbrutaproduto: number;
    dtemissao: string;
    nmempresacurtovenda: string;
}

// Mapeamento de códigos de empresa para nomes de filiais
// Este mapeamento é usado apenas para extrair os valores de estoque do objeto StockData
const FILIAIS_MAP: { [key: string]: string } = {
    'QtEstoque_Empresa1': 'SV MATRIZ',
    'QtEstoque_Empresa4': 'SV FILIAL',
    'QtEstoque_Empresa12': 'SV BM EXPRESS',
    'QtEstoque_Empresa13': 'SV MARACANAU',
    'QtEstoque_Empresa15': 'SV JUAZEIRO',
    'QtEstoque_Empresa17': 'SV SOBRAL',
    'QtEstoque_Empresa20': 'SV MOZART',
    'QtEstoque_Empresa59': 'SV WS EXPRESS'
};

// Função para garantir que o código do produto tenha um zero à esquerda se necessário
const formatProductCode = (code: string): string => {
    // Verifica se o código já começa com zero
    if (code.startsWith('0')) return code;
    
    // Verifica se o código é numérico e não começa com zero
    if (/^\d+$/.test(code)) {
        return `0${code}`;
    }
    
    // Retorna o código original se não for numérico ou já tiver um formato especial
    return code;
};

// Função para calcular o giro médio dos últimos 3 meses
const calculateGiro3M = (salesData: SalesData[], filial: string): number => {
    // Verificar se temos dados de vendas
    if (!salesData || salesData.length === 0) {
        console.log(`Sem dados de vendas para a filial ${filial}`);
        return 0;
    }

    // Calcular o período dos 3 meses anteriores completos (excluindo o mês atual)
    const now = new Date();
    
    // Primeiro dia do mês atual
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Último dia do mês anterior (fim do período)
    const endDate = new Date(firstDayCurrentMonth);
    endDate.setDate(endDate.getDate() - 1);
    
    // Primeiro dia de 3 meses atrás (início do período)
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 2); // Já estamos no mês anterior, então -2 para pegar 3 meses completos
    startDate.setDate(1); // Primeiro dia do mês
    
    console.log(`Período de análise: ${startDate.toLocaleDateString('pt-BR')} até ${endDate.toLocaleDateString('pt-BR')}`);

    // Filter sales by last 3 complete months
    const last3MonthsSales = salesData.filter(sale => {
        try {
            const [day, month, year] = sale.dtemissao.split('/').map(Number);
            const saleDate = new Date(year, month - 1, day);
            return saleDate >= startDate && saleDate <= endDate;
        } catch (error) {
            console.error(`Erro ao processar data de venda: ${sale.dtemissao}`, error);
            return false;
        }
    });

    // Usar diretamente o nome da filial, apenas normalizando para maiúsculas para comparação
    const empresaNome = filial.toUpperCase();

    console.log(`Calculando giro para filial: ${filial} (${empresaNome})`);
    console.log(`Total de vendas nos últimos 3 meses: ${last3MonthsSales.length}`);

    // Normalização de nomes de filiais para comparação
    const normalizarNomeFilial = (nome: string): string => {
        // Remove acentos, espaços e converte para maiúsculas
        return nome.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/\s+/g, '')            // Remove espaços
            .toUpperCase();                 // Converte para maiúsculas
    };
    
    const empresaNomeNormalizado = normalizarNomeFilial(empresaNome);
    
    // Filter by filial - usando comparação normalizada para maior precisão
    const filteredSales = last3MonthsSales.filter(sale => {
        if (!sale.nmempresacurtovenda) return false;
        
        const saleEmpresaNormalizada = normalizarNomeFilial(sale.nmempresacurtovenda);
        
        // Verifica se um nome contém o outro ou se são iguais
        return saleEmpresaNormalizada.includes(empresaNomeNormalizado) || 
               empresaNomeNormalizado.includes(saleEmpresaNormalizada);
    });

    console.log(`Vendas filtradas para a filial ${filial}: ${filteredSales.length}`);

    // Calculate total quantity
    const totalQuantity = filteredSales.reduce((sum, sale) => sum + sale.qtbrutaproduto, 0);
    console.log(`Quantidade total vendida: ${totalQuantity}`);

    // Calculate monthly average (divide by 3 for 3 months)
    const giroMensal = totalQuantity / 3;
    console.log(`Giro mensal calculado: ${giroMensal.toFixed(2)} (baseado nos 3 meses anteriores completos)`);

    return giroMensal;
};

// Função para determinar a viabilidade de transferência
const determinarViabilidade = (estoque: number, giro: number): 'alta' | 'media' | 'baixa' | 'indisponivel' => {
    if (estoque <= 0) return 'indisponivel';
    
    // Razão entre estoque e giro (quantos meses de estoque)
    const mesesEstoque = estoque / (giro || 0.1); // Evita divisão por zero
    
    if (mesesEstoque > 6) return 'alta';
    if (mesesEstoque > 3) return 'media';
    return 'baixa';
};

export async function POST(request: Request) {
    try {
        // Obter os códigos de produtos do corpo da requisição
        const body = await request.json();
        const { produtosCodigos } = body;

        if (!produtosCodigos || !Array.isArray(produtosCodigos) || produtosCodigos.length === 0) {
            return NextResponse.json(
                { error: 'Lista de códigos de produtos é obrigatória' },
                { status: 400 }
            );
        }

        // Limitar o número de produtos para evitar sobrecarga
        const limitedCodigos = produtosCodigos.slice(0, 50);
        
        // Formatar os códigos de produtos para garantir o zero à esquerda
        const formattedCodigos = limitedCodigos.map(codigo => formatProductCode(codigo.toString()));

        // Resultados para cada produto
        const resultados = [];

        // Buscar dados para cada produto
        for (const codigo of formattedCodigos) {
            try {
                // Buscar dados de estoque
                const { data: stockData, error: stockError } = await supabase
                    .from('DBestoque')
                    .select('*')
                    .eq('CdChamada', codigo);

                if (stockError) {
                    console.error(`Erro ao buscar estoque para ${codigo}:`, stockError);
                    continue; // Pular para o próximo produto
                }

                // Calcular o período dos 3 meses anteriores completos (excluindo o mês atual)
                const now = new Date();
                
                // Primeiro dia do mês atual
                const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                
                // Último dia do mês anterior (fim do período)
                const endDate = new Date(firstDayCurrentMonth);
                endDate.setDate(endDate.getDate() - 1);
                
                // Primeiro dia de 3 meses atrás (início do período)
                const startDate = new Date(endDate);
                startDate.setMonth(startDate.getMonth() - 2); // Já estamos no mês anterior, então -2 para pegar 3 meses completos
                startDate.setDate(1); // Primeiro dia do mês
                
                // Formatar datas no formato DD/MM/YYYY para filtrar no Supabase
                const formatDate = (date: Date) => {
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    return `${day}/${month}/${year}`;
                };
                
                const formattedStartDate = formatDate(startDate);
                const formattedEndDate = formatDate(endDate);
                
                console.log(`Buscando vendas de ${formattedStartDate} até ${formattedEndDate} para o produto ${codigo}`);
                
                // Buscar dados de vendas com filtro de data para otimizar a consulta
                const { data: salesData, error: salesError } = await supabase
                    .from('mvw_mssql_bivendas_aux_geral')
                    .select('*')
                    .eq('cdproduto', codigo)
                    .gte('dtemissao', formattedStartDate)
                    .lte('dtemissao', formattedEndDate);

                if (salesError) {
                    console.error(`Erro ao buscar vendas para ${codigo}:`, salesError);
                    continue; // Pular para o próximo produto
                }
                
                // Log para debug
                console.log(`Produto ${codigo}: ${salesData?.length || 0} vendas encontradas`);

                // Se não encontrou dados de estoque, pular para o próximo produto
                if (!stockData || stockData.length === 0) {
                    console.warn(`Nenhum dado de estoque encontrado para ${codigo}`);
                    continue;
                }

                const stock = stockData[0] as StockData;
                const sales = salesData || [];
                
                // Log para debug
                console.log(`Processando produto: ${codigo} - ${stock.NmProduto}`);
                console.log(`Total de registros de vendas: ${sales.length}`);

                // Calcular giro e viabilidade para cada filial
                const stockByFilial: { [key: string]: number } = {};
                const giroData: { [key: string]: number } = {};
                const viabilidadeData: { [key: string]: 'alta' | 'media' | 'baixa' | 'indisponivel' } = {};

                // Processar cada filial
                Object.entries(FILIAIS_MAP).forEach(([estoqueKey, filialNome]) => {
                    // Obter estoque da filial
                    const estoque = (stock as any)[estoqueKey] || 0;
                    stockByFilial[filialNome] = estoque;
                    
                    // Calcular giro para esta filial
                    const giro = calculateGiro3M(sales as SalesData[], filialNome);
                    giroData[filialNome] = giro;
                    
                    // Determinar viabilidade
                    viabilidadeData[filialNome] = determinarViabilidade(estoque, giro);
                    
                    // Log detalhado para cada filial
                    console.log(`Filial: ${filialNome}, Estoque: ${estoque}, Giro: ${giro.toFixed(2)}, Viabilidade: ${viabilidadeData[filialNome]}`);
                });

                // Adicionar aos resultados
                resultados.push({
                    cdproduto: codigo,
                    nmproduto: stock.NmProduto,
                    nmgrupoproduto: stock.NmGrupoProduto,
                    nmfornecedorprincipal: stock.NmFornecedorPrincipal,
                    stock: stockByFilial,
                    giro: giroData,
                    viabilidade: viabilidadeData,
                    atualizacao: stock.Atualizacao
                });
            } catch (err) {
                console.error(`Erro ao processar produto ${codigo}:`, err);
                // Continuar com o próximo produto
            }
        }

        // Retornar os resultados
        return NextResponse.json({
            totalProcessados: limitedCodigos.length,
            totalEncontrados: resultados.length,
            resultados
        });

    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
