'use client';
import { PermissionGuard } from '../../components/guards/permission-guard';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Search, Calculator, Plus, Trash } from 'lucide-react';
import { cn } from "../../lib/utils";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from '../../components/providers/auth-provider';
import { Building2, ShoppingBag, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import React from 'react';

interface Product {
  cdproduto: string
  nmproduto: string
  nmgrupoproduto: string
  nmfamiliaproduto: string
  nmfornecedorprincipal: string
  qtestoque_empresa1: number
  qtestoque_empresa4: number
  qtestoque_empresa12: number
  qtestoque_empresa13: number
  qtestoque_empresa15: number
  qtestoque_empresa17: number
  qtestoque_empresa20: number
  qtestoque_empresa59: number
  sktotal: number
  vlprecosugerido: number
  vlprecoreposicao: number
}

interface SimulationItem {
  cdproduto: string
  nmproduto: string
  nmgrupoproduto: string
  nmfamiliaproduto: string
  nmfornecedorprincipal: string
  qtestoque_empresa1: number
  qtestoque_empresa4: number
  qtestoque_empresa12: number
  qtestoque_empresa13: number
  qtestoque_empresa15: number
  qtestoque_empresa17: number
  qtestoque_empresa20: number
  qtestoque_empresa59: number
  sktotal: number
  vlprecosugerido: number
  vlprecoreposicao: number
  quantidade: number
  desconto: number
}

interface AddProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductSelect: (product: Product) => void
}

