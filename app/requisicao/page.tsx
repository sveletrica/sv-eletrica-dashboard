'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package, Search, Truck, AlertTriangle, Check, XCircle, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Roboto } from 'next/font/google';
import { Progress } from "@/components/ui/progress";
import { PermissionGuard } from '@/components/guards/permission-guard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Interface para os dados de produto com análise de giro

interface ProductGiroData {
  cdproduto: string;
  nmproduto: string;
  nmgrupoproduto: string;
  nmfornecedorprincipal: string;
  stock: {
    [key: string]: number;
  };
  giro: {
    [key: string]: number;
  };
  viabilidade: {
    [key: string]: 'alta' | 'media' | 'baixa' | 'indisponivel';
  };
  atualizacao?: string; // Data de atualização do estoque
}

// Interface para os dados de pedidos de compra
interface PurchaseOrderData {
  dtemissao: string;
  nmcomprador: string;
  codpedido: string;
  qtemaberto: number;
  dtentrega: string;
  codproduto: string;
  descricao: string;
}

// Lista de nomes de filiais para exibição
const FILIAIS_NOMES = [
  'SV MATRIZ',
  'SV FILIAL',
  'SV BM EXPRESS',
  'SV MARACANAU',
  'SV SOBRAL',
  'SV MOZART',
  'SV WS EXPRESS'
];

// Lista de nomes de filiais para renderização

// Função para obter a cor de viabilidade
const getViabilidadeStyle = (viabilidade: 'alta' | 'media' | 'baixa' | 'indisponivel') => {
  switch (viabilidade) {
    case 'alta':
      return {
        background: "bg-green-100 dark:bg-green-900",
        icon: <Check className="h-4 w-4 text-green-600 dark:text-green-400" />,
        text: "text-green-600 dark:text-green-400"
      };
    case 'media':
      return {
        background: "bg-yellow-100 dark:bg-yellow-900",
        icon: <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />,
        text: "text-yellow-600 dark:text-yellow-400"
      };
    case 'baixa':
      return {
        background: "bg-red-100 dark:bg-red-900",
        icon: <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
        text: "text-red-600 dark:text-red-400"
      };
    case 'indisponivel':
      return {
        background: "bg-gray-100 dark:bg-gray-800",
        icon: <XCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />,
        text: "text-gray-600 dark:text-gray-400"
      };
  }
};

// Font configuration
const roboto = Roboto({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
});

// Função para formatar a data no formato dd-mm-yyyy hh:mm
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Data não disponível';
  
  try {
    const date = new Date(dateString);
    
    // Usar métodos UTC para evitar conversão de fuso horário
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
};