function AddProductDialog({ open, onOpenChange, onProductSelect }: AddProductDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const searchProducts = async () => {
    if (searchTerm.length < 3) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/produtos/search?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Failed to search products');
      }
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('Erro ao buscar produtos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Adicionar Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por código ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchProducts()}
            />
            <Button onClick={searchProducts} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>

          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={`product-${product.cdproduto}`}>
                    <TableCell>{product.cdproduto}</TableCell>
                    <TableCell>{product.nmproduto}</TableCell>
                    <TableCell>{product.nmgrupoproduto}</TableCell>
                    <TableCell className="text-right">{product.sktotal}</TableCell>
                    <TableCell className="text-right">
                      {product.vlprecosugerido.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          onProductSelect(product);
                          onOpenChange(false);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (items: { codigo: string; quantidade: number; precoFinal: number }[]) => void
}

function ImportDialog({ open, onOpenChange, onImport }: ImportDialogProps) {
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault(); // Previne o comportamento padrão
    const clipboardData = e.clipboardData.getData('text');
    setText(clipboardData);
  };

  const handleImport = () => {
    if (processing) return; // Evita processamento duplo

    setProcessing(true);
    try {
      const items = parseClipboardData(text);
      if (items.length > 0) {
        onImport(items);
        onOpenChange(false);
        setText('');
      } else {
        toast.error('Nenhum item válido encontrado');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Limpa o texto quando o diálogo é fechado
  useEffect(() => {
    if (!open) {
      setText('');
      setProcessing(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar Produtos do Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cole os dados do Excel aqui. O sistema irá extrair o código do produto,
            quantidade e preço unitário.
          </p>
          <textarea
            className="w-full h-[300px] p-2 border rounded-md font-mono text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            placeholder="Cole os dados do Excel aqui..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={processing || !text.trim()}
            >
              {processing ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const parseClipboardData = (text: string) => {
  const rows = text.split('\n');
  const items: { codigo: string; quantidade: number; precoFinal: number }[] = [];

  // Encontra os índices das colunas importantes no cabeçalho
  const headerRow = rows[0]?.split('\t') || [];
  const qtdIndex = headerRow.findIndex(col => col.trim().toLowerCase().startsWith('qtd'));
  const vlUnitIndex = headerRow.findIndex(col => col.trim().toLowerCase().startsWith('vl'));

  if (qtdIndex === -1 || vlUnitIndex === -1) {
    console.error('Colunas Qtd. ou Vl. Unit não encontradas');
    return items;
  }

  const parseNumber = (value: string) => {
    // Remove espaços e substitui vírgula por ponto
    const cleanValue = value.trim().replace(/\s/g, '');

    // Se contém ponto como separador de milhar e vírgula como decimal
    if (cleanValue.includes('.') && cleanValue.includes(',')) {
      return parseFloat(cleanValue.replace(/\./g, '').replace(',', '.'));
    }

    // Se contém apenas vírgula
    if (cleanValue.includes(',')) {
      return parseFloat(cleanValue.replace(',', '.'));
    }

    // Se é um número simples
    return parseFloat(cleanValue);
  };

  rows.forEach((row, index) => {
    // Pula o cabeçalho
    if (index === 0 || row.trim() === '') return;

    const parts = row.split('\t');

    // Procura por um código de 6 dígitos no início da linha
    const codigo = parts[0]?.replace(/\s+/g, '');

    if (codigo?.match(/^\d{6}$/)) {
      // Pega os valores diretamente das colunas corretas
      const quantidadeStr = parts[qtdIndex]?.trim();
      const precoStr = parts[vlUnitIndex]?.trim();

      const quantidade = parseNumber(quantidadeStr);
      const precoFinal = parseNumber(precoStr);

      // Verifica se os valores são válidos
      if (!isNaN(quantidade) && !isNaN(precoFinal)) {
        items.push({
          codigo,
          quantidade,
          precoFinal
        });
      }
    }
  });

  return items;
};

interface ImportSQLDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (items: SimulationItem[], orderNumber?: string, vendorName?: string, branchName?: string, customerName?: string) => void
}

function ImportSQLDialog({ open, onOpenChange, onImport }: ImportSQLDialogProps) {
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const { user } = useAuth();

  const handleImport = async () => {
    if (!orderNumber.trim() || loading) return;

    setLoading(true);
    try {
      // Log the SQL import usage to Supabase
      if (user) {
        try {
          await fetch('/api/logs/sql-import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              userName: user.name,
              orderNumber: orderNumber.trim()
            })
          });
        } catch (logError) {
          console.error('Failed to log SQL import:', logError);
          // Continue with import even if logging fails
        }
      }

      const response = await fetch('https://n8n2.sveletrica.com/webhook/orcamentos', {
        method: 'POST',
        headers: {
          'cdpedido': orderNumber.trim(),
          'usuario': user?.name || 'Usuário não identificado'
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao importar orçamento');
      }

      const data = await response.json();

      // Verificar se a resposta está vazia ou contém apenas um objeto vazio
      if (!data || data.length === 0 || (data.length === 1 && Object.keys(data[0]).length === 0)) {
        toast.error('Pedido não encontrado, verifique se já foi fechado ou se o número está correto');
        return;
      }

      // Extrair o nome do vendedor, a filial e o número do orçamento do primeiro item
      const vendorName = data[0]?.NmRepresentanteVenda || '';
      const branchName = data[0]?.NmEmpresaCurtoVenda || '';
      const customerName = data[0]?.NmPessoa || '';

      // Transformar os dados do orçamento para o formato SimulationItem
      const items: SimulationItem[] = data.map((item: any) => {
        // Verificar se o item tem as propriedades necessárias
        if (!item.CdProduto || !item.NmProduto) {
          return null;
        }

        const desconto = ((item.VlPrecoVendaInformado - item.VlFaturamento) / item.VlPrecoVendaInformado) * 100;

        return {
          cdproduto: item.CdProduto,
          nmproduto: item.NmProduto,
          nmgrupoproduto: '', // Não disponível na API
          nmfamiliaproduto: '', // Não disponível na API
          nmfornecedorprincipal: '', // Não disponível na API
          qtestoque_empresa1: 0, // Valores default já que não temos o estoque por empresa
          qtestoque_empresa4: 0,
          qtestoque_empresa12: 0,
          qtestoque_empresa13: 0,
          qtestoque_empresa15: 0,
          qtestoque_empresa17: 0,
          qtestoque_empresa20: 0,
          qtestoque_empresa59: 0,
          sktotal: item.QtEstoqueAtualEmpresa,
          vlprecosugerido: item.VlPrecoVendaInformado / item.QtPedida,
          vlprecoreposicao: item.VlPrecoCustoInformado / item.QtPedida,
          quantidade: item.QtPedida,
          desconto: parseFloat(desconto.toFixed(2)),
        };
      }).filter(Boolean);

      // Verificar se há itens válidos após o processamento
      if (items.length === 0) {
        toast.error('Pedido não encontrado, verifique se já foi fechado ou se o número está correto');
        return;
      }

      onImport(items, orderNumber.trim(), vendorName, branchName, customerName);
      onOpenChange(false);
      toast.success(`${items.length} produtos importados do orçamento ${orderNumber.trim()}`);
    } catch (error) {
      console.error('Erro ao importar do SQL:', error);
      toast.error('Erro ao importar orçamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importar do SQL</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Número do Orçamento</label>
            <Input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Digite o número do orçamento"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleImport();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={loading || !orderNumber.trim()}
            >
              {loading ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Adicione esta interface para os dados do vendedor
interface VendorPerformance {
  nmrepresentantevenda: string
  nmempresacurtovenda: string
  vlfaturamento: number
  vltotalcustoproduto: number
  margem: string
}

// Adicione esta interface para os dados do canal
interface ChannelPerformance {
  nmempresacurtovenda: string
  vlfaturamento: number
  vltotalcustoproduto: number
  margem: string
}

export default function SimulationPage() {
  const [items, setItems] = useState<SimulationItem[]>([]);
  const [originalItems, setOriginalItems] = useState<SimulationItem[]>([]);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [targetMargin, setTargetMargin] = useState<string>('');
  const [targetValue, setTargetValue] = useState<string>('');
  const [importSQLDialogOpen, setImportSQLDialogOpen] = useState(false);
  const [editingUnitPrice, setEditingUnitPrice] = useState<{ [key: number]: string }>({});
  const [editingTotalPrice, setEditingTotalPrice] = useState<{ [key: number]: string }>({});
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [vendorName, setVendorName] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance[]>([]);
  const [loadingVendorData, setLoadingVendorData] = useState(false);
  const [channelPerformance, setChannelPerformance] = useState<ChannelPerformance[]>([]);
  const [loadingChannelData, setLoadingChannelData] = useState(false);
  const { user } = useAuth();

  const calculateMargin = (revenue: number, cost: number) => {
    return ((revenue - (revenue * 0.268 + cost)) / revenue) * 100;
  };

  const handleAddProduct = (product: Product) => {
    const newItem = { ...product, quantidade: 1, desconto: 0 };
    setItems(prev => [...prev, newItem]);
    setOriginalItems(prev => [...prev, newItem]);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, quantidade: quantity } : item
    ));
  };

  const handleDiscountChange = (index: number, discount: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, desconto: discount } : item
    ));
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const applyGlobalDiscount = () => {
    const discount = parseFloat(globalDiscount);
    if (isNaN(discount)) return;

    setItems(prev => prev.map(item => ({
      ...item,
      desconto: discount
    })));
  };

  // Calculate totals
  const totals = items.reduce((acc, item) => {
    const priceAfterDiscount = item.vlprecosugerido * (1 - item.desconto / 100);
    const totalPrice = priceAfterDiscount * item.quantidade;
    const totalCost = item.vlprecoreposicao * item.quantidade;

    return {
      precoLista: acc.precoLista + (item.vlprecosugerido * item.quantidade),
      faturamento: acc.faturamento + totalPrice,
      custo: acc.custo + totalCost,
      quantidade: acc.quantidade + item.quantidade
    };
  }, { precoLista: 0, faturamento: 0, custo: 0, quantidade: 0 });

  const marginTotal = items.length > 0
    ? calculateMargin(totals.faturamento, totals.custo)
    : 0;

  const handleImportItems = async (importedItems: { codigo: string; quantidade: number; precoFinal: number }[]) => {
    try {
      const products: SimulationItem[] = [];

      for (const item of importedItems) {
        const response = await fetch(`/api/produtos/search?q=${item.codigo}`);
        if (!response.ok) continue;

        const data = await response.json();
        const product = data.find((p: Product) => p.cdproduto.trim() === item.codigo);

        if (product) {
          const desconto = ((product.vlprecosugerido - item.precoFinal) / product.vlprecosugerido) * 100;

          products.push({
            ...product,
            quantidade: item.quantidade,
            desconto: Math.max(0, Math.min(100, desconto))
          });
        }
      }

      if (products.length > 0) {
        setItems(prev => [...prev, ...products]);
        setOriginalItems(prev => [...prev, ...products]);
        toast.success(`${products.length} produtos importados`);
      } else {
        toast.error('Nenhum produto encontrado');
      }
    } catch (error) {
      console.error('Error importing items:', error);
      toast.error('Erro ao importar produtos');
    }
  };

  const calculateDiscountForTargetMargin = (listPrice: number, cost: number, targetMarginPercent: number) => {
    const taxRate = 0.268;
    const discountDecimal = 1 - (cost / (listPrice * (1 - taxRate - targetMarginPercent / 100)));
    return Math.max(Math.min(discountDecimal * 100, 100), 0);
  };

  const applyTargetMarginDiscounts = () => {
    const marginValue = parseFloat(targetMargin);
    if (isNaN(marginValue)) return;

    const newDiscounts: Record<string, number> = {};
    items.forEach(item => {
      const targetMarginDiscount = calculateDiscountForTargetMargin(
        item.vlprecosugerido,
        item.vlprecoreposicao,
        marginValue
      );
      newDiscounts[item.cdproduto] = parseFloat(targetMarginDiscount.toFixed(2));
    });
    setItems(prev => prev.map(item => ({
      ...item,
      desconto: newDiscounts[item.cdproduto]
    })));
  };

  const applyTargetValue = () => {
    const desiredTotal = parseFloat(targetValue);
    if (isNaN(desiredTotal) || desiredTotal <= 0) return;

    const currentTotal = items.reduce((acc, item) => acc + (item.vlprecosugerido * item.quantidade), 0);
    const globalDiscountNeeded = ((currentTotal - desiredTotal) / currentTotal) * 100;

    const newDiscounts: Record<string, number> = {};
    items.forEach(item => {
      newDiscounts[item.cdproduto] = parseFloat(globalDiscountNeeded.toFixed(2));
    });
    setItems(prev => prev.map(item => ({
      ...item,
      desconto: newDiscounts[item.cdproduto]
    })));
  };

  const handleImportSQL = (importedItems: SimulationItem[], orderNum?: string, vendor?: string, branch?: string, customer?: string) => {
    setItems(prev => [...prev, ...importedItems]);
    setOriginalItems(prev => [...prev, ...importedItems]);
    if (orderNum) {
      setOrderNumber(orderNum);
    }
    if (vendor) {
      setVendorName(vendor);
      fetchVendorPerformance(vendor);
    }
    if (branch) {
      setBranchName(branch);
    }
    if (customer) {
      setCustomerName(customer);
    }
  };

  // Nova função para buscar o desempenho do vendedor
  const fetchVendorPerformance = async (vendorName: string) => {
    if (!vendorName) return;

    setLoadingVendorData(true);
    try {
      const response = await fetch('/api/vendedores/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vendorName }),
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar dados do vendedor');
      }

      const data = await response.json();
      setVendorPerformance(data);
    } catch (error) {
      console.error('Erro ao buscar desempenho do vendedor:', error);
      toast.error('Erro ao carregar dados do vendedor');
    } finally {
      setLoadingVendorData(false);
    }
  };

  const resetValues = () => {
    setItems([...originalItems]);
    setGlobalDiscount('');
    setTargetMargin('');
    setTargetValue('');

    // Não limpar esses valores ao resetar, apenas manter os dados originais
    // setOrderNumber('')
    // setVendorName('')
    // setBranchName('')
    // setVendorPerformance([])
  };

  const clearSimulation = () => {
    setItems([]);
    setOriginalItems([]);
    setGlobalDiscount('');
    setTargetMargin('');
    setTargetValue('');
    setOrderNumber('');
    setVendorName('');
    setBranchName('');
    setCustomerName('');
    setVendorPerformance([]);
  };

  const handleUnitPriceChange = (index: number, price: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;

      // Calculate new discount based on the new unit price
      // Negative discount means price increase (acréscimo)
      const discount = ((item.vlprecosugerido - price) / item.vlprecosugerido) * 100;
      return {
        ...item,
        desconto: parseFloat(discount.toFixed(2))
      };
    }));
    // Clear the editing state for this index
    setEditingUnitPrice(prev => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
  };

  const handleFinalPriceChange = (index: number, finalPrice: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;

      // Calculate new discount based on the desired final price
      // Negative discount means price increase (acréscimo)
      const unitPrice = finalPrice / item.quantidade;
      const discount = ((item.vlprecosugerido - unitPrice) / item.vlprecosugerido) * 100;
      return {
        ...item,
        desconto: parseFloat(discount.toFixed(2))
      };
    }));
    // Clear the editing state for this index
    setEditingTotalPrice(prev => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
  };

  // Função para buscar o desempenho dos canais
  const fetchChannelPerformance = async () => {
    setLoadingChannelData(true);
    try {
      const response = await fetch('/api/canais/performance');

      if (!response.ok) {
        throw new Error('Falha ao buscar dados dos canais');
      }

      const data = await response.json();
      setChannelPerformance(data);
    } catch (error) {
      console.error('Erro ao buscar desempenho dos canais:', error);
      toast.error('Erro ao carregar dados dos canais');
    } finally {
      setLoadingChannelData(false);
    }
  };

  // Carregar dados dos canais ao montar o componente
  useEffect(() => {
    fetchChannelPerformance();
  }, []);

  // Função para calcular o impacto da simulação atual no canal
  const calculateChannelImpact = () => {
    if (!channelPerformance.length || !items.length) return null;

    // Determinar se a simulação atual é para Corporativo ou Varejo
    const isCurrentCorporativo = branchName === 'SV FILIAL' || branchName === 'SV MATRIZ';
    const currentChannel = isCurrentCorporativo ? 'Corporativo' : 'Varejo';

    // Encontrar os dados do canal atual
    const channelData = channelPerformance.find(c => c.nmempresacurtovenda === currentChannel);

    if (!channelData) return null;

    // Calcular totais da simulação atual
    const simulationTotals = items.reduce((acc, item) => {
      const priceAfterDiscount = item.vlprecosugerido * (1 - item.desconto / 100);
      const totalPrice = priceAfterDiscount * item.quantidade;
      const totalCost = item.vlprecoreposicao * item.quantidade;

      return {
        faturamento: acc.faturamento + totalPrice,
        custo: acc.custo + totalCost
      };
    }, { faturamento: 0, custo: 0 });

    // Calcular totais projetados
    const projectedTotals = {
      faturamento: Number(channelData.vlfaturamento) + simulationTotals.faturamento,
      custo: Number(channelData.vltotalcustoproduto) + simulationTotals.custo
    };

    // Calcular margens usando a fórmula correta
    const calculateMarginWithTax = (revenue: number, cost: number) => {
      if (revenue === 0) return 0;
      return ((revenue - (revenue * 0.268 + cost)) / revenue) * 100;
    };

    // Calcular a margem atual do canal usando a fórmula correta
    const currentMargin = calculateMarginWithTax(
      Number(channelData.vlfaturamento),
      Number(channelData.vltotalcustoproduto)
    );

    // Calcular a margem projetada usando a fórmula correta
    const projectedMargin = calculateMarginWithTax(
      projectedTotals.faturamento,
      projectedTotals.custo
    );

    // Calcular o impacto percentual no faturamento e na margem
    const faturamentoImpact = (simulationTotals.faturamento / Number(channelData.vlfaturamento)) * 100;
    const margemImpact = projectedMargin - currentMargin;

    return {
      channel: currentChannel,
      current: {
        faturamento: Number(channelData.vlfaturamento),
        margin: currentMargin
      },
      projected: {
        faturamento: projectedTotals.faturamento,
        margin: projectedMargin
      },
      impact: {
        faturamento: faturamentoImpact,
        margem: margemImpact
      },
      simulation: simulationTotals
    };
  };

  // Calcular o impacto no canal
  const channelImpact = calculateChannelImpact();

  // Função para calcular o impacto da simulação atual no desempenho do vendedor
  const calculateVendorImpact = () => {
    if (!vendorPerformance.length || !items.length) return null;

    // Agrupar os dados de desempenho por canal (Corporativo vs Varejo)
    const corporativoData = vendorPerformance.filter(p =>
      p.nmempresacurtovenda === 'Corporativo'
    );

    const varejoData = vendorPerformance.filter(p =>
      p.nmempresacurtovenda === 'Varejo'
    );

    // Determinar se a simulação atual é para Corporativo ou Varejo
    const isCurrentCorporativo = branchName === 'SV FILIAL' || branchName === 'SV MATRIZ';

    // Calcular totais atuais por canal
    const corporativoTotals = {
      faturamento: corporativoData.length > 0 ? Number(corporativoData[0].vlfaturamento) : 0,
      custo: corporativoData.length > 0 ? Number(corporativoData[0].vltotalcustoproduto) : 0
    };

    const varejoTotals = {
      faturamento: varejoData.length > 0 ? Number(varejoData[0].vlfaturamento) : 0,
      custo: varejoData.length > 0 ? Number(varejoData[0].vltotalcustoproduto) : 0
    };

    // Calcular totais da simulação atual
    const simulationTotals = items.reduce((acc, item) => {
      const priceAfterDiscount = item.vlprecosugerido * (1 - item.desconto / 100);
      const totalPrice = priceAfterDiscount * item.quantidade;
      const totalCost = item.vlprecoreposicao * item.quantidade;

      return {
        faturamento: acc.faturamento + totalPrice,
        custo: acc.custo + totalCost
      };
    }, { faturamento: 0, custo: 0 });

    // Adicionar a simulação atual ao canal apropriado
    const newCorporativoTotals = {
      faturamento: corporativoTotals.faturamento + (isCurrentCorporativo ? simulationTotals.faturamento : 0),
      custo: corporativoTotals.custo + (isCurrentCorporativo ? simulationTotals.custo : 0)
    };

    const newVarejoTotals = {
      faturamento: varejoTotals.faturamento + (!isCurrentCorporativo ? simulationTotals.faturamento : 0),
      custo: varejoTotals.custo + (!isCurrentCorporativo ? simulationTotals.custo : 0)
    };

    // Calcular totais combinados (Corporativo + Varejo)
    const combinedCurrentTotals = {
      faturamento: corporativoTotals.faturamento + varejoTotals.faturamento,
      custo: corporativoTotals.custo + varejoTotals.custo
    };

    const combinedProjectedTotals = {
      faturamento: newCorporativoTotals.faturamento + newVarejoTotals.faturamento,
      custo: newCorporativoTotals.custo + newVarejoTotals.custo
    };

    // Calcular margens atuais e projetadas
    const calculateMarginWithTax = (revenue: number, cost: number) => {
      if (revenue === 0) return 0;
      return ((revenue - (revenue * 0.268 + cost)) / revenue) * 100;
    };

    const currentCorporativoMargin = calculateMarginWithTax(corporativoTotals.faturamento, corporativoTotals.custo);
    const currentVarejoMargin = calculateMarginWithTax(varejoTotals.faturamento, varejoTotals.custo);
    const currentCombinedMargin = calculateMarginWithTax(combinedCurrentTotals.faturamento, combinedCurrentTotals.custo);

    const projectedCorporativoMargin = calculateMarginWithTax(newCorporativoTotals.faturamento, newCorporativoTotals.custo);
    const projectedVarejoMargin = calculateMarginWithTax(newVarejoTotals.faturamento, newVarejoTotals.custo);
    const projectedCombinedMargin = calculateMarginWithTax(combinedProjectedTotals.faturamento, combinedProjectedTotals.custo);

    // Calcular o impacto na margem combinada
    const combinedMarginImpact = projectedCombinedMargin - currentCombinedMargin;

    return {
      corporativo: {
        current: {
          faturamento: corporativoTotals.faturamento,
          margin: currentCorporativoMargin
        },
        projected: {
          faturamento: newCorporativoTotals.faturamento,
          margin: projectedCorporativoMargin
        }
      },
      varejo: {
        current: {
          faturamento: varejoTotals.faturamento,
          margin: currentVarejoMargin
        },
        projected: {
          faturamento: newVarejoTotals.faturamento,
          margin: projectedVarejoMargin
        }
      },
      combined: {
        current: {
          faturamento: combinedCurrentTotals.faturamento,
          margin: currentCombinedMargin
        },
        projected: {
          faturamento: combinedProjectedTotals.faturamento,
          margin: projectedCombinedMargin
        },
        impact: combinedMarginImpact
      },
      channel: isCurrentCorporativo ? 'Corporativo' : 'Varejo'
    };
  };

  // Calcular o impacto no vendedor
  const vendorImpact = calculateVendorImpact();

  // Helper functions for the vendor impact card
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(value);
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 3) return "text-green-600";
    if (margin > 0) return "text-yellow-600";
    return "text-red-600";
  };

  const getImpactIcon = (impact: number) => {
    if (impact > 0) return <TrendingUp className="h-3 w-3 mr-0.5" />;
    if (impact < 0) return <TrendingDown className="h-3 w-3 mr-0.5" />;
    return <ArrowRight className="h-3 w-3 mr-0.5" />;
  };

  return (
    <PermissionGuard permission="quotations">
      <div className="container py-4 md:py-6 space-y-4 md:space-y-6 px-2 md:px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
              <span>Simulação de Orçamento</span>
              <div className="flex flex-wrap gap-2 items-center">
                {orderNumber && (
                  <span className="text-md font-normal bg-muted px-2 py-1 rounded-md">
                    #{orderNumber}
                  </span>
                )}
                {customerName && (
                  <span className="text-md font-normal bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 px-2 py-1 rounded-md">
                    Cliente: {customerName}
                  </span>
                )}
                {branchName && (
                  <span className="text-md font-normal bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-md">
                    Filial: {branchName}
                  </span>
                )}
                {vendorName && (
                  <span className="text-md font-normal bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded-md">
                    Vendedor: {vendorName}
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 justify-start">
                <Button onClick={() => setAddProductOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
                <Button variant="outline" onClick={() => setImportSQLDialogOpen(true)}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Importar do SQL
                </Button>
                {items.length > 0 && (
                  <>
                    <Button variant="secondary" onClick={resetValues}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Resetar Valores
                    </Button>
                    <Button variant="destructive" onClick={clearSimulation}>
                      <Trash className="h-4 w-4 mr-2" />
                      Limpar Simulação
                    </Button>
                  </>
                )}
              </div>

              {items.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="lg:flex-1">
                      <label className="text-sm font-medium mb-2 block">
                        Aplicar desconto em todos os itens
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Digite o desconto %"
                          value={globalDiscount}
                          onChange={(e) => setGlobalDiscount(e.target.value)}
                          className="w-full"
                        />
                        <Button variant="secondary" onClick={applyGlobalDiscount}>
                          Aplicar
                        </Button>
                      </div>
                    </div>

                    <div className="lg:flex-1">
                      <label className="text-sm font-medium mb-2 block">
                        Definir margem alvo
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={targetMargin}
                          onChange={(e) => setTargetMargin(e.target.value)}
                          placeholder="Digite a margem %"
                          min="-100"
                          max="100"
                          step="0.1"
                          className="w-full"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyTargetMarginDiscounts();
                            }
                          }}
                        />
                        <Button
                          onClick={applyTargetMarginDiscounts}
                          disabled={!targetMargin}
                        >
                          Aplicar
                        </Button>
                      </div>
                    </div>

                    <div className="lg:flex-1">
                      <label className="text-sm font-medium mb-2 block">
                        Definir valor final do pedido
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value)}
                          placeholder="Digite o valor final"
                          step="0.01"
                          className="w-full"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyTargetValue();
                            }
                          }}
                        />
                        <Button
                          onClick={applyTargetValue}
                          disabled={!targetValue}
                        >
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Totais</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          <p>
                            <span className="text-sm font-medium">Quantidade:</span>{' '}
                            {totals.quantidade}
                          </p>
                          <p>
                            <span className="text-sm font-medium">Preço Lista:</span>{' '}
                            {totals.precoLista.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </p>
                          <p>
                            <span className="text-sm font-medium">Faturamento:</span>{' '}
                            {totals.faturamento.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </p>
                          <p>
                            <span className="text-sm font-medium">Custo:</span>{' '}
                            {totals.custo.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </p>
                          <p>
                            <span className="text-sm font-medium">Desconto:</span>{' '}
                            {(totals.faturamento - totals.precoLista).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                            {' '}
                            <span className={cn(
                              "font-medium",
                              totals.faturamento >= totals.precoLista ? "text-green-600" : "text-red-600"
                            )}>
                              ({((totals.faturamento - totals.precoLista) / totals.precoLista * 100).toFixed(2)}%)
                            </span>
                          </p>
                          <p className={cn(
                            "font-medium",
                            marginTotal >= 5 ? "text-green-600" :
                              marginTotal >= 0 ? "text-yellow-600" : "text-red-600"
                          )}>
                            <span>Margem:</span>{' '}
                            {marginTotal.toFixed(2)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {vendorName && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span>Desempenho do Vendedor (Mês Atual)</span>
                            {loadingVendorData && (
                              <span className="text-xs text-muted-foreground">Carregando...</span>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {vendorPerformance.length > 0 ? (
                            <div className="space-y-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Filial</TableHead>
                                    <TableHead className="text-right">Faturamento</TableHead>
                                    <TableHead className="text-right">Margem</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {vendorPerformance.map((performance, index) => (
                                    <TableRow key={`vendor-performance-${index}`}>
                                      <TableCell>{performance.nmempresacurtovenda}</TableCell>
                                      <TableCell className="text-right">
                                        {performance.vlfaturamento.toLocaleString('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL'
                                        })}
                                      </TableCell>
                                      <TableCell className={cn(
                                        "text-right",
                                        parseFloat(performance.margem) >= 5 ? "text-green-600" :
                                          parseFloat(performance.margem) >= 0 ? "text-yellow-600" : "text-red-600"
                                      )}>
                                        {performance.margem}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              <div className="pt-2 text-sm text-muted-foreground">
                                Total: {vendorPerformance.reduce((acc, curr) => acc + curr.vlfaturamento, 0).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })}
                              </div>
                            </div>
                          ) : !loadingVendorData ? (
                            <div className="text-sm text-muted-foreground py-2">
                              Nenhum dado disponível para este vendedor no mês atual.
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    )}

                    {/* Novo Card de Impacto no Vendedor */}
                    {vendorName && vendorImpact && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span>Impacto da Simulação</span>
                            <span className="text-xs font-normal text-muted-foreground">{vendorImpact.channel}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                            <div></div>
                            <div className="text-center text-xs text-muted-foreground">Atual</div>
                            <div className="text-center text-xs text-muted-foreground">Projetado</div>

                            {/* Corporativo */}
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs">Corporativo</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs">{formatCurrency(vendorImpact.corporativo.current.faturamento)}</div>
                              <div className={cn("text-xs font-medium", getMarginColor(vendorImpact.corporativo.current.margin))}>
                                {vendorImpact.corporativo.current.margin.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs">{formatCurrency(vendorImpact.corporativo.projected.faturamento)}</div>
                              <div className={cn("text-xs font-medium", getMarginColor(vendorImpact.corporativo.projected.margin))}>
                                {vendorImpact.corporativo.projected.margin.toFixed(1)}%
                              </div>
                            </div>

                            {/* Varejo */}
                            <div className="flex items-center gap-1">
                              <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs">Varejo</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs">{formatCurrency(vendorImpact.varejo.current.faturamento)}</div>
                              <div className={cn("text-xs font-medium", getMarginColor(vendorImpact.varejo.current.margin))}>
                                {vendorImpact.varejo.current.margin.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs">{formatCurrency(vendorImpact.varejo.projected.faturamento)}</div>
                              <div className={cn("text-xs font-medium", getMarginColor(vendorImpact.varejo.projected.margin))}>
                                {vendorImpact.varejo.projected.margin.toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          {/* Total Combinado */}
                          <div
                            className={cn(
                              "mt-5 p-2 rounded-md border border-dashed",
                              vendorImpact.combined.projected.margin >= 3
                                ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                                : vendorImpact.combined.projected.margin > 0
                                  ? "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
                                  : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
                            )}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-4 w-4" />
                                <span className="font-medium text-xs">Total Combinado</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <span>Impacto:</span>
                                <div
                                  className={cn(
                                    "flex items-center font-medium",
                                    vendorImpact.combined.impact >= 0 ? "text-green-600" : "text-red-600",
                                  )}
                                >
                                  {getImpactIcon(vendorImpact.combined.impact)}
                                  {Math.abs(vendorImpact.combined.impact).toFixed(1)}%
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Atual:</span>
                                  <span>{formatCurrency(vendorImpact.combined.current.faturamento)}</span>
                                </div>
                                <div
                                  className={cn("text-right text-xs font-medium", getMarginColor(vendorImpact.combined.current.margin))}
                                >
                                  {vendorImpact.combined.current.margin.toFixed(1)}%
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Projetado:</span>
                                  <span>{formatCurrency(vendorImpact.combined.projected.faturamento)}</span>
                                </div>
                                <div
                                  className={cn("text-right text-xs font-medium", getMarginColor(vendorImpact.combined.projected.margin))}
                                >
                                  {vendorImpact.combined.projected.margin.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Novo Card de Impacto no Canal */}
                    {channelImpact && (
                      <Card className={cn(
                        channelImpact.projected.margin >= 3 ? "border-green-200 dark:border-green-800" :
                          channelImpact.projected.margin > 0 ? "border-yellow-200 dark:border-yellow-800" :
                            "border-red-200 dark:border-red-800",
                        "border-2"
                      )}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span>Impacto no Canal {channelImpact.channel}</span>
                            {loadingChannelData && (
                              <span className="text-xs text-muted-foreground">Carregando...</span>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Fat. Atual</p>
                                <p className="text-sm font-medium">
                                  {channelImpact.current.faturamento.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Fat. Projetado</p>
                                <p className="text-sm font-medium">
                                  {channelImpact.projected.faturamento.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  })}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Margem Atual</p>
                                <p className={cn(
                                  "text-lg font-medium",
                                  channelImpact.current.margin >= 3 ? "text-green-600" :
                                    channelImpact.current.margin > 0 ? "text-yellow-600" : "text-red-600"
                                )}>
                                  {channelImpact.current.margin.toFixed(2)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Margem Projetada</p>
                                <p className={cn(
                                  "text-lg font-medium",
                                  channelImpact.projected.margin >= 3 ? "text-green-600" :
                                    channelImpact.projected.margin > 0 ? "text-yellow-600" : "text-red-600"
                                )}>
                                  {channelImpact.projected.margin.toFixed(2)}%
                                </p>
                              </div>
                            </div>

                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground mb-1">Impacto desta simulação</p>
                              <div className="flex justify-between">
                                <p>
                                  <span className="text-xs text-muted-foreground">Valor:</span>{' '}
                                  <span className="font-medium">
                                    {channelImpact.simulation.faturamento.toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL'
                                    })}
                                  </span>
                                </p>
                                <p>
                                  <span className="text-xs text-muted-foreground">% do canal:</span>{' '}
                                  <span className="font-medium">
                                    {channelImpact.impact.faturamento.toFixed(2)}%
                                  </span>
                                </p>
                              </div>
                              <div className="flex justify-between mt-1">
                                <p>
                                  <span className="text-xs text-muted-foreground">Impacto na margem:</span>{' '}
                                </p>
                                <p className={cn(
                                  "font-medium",
                                  channelImpact.impact.margem >= 0 ? "text-green-600" : "text-red-600"
                                )}>
                                  {channelImpact.impact.margem > 0 ? "+" : ""}
                                  {channelImpact.impact.margem.toFixed(2)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="overflow-x-auto -mx-6 px-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Estoque</TableHead>
                          <TableHead className="text-right">Quantidade</TableHead>
                          <TableHead className="text-right">Preço Lista</TableHead>
                          <TableHead className="text-right">Desconto %</TableHead>
                          <TableHead className="text-right">Preço Unit.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Margem</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => {
                          const priceAfterDiscount = item.vlprecosugerido * (1 - item.desconto / 100);
                          const totalPrice = priceAfterDiscount * item.quantidade;
                          const margin = calculateMargin(totalPrice, item.vlprecoreposicao * item.quantidade);

                          return (
                            <TableRow key={`simulation-item-${item.cdproduto}-${index}`}>
                              <TableCell>{item.cdproduto}</TableCell>
                              <TableCell>{item.nmproduto}</TableCell>
                              <TableCell className="text-right">{item.sktotal}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.quantidade}
                                  onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                                  className="w-20"
                                  min="1"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                {item.vlprecosugerido.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.desconto}
                                  onChange={(e) => handleDiscountChange(index, Number(e.target.value))}
                                  className="w-20"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  value={editingUnitPrice[index] !== undefined
                                    ? editingUnitPrice[index]
                                    : priceAfterDiscount.toFixed(2).replace('.', ',')}
                                  onChange={(e) => {
                                    setEditingUnitPrice(prev => ({
                                      ...prev,
                                      [index]: e.target.value
                                    }));
                                  }}
                                  onBlur={(e) => {
                                    const value = e.target.value.replace(',', '.');
                                    if (!isNaN(parseFloat(value))) {
                                      handleUnitPriceChange(index, parseFloat(value));
                                    } else {
                                      // Reset to calculated value if invalid input
                                      setEditingUnitPrice(prev => {
                                        const newState = { ...prev };
                                        delete newState[index];
                                        return newState;
                                      });
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const value = e.currentTarget.value.replace(',', '.');
                                      if (!isNaN(parseFloat(value))) {
                                        handleUnitPriceChange(index, parseFloat(value));
                                      } else {
                                        // Reset to calculated value if invalid input
                                        setEditingUnitPrice(prev => {
                                          const newState = { ...prev };
                                          delete newState[index];
                                          return newState;
                                        });
                                      }
                                    }
                                  }}
                                  className="w-20 sm:w-24"
                                  inputMode="decimal"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  value={editingTotalPrice[index] !== undefined
                                    ? editingTotalPrice[index]
                                    : totalPrice.toFixed(2).replace('.', ',')}
                                  onChange={(e) => {
                                    setEditingTotalPrice(prev => ({
                                      ...prev,
                                      [index]: e.target.value
                                    }));
                                  }}
                                  onBlur={(e) => {
                                    const value = e.target.value.replace(',', '.');
                                    if (!isNaN(parseFloat(value))) {
                                      handleFinalPriceChange(index, parseFloat(value));
                                    } else {
                                      // Reset to calculated value if invalid input
                                      setEditingTotalPrice(prev => {
                                        const newState = { ...prev };
                                        delete newState[index];
                                        return newState;
                                      });
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const value = e.currentTarget.value.replace(',', '.');
                                      if (!isNaN(parseFloat(value))) {
                                        handleFinalPriceChange(index, parseFloat(value));
                                      } else {
                                        // Reset to calculated value if invalid input
                                        setEditingTotalPrice(prev => {
                                          const newState = { ...prev };
                                          delete newState[index];
                                          return newState;
                                        });
                                      }
                                    }
                                  }}
                                  className="w-20 sm:w-24"
                                  inputMode="decimal"
                                />
                              </TableCell>
                              <TableCell className={cn(
                                "text-right",
                                margin >= 5 ? "text-green-600" :
                                  margin >= 0 ? "text-yellow-600" : "text-red-600"
                              )}>
                                {margin.toFixed(2)}%
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <AddProductDialog
          open={addProductOpen}
          onOpenChange={setAddProductOpen}
          onProductSelect={handleAddProduct}
        />

        <ImportSQLDialog
          open={importSQLDialogOpen}
          onOpenChange={setImportSQLDialogOpen}
          onImport={handleImportSQL}
        />
      </div>
    </PermissionGuard>
  );
} 