// Add this helper function to calculate days overdue
const getDaysOverdue = (dateString: string | undefined): number | null => {
  if (!dateString) return null;
  
  try {
    const deliveryDate = new Date(dateString);
    const today = new Date();
    
    // Reset time part for accurate day comparison
    deliveryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    // Calculate difference in milliseconds and convert to days
    const diffTime = today.getTime() - deliveryDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : null;
  } catch (error) {
    console.error('Erro ao calcular dias em atraso:', error);
    return null;
  }
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

export default function RequisicaoPage() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<'single' | 'multiple'>('single');
  const [singleProductCode, setSingleProductCode] = useState('');
  const [multipleProductCodes, setMultipleProductCodes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [productsData, setProductsData] = useState<ProductGiroData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quantidadeRequisitada, setQuantidadeRequisitada] = useState<{ [key: string]: number | string }>({});
  const [lastUpdateDate, setLastUpdateDate] = useState<string | undefined>(undefined);
  const [purchaseOrdersData, setPurchaseOrdersData] = useState<{ [key: string]: PurchaseOrderData[] }>({});
  // Add state to track which input should be highlighted
  const [highlightedInput, setHighlightedInput] = useState<string | null>(null);
  
  // Função para analisar produtos
  const analisarProdutos = async () => {
    // Limpar estados anteriores
    setError(null);
    setProductsData([]);
    setIsLoading(true);
    setProgress(0);
    setLastUpdateDate(undefined);
    setPurchaseOrdersData({});
    setHighlightedInput(null);
    
    try {
      // Obter lista de códigos de produtos
      let produtosCodigos: string[] = [];
      
      if (inputMode === 'single' && singleProductCode.trim()) {
        produtosCodigos = [formatProductCode(singleProductCode.trim())];
      } else if (inputMode === 'multiple' && multipleProductCodes.trim()) {
        produtosCodigos = multipleProductCodes
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(code => formatProductCode(code));
      }
      
      if (produtosCodigos.length === 0) {
        throw new Error('Nenhum código de produto informado');
      }
      
      // Inicializar quantidades requisitadas
      const novasQuantidades: { [key: string]: number } = {};
      produtosCodigos.forEach(codigo => {
        const currentValue = quantidadeRequisitada[codigo];
        // Garantir que o valor é um número
        novasQuantidades[codigo] = typeof currentValue === 'number' ? currentValue : 1;
      });
      setQuantidadeRequisitada(novasQuantidades);
      
      // Usar a nova API para processar todos os produtos de uma vez
      const response = await fetch('/api/requisicao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ produtosCodigos }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || `Falha ao analisar produtos: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Atualizar o progresso para 100%
      setProgress(100);
      
      // Verificar se há resultados
      if (!data.resultados || data.resultados.length === 0) {
        throw new Error('Nenhum produto encontrado com os códigos informados');
      }
      
      setProductsData(data.resultados);
      
      // Encontrar a data de atualização mais recente
      if (data.resultados.length > 0) {
        const dates = data.resultados
          .map((produto: ProductGiroData) => produto.atualizacao)
          .filter(Boolean)
          .map((dateStr: string) => new Date(dateStr).getTime());
        
        if (dates.length > 0) {
          const mostRecentDate = new Date(Math.max(...dates)).toISOString();
          setLastUpdateDate(mostRecentDate);
        }
        
        // Highlight the first product's quantidade input after a short delay
        setTimeout(() => {
          if (data.resultados.length > 0) {
            setHighlightedInput(data.resultados[0].cdproduto);
          }
        }, 500);
      }
      
      if (data.totalEncontrados === 0) {
        toast.error('Nenhum produto encontrado com os códigos informados');
      } else if (data.totalEncontrados < data.totalProcessados) {
        toast.warning(`Apenas ${data.totalEncontrados} de ${data.totalProcessados} produtos foram encontrados`);
      } else {
        toast.success(`${data.totalEncontrados} produtos analisados com sucesso`);
      }
      
      // Fetch purchase orders data for each product
      if (data.resultados && data.resultados.length > 0) {
        await fetchPurchaseOrdersData(data.resultados.map((produto: ProductGiroData) => produto.cdproduto));
      }
      
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };
  
  // Atualizar quantidade requisitada
  const handleQuantidadeChange = (cdproduto: string, quantidade: number | string) => {
    setQuantidadeRequisitada(prev => ({
      ...prev,
      [cdproduto]: quantidade
    }));
    
    // Remove highlight after user interaction
    if (highlightedInput === cdproduto) {
      setHighlightedInput(null);
    }
  };
  
  // Função para buscar dados de pedidos de compra para cada produto
  const fetchPurchaseOrdersData = async (productCodes: string[]) => {
    try {
      const purchaseOrders: { [key: string]: PurchaseOrderData[] } = {};
      
      // Fetch purchase orders for each product code
      for (const code of productCodes) {
        const response = await fetch(`/api/compras?codproduto=${encodeURIComponent(code)}`);
        
        if (!response.ok) {
          console.error(`Failed to fetch purchase orders for product ${code}`);
          continue;
        }
        
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          purchaseOrders[code] = data.data;
        }
      }
      
      setPurchaseOrdersData(purchaseOrders);
    } catch (error) {
      console.error('Error fetching purchase orders data:', error);
    }
  };
  
  // Voltar para a página anterior
  const handleBack = () => {
    router.back();
  };
  
  return (
    <PermissionGuard permission="requisicoes">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold">Análise de Requisição de Produtos</h1>
          </div>
          
          {lastUpdateDate && (
            <div className="text-sm text-muted-foreground flex items-center">
              <span className="mr-1">Última atualização:</span>
              <span className="font-medium">{formatDate(lastUpdateDate)}</span>
            </div>
          )}
        </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2 text-blue-500" />
            Consultar Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" onValueChange={(value) => setInputMode(value as 'single' | 'multiple')}>
            <TabsList className="mb-4">
              <TabsTrigger value="single">Código Único</TabsTrigger>
              <TabsTrigger value="multiple">Múltiplos Códigos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="single">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Código do Produto</label>
                  <Input
                    placeholder="Digite o código do produto"
                    value={singleProductCode}
                    onChange={(e) => setSingleProductCode(e.target.value)}
                    onBlur={(e) => {
                      // Format with leading zero when the input loses focus
                      if (e.target.value.trim()) {
                        setSingleProductCode(formatProductCode(e.target.value.trim()));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        // Format with leading zero before submitting
                        if (singleProductCode.trim()) {
                          setSingleProductCode(formatProductCode(singleProductCode.trim()));
                        }
                        analisarProdutos();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={analisarProdutos}
                  disabled={isLoading || !singleProductCode.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    'Analisar'
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="multiple">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Códigos dos Produtos (um por linha)</label>
                  <Textarea
                    placeholder="Digite os códigos dos produtos, um por linha"
                    value={multipleProductCodes}
                    onChange={(e) => setMultipleProductCodes(e.target.value)}
                    onBlur={(e) => {
                      // Format each line with leading zeros when the textarea loses focus
                      if (e.target.value.trim()) {
                        const formattedCodes = e.target.value
                          .split('\n')
                          .map(line => line.trim() ? formatProductCode(line.trim()) : line)
                          .join('\n');
                        setMultipleProductCodes(formattedCodes);
                      }
                    }}
                    rows={5}
                  />
                </div>
                <Button
                  onClick={analisarProdutos}
                  disabled={isLoading || !multipleProductCodes.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando {Math.round(progress)}%
                    </>
                  ) : (
                    'Analisar Produtos'
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          {isLoading && (
            <Progress value={progress} className="mt-4" />
          )}
        </CardContent>
      </Card>
      
      {error && (
        <Card className="mb-6 border-red-500">
          <CardContent className="pt-6">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-md">
              <h3 className="font-medium">Erro na análise</h3>
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {productsData.length > 0 && (
        <div className="space-y-6">
          {productsData.map((produto) => (
            <Card key={produto.cdproduto} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      <Package className="h-5 w-5 mr-2 text-blue-500" />
                      {produto.nmproduto}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Código: <span className="font-mono">{produto.cdproduto}</span> | 
                      Grupo: {produto.nmgrupoproduto} | 
                      Fornecedor: {produto.nmfornecedorprincipal}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm whitespace-nowrap">Quantidade requisitada:</label>
                    <Input
                      type="number"
                      min="1"
                      value={quantidadeRequisitada[produto.cdproduto] || 1}
                      onChange={(e) => {
                        // Permitir campo vazio temporariamente durante a digitação
                        const inputValue = e.target.value;
                        if (inputValue === '') {
                          // Definir como string vazia temporariamente para permitir apagar o conteúdo
                          setQuantidadeRequisitada(prev => ({
                            ...prev,
                            [produto.cdproduto]: ''
                          }));
                        } else {
                          // Converter para número quando tiver um valor válido
                          const numValue = parseInt(inputValue);
                          if (!isNaN(numValue)) {
                            handleQuantidadeChange(produto.cdproduto, numValue);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        // Ao perder o foco, garantir que o valor é pelo menos 1
                        const value = parseInt(e.target.value);
                        handleQuantidadeChange(produto.cdproduto, isNaN(value) || value < 1 ? 1 : value);
                      }}
                      className={cn(
                        "w-20",
                        highlightedInput === produto.cdproduto ? 
                          "ring-8 ring-primary animate-pulse focus:animate-pulse focus:ring-8" : ""
                      )}
                      // Auto-focus when this is the highlighted input
                      ref={(input) => {
                        if (input && highlightedInput === produto.cdproduto) {
                          input.focus();
                        }
                      }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filial</TableHead>
                        <TableHead className="text-right">Estoque</TableHead>
                        <TableHead className="text-right">Giro Médio (3 meses)</TableHead>
                        <TableHead className="text-right">Meses de Estoque Atual</TableHead>
                        <TableHead className="text-right">Meses de Estoque Após Transferência</TableHead>
                        <TableHead>Viabilidade de Transferência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {FILIAIS_NOMES.filter(filialNome => {
                        const estoque = produto.stock[filialNome] || 0;
                        return estoque > 0;
                      }).map((filialNome) => {
                        const estoque = produto.stock[filialNome] || 0;
                        const giro = produto.giro[filialNome] || 0;
                        
                        // Verificar se existe giro para calcular os meses de estoque
                        const temGiro = giro > 0;
                        const mesesEstoque = temGiro ? estoque / giro : null;
                        
                        // Converter para número, garantindo que seja pelo menos 1
                        const rawQtdRequisitada = quantidadeRequisitada[produto.cdproduto];
                        const qtdRequisitada = typeof rawQtdRequisitada === 'string' 
                          ? (rawQtdRequisitada === '' ? 1 : parseInt(rawQtdRequisitada) || 1)
                          : (rawQtdRequisitada || 1);
                        
                        // Calcular estoque e meses de estoque após a transferência
                        const estoqueAposTransferencia = Math.max(0, estoque - qtdRequisitada);
                        const mesesEstoqueAposTransferencia = temGiro ? estoqueAposTransferencia / giro : null;
                        
                        // Decidir a viabilidade com base na disponibilidade de estoque
                        const viabilidade = estoque >= qtdRequisitada ? produto.viabilidade[filialNome] : 'indisponivel';
                        const viabilidadeStyle = getViabilidadeStyle(viabilidade);
                        
                        // Definir cores de alerta apenas quando há giro
                        const alertaEstoqueBaixo = temGiro && mesesEstoqueAposTransferencia !== null;
                        
                        return (
                          <TableRow key={filialNome} className={cn(roboto.className, "text-xs sm:text-sm")}>
                            <TableCell className="font-medium">{filialNome}</TableCell>
                            <TableCell className="text-right">{estoque.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{giro.toFixed(1)}/mês</TableCell>
                            <TableCell className="text-right">
                              {temGiro ? `${mesesEstoque!.toFixed(1)} meses` : estoque > 0 ? "∞" : "N/A"}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right",
                              alertaEstoqueBaixo && mesesEstoqueAposTransferencia! < 3 && estoque >= qtdRequisitada ? "text-amber-600 dark:text-amber-400 font-medium" : "",
                              alertaEstoqueBaixo && mesesEstoqueAposTransferencia! < 1 && estoque >= qtdRequisitada ? "text-red-600 dark:text-red-400 font-medium" : ""
                            )}>
                              {estoque >= qtdRequisitada 
                                ? (temGiro ? `${mesesEstoqueAposTransferencia!.toFixed(1)} meses` : "∞") 
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-1",
                                viabilidadeStyle.background,
                                viabilidadeStyle.text
                              )}>
                                {viabilidadeStyle.icon}
                                {viabilidade === 'indisponivel' 
                                  ? 'Indisponível' 
                                  : `Viabilidade ${viabilidade.charAt(0).toUpperCase() + viabilidade.slice(1)}`}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Observação sobre filiais com estoque zerado */}
                {(() => {
                  const filiaisZeradas = FILIAIS_NOMES.filter(filialNome => {
                    const estoque = produto.stock[filialNome] || 0;
                    return estoque === 0;
                  });
                  
                  if (filiaisZeradas.length > 0) {
                    return (
                      <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
                        <p className="text-muted-foreground flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                          <span>
                            <strong>Filiais com estoque zerado:</strong>{" "}
                            {filiaisZeradas.map((filialNome, index) => {
                              const giro = produto.giro[filialNome] || 0;
                              return (
                                <span key={filialNome}>
                                  {index > 0 && ", "}
                                  {filialNome} ({giro.toFixed(1)}/mês)
                                </span>
                              );
                            })}
                          </span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="mt-4 p-4 bg-muted/30 rounded-md">
                  <h3 className="font-medium mb-2 flex items-center">
                    <Truck className="h-4 w-4 mr-2" />
                    Recomendação de Transferência
                  </h3>
                  
                  {(() => {
                    // Filtramos filiais que atendem aos critérios:
                    // 1. Têm estoque disponível para a quantidade requisitada
                    // 2. Têm viabilidade alta (muitos meses de estoque)
                    // 3. Após a transferência, ainda terão pelo menos 3 meses de estoque
                    
                    const filiaisRecomendadas = Object.entries(produto.viabilidade)
                      .filter(([filial, viabilidade]) => {
                        // Converter para número, garantindo que seja pelo menos 1
                        const rawQtdRequisitada = quantidadeRequisitada[produto.cdproduto];
                        const qtdRequisitada = typeof rawQtdRequisitada === 'string' 
                          ? (rawQtdRequisitada === '' ? 1 : parseInt(rawQtdRequisitada) || 1)
                          : (rawQtdRequisitada || 1);
                          
                        const estoque = produto.stock[filial] || 0;
                        const giro = produto.giro[filial] || 0;
                        
                        // Verificar se tem estoque suficiente
                        if (estoque < qtdRequisitada) return false;
                        
                        // Verificar viabilidade
                        if (viabilidade !== 'alta') return false;
                        
                        // Se não há giro, é altamente recomendado transferir
                        if (giro === 0) return true;
                        
                        // Calcular meses de estoque após transferência
                        const estoqueAposTransferencia = estoque - qtdRequisitada;
                        const mesesEstoqueAposTransferencia = estoqueAposTransferencia / giro;
                        
                        // Garantir que ainda terá pelo menos 3 meses de estoque após a transferência
                        return mesesEstoqueAposTransferencia >= 3;
                      });
                    
                    // Filiais que têm estoque e viabilidade alta, mas ficariam com menos de 3 meses após transferência
                    const filiaisAlternativas = Object.entries(produto.viabilidade)
                      .filter(([filial, viabilidade]) => {
                        // Converter para número, garantindo que seja pelo menos 1
                        const rawQtdRequisitada = quantidadeRequisitada[produto.cdproduto];
                        const qtdRequisitada = typeof rawQtdRequisitada === 'string' 
                          ? (rawQtdRequisitada === '' ? 1 : parseInt(rawQtdRequisitada) || 1)
                          : (rawQtdRequisitada || 1);
                          
                        const estoque = produto.stock[filial] || 0;
                        const giro = produto.giro[filial] || 0;
                        
                        // Verificar se tem estoque suficiente
                        if (estoque < qtdRequisitada) return false;
                        
                        // Verificar viabilidade
                        if (viabilidade !== 'alta') return false;
                        
                        // Se não há giro, não é uma alternativa (já é recomendada)
                        if (giro === 0) return false;
                        
                        // Calcular meses de estoque após transferência
                        const estoqueAposTransferencia = estoque - qtdRequisitada;
                        const mesesEstoqueAposTransferencia = estoqueAposTransferencia / giro;
                        
                        // Filiais que ficariam com menos de 3 meses
                        return mesesEstoqueAposTransferencia < 3;
                      });
                    
                    if (filiaisRecomendadas.length > 0) {
                      return (
                        <div>
                          <p className="text-sm mb-2">Filiais recomendadas para transferência:</p>
                          <div className="flex flex-wrap gap-2">
                            {filiaisRecomendadas.map(([filial]) => (
                              <div key={filial} className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm flex items-center">
                                <Check className="h-3 w-3 mr-1" />
                                {filial}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else if (filiaisAlternativas.length > 0) {
                      return (
                        <div>
                          <p className="text-sm mb-2">Filiais alternativas (ficarão com estoque reduzido após transferência):</p>
                          <div className="flex flex-wrap gap-2">
                            {filiaisAlternativas.map(([filial]) => {
                              const estoque = produto.stock[filial] || 0;
                              const giro = produto.giro[filial] || 0;
                              // Converter para número, garantindo que seja pelo menos 1
                              const rawQtdRequisitada = quantidadeRequisitada[produto.cdproduto];
                              const qtdRequisitada = typeof rawQtdRequisitada === 'string' 
                                ? (rawQtdRequisitada === '' ? 1 : parseInt(rawQtdRequisitada) || 1)
                                : (rawQtdRequisitada || 1);
                                
                              const estoqueAposTransferencia = estoque - qtdRequisitada;
                              const mesesEstoqueAposTransferencia = estoqueAposTransferencia / (giro || 0.1);
                              
                              return (
                                <div key={filial} className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full text-sm flex items-center">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {filial} ({mesesEstoqueAposTransferencia.toFixed(1)} meses após)
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <p className="text-sm text-muted-foreground">
                          Não há filiais com alta viabilidade para transferência deste produto na quantidade requisitada.
                        </p>
                      );
                    }
                  })()}
                </div>
                
                {/* Seção de Pedidos de Compra */}
                {purchaseOrdersData[produto.cdproduto] && purchaseOrdersData[produto.cdproduto].length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Package className="h-4 w-4 mr-2 text-blue-500" />
                      Pedidos de Compra em Aberto
                    </h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data de Emissão</TableHead>
                            <TableHead>Comprador</TableHead>
                            <TableHead>Código do Pedido</TableHead>
                            <TableHead className="text-right">Quantidade</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Dt Faturamento</TableHead>
                            <TableHead>Nota Fiscal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseOrdersData[produto.cdproduto].map((order, index) => {
                            const isFaturado = order.descricao?.startsWith("NF");
                            
                            return (
                              <TableRow 
                                key={`${order.codpedido}-${index}`} 
                                className={cn(
                                  roboto.className, 
                                  "text-xs sm:text-sm",
                                  isFaturado ? "bg-green-50 dark:bg-green-900/10" : ""
                                )}
                              >
                                <TableCell>{formatDate(order.dtemissao)}</TableCell>
                                <TableCell>{order.nmcomprador}</TableCell>
                                <TableCell className="font-mono">{order.codpedido}</TableCell>
                                <TableCell className="text-right">{order.qtemaberto.toLocaleString()}</TableCell>
                                <TableCell>
                                  {isFaturado ? (
                                    <div className="flex items-center text-green-600 dark:text-green-400 font-medium">
                                      <Check className="h-4 w-4 mr-1" />
                                      Faturado
                                    </div>
                                  ) : (() => {
                                    const daysOverdue = getDaysOverdue(order.dtentrega);
                                    
                                    if (daysOverdue !== null) {
                                      return (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="flex items-center text-red-600 dark:text-red-400 font-medium cursor-help">
                                                <XCircle className="h-4 w-4 mr-1" />
                                                Atrasado
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'} em atraso</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      );
                                    } else {
                                      return (
                                        <div className="flex items-center text-amber-600 dark:text-amber-400 font-medium">
                                          <AlertTriangle className="h-4 w-4 mr-1" />
                                          Em aberto
                                        </div>
                                      );
                                    }
                                  })()}
                                </TableCell>
                                <TableCell>
                                  {formatDate(order.dtentrega)}
                                </TableCell>
                                <TableCell>
                                  {isFaturado ? order.descricao : "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Total de {purchaseOrdersData[produto.cdproduto].length} pedido(s) de compra em aberto para este produto.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </PermissionGuard>
  );
}
