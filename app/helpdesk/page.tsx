"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BellRing, Clock, CheckCircle, AlertCircle, FileText, MessageSquare, UserCog, ChevronRight, PlusCircle, RefreshCw, Search, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Interface para os produtos
interface Product {
  cdchamada: string;
  nmproduto: string;
  nmgrupoproduto: string;
  stktotal: number;
  vlprecosugerido: number;
}

// Interface para o diálogo de adicionar produto
interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductSelect: (product: Product) => void;
}

// Componente de diálogo para adicionar produto
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
                  <TableRow key={`product-${product.cdchamada}`}>
                    <TableCell>{product.cdchamada}</TableCell>
                    <TableCell>{product.nmproduto}</TableCell>
                    <TableCell>{product.nmgrupoproduto}</TableCell>
                    <TableCell className="text-right">{product.stktotal}</TableCell>
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

const HelpDeskInterface = () => {
  const [userRole, setUserRole] = useState('solicitante'); // 'solicitante' ou 'operador'
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const handleAddProduct = (product: Product) => {
    setSelectedProduct(product);
    toast.success(`Produto "${product.nmproduto}" adicionado ao ticket`);
  };
  
  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sistema de Help Desk</h1>
          <p className="text-gray-500">Portal de Tickets Internos</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <BellRing className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
              JS
            </div>
            <div>
              <p className="text-sm font-medium">João Silva</p>
              <p className="text-xs text-gray-500">{userRole === 'operador' ? 'Operador' : 'Solicitante'}</p>
            </div>
          </div>
          
          <Button onClick={() => setUserRole(userRole === 'operador' ? 'solicitante' : 'operador')}>
            Mudar para {userRole === 'operador' ? 'Solicitante' : 'Operador'}
          </Button>
        </div>
      </header>
      
      <div className="mb-6">
        <Tabs defaultValue="meus-tickets">
          <TabsList className="mb-4">
            <TabsTrigger value="meus-tickets">Meus Tickets</TabsTrigger>
            <TabsTrigger value="novo-ticket">Novo Ticket</TabsTrigger>
            {userRole === 'operador' && <TabsTrigger value="todos-tickets">Todos os Tickets</TabsTrigger>}
            {userRole === 'operador' && <TabsTrigger value="relatorios">Relatórios</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="meus-tickets">
            <div className="flex justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Meus Tickets</h2>
                <p className="text-gray-500">Visualize e acompanhe seus tickets</p>
              </div>
              <div className="flex gap-2">
                <Input className="w-64" placeholder="Pesquisar tickets..." />
                <select className="px-4 py-2 border rounded">
                  <option value="todos">Todos os Status</option>
                  <option value="aberto">Abertos</option>
                  <option value="resolvido">Resolvidos</option>
                </select>
              </div>
            </div>
            
            <div className="grid gap-4">
              {/* Ticket 1 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg">TK-2024-00123: Transferência de Item para Filial Centro</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Aberto em 14/03/2025 09:35
                    </CardDescription>
                  </div>
                  <Badge className={userRole === 'solicitante' ? 'bg-yellow-500' : 'bg-blue-500'}>
                    {userRole === 'solicitante' ? 'Em Análise' : 'Atribuído a Você'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Filial Origem</p>
                      <p>Filial Sul</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Filial Destino</p>
                      <p>Filial Centro</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Tipo de Venda</p>
                      <p>Corporativo</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Item</p>
                    <p>Monitor Dell P2419H</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-500">Quantidade</p>
                    <p>2 unidades</p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-1" /> Comentários (3)
                    </Button>
                    <Button size="sm" variant="outline">
                      <FileText className="h-4 w-4 mr-1" /> Anexos (1)
                    </Button>
                  </div>
                  <Button>
                    Ver Detalhes <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Ticket 2 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg">TK-2024-00118: Solicitação de Novo Equipamento</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Aberto em 12/03/2025 14:22
                    </CardDescription>
                  </div>
                  <Badge className="bg-green-500">Resolvido</Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Filial Origem</p>
                      <p>Filial Sul</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Filial Destino</p>
                      <p>N/A</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Tipo de Venda</p>
                      <p>Varejo</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Item</p>
                    <p>Notebook HP ProBook</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-500">Quantidade</p>
                    <p>1 unidade</p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-1" /> Comentários (5)
                    </Button>
                    <Button size="sm" variant="outline">
                      <FileText className="h-4 w-4 mr-1" /> Anexos (2)
                    </Button>
                  </div>
                  <Button>
                    Ver Detalhes <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="novo-ticket">
            <Card>
              <CardHeader>
                <CardTitle>Abrir Novo Ticket</CardTitle>
                <CardDescription>Preencha os campos para criar um novo ticket</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="filial-origem">Filial Origem</Label>
                      <select id="filial-origem" className="w-full px-3 py-2 border rounded">
                        <option value="">Selecione a filial</option>
                        <option value="1">Filial Sul</option>
                        <option value="2">Filial Norte</option>
                        <option value="3">Filial Centro</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="filial-destino">Filial Destino</Label>
                      <select id="filial-destino" className="w-full px-3 py-2 border rounded">
                        <option value="">Selecione a filial (se aplicável)</option>
                        <option value="1">Filial Sul</option>
                        <option value="2">Filial Norte</option>
                        <option value="3">Filial Centro</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipo-venda">Tipo de Venda</Label>
                      <select id="tipo-venda" className="w-full px-3 py-2 border rounded">
                        <option value="">Selecione o tipo</option>
                        <option value="corporativo">Corporativo</option>
                        <option value="varejo">Varejo</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="categoria">Categoria</Label>
                      <select id="categoria" className="w-full px-3 py-2 border rounded">
                        <option value="">Selecione a categoria</option>
                        <option value="1">Transferência de Item</option>
                        <option value="2">Solicitação de Novo Item</option>
                        <option value="3">Suporte Técnico</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="assunto">Assunto</Label>
                    <Input id="assunto" placeholder="Descreva o assunto brevemente" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <div className="flex gap-2 items-center">
                      {selectedProduct ? (
                        <div className="flex-1 p-3 border rounded-md">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">{selectedProduct.nmproduto}</p>
                              <p className="text-sm text-gray-500">Código: {selectedProduct.cdproduto}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">Estoque: {selectedProduct.sktotal}</p>
                              <p className="font-medium">
                                {selectedProduct.vlprecosugerido.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 p-3 border rounded-md border-dashed text-center text-gray-500">
                          Nenhum item selecionado
                        </div>
                      )}
                      <Button type="button" onClick={() => setAddProductOpen(true)}>
                        <Search className="h-4 w-4 mr-2" />
                        {selectedProduct ? 'Trocar Item' : 'Buscar Item'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantidade">Quantidade</Label>
                      <Input id="quantidade" type="number" min="1" defaultValue="1" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="prioridade">Prioridade</Label>
                      <select id="prioridade" className="w-full px-3 py-2 border rounded">
                        <option value="baixa">Baixa</option>
                        <option value="normal">Normal</option>
                        <option value="alta">Alta</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="observacao">Observações</Label>
                    <Textarea id="observacao" placeholder="Descreva sua solicitação em detalhes..." rows={4} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="anexo">Anexos (opcional)</Label>
                    <Input id="anexo" type="file" multiple />
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancelar</Button>
                <Button>Abrir Ticket</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {userRole === 'operador' && (
            <TabsContent value="todos-tickets">
              <div className="space-y-4">
                <div className="flex justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">Todos os Tickets</h2>
                    <p className="text-gray-500">Visualize e gerencie todos os tickets do sistema</p>
                  </div>
                  <div className="flex gap-2">
                    <Input className="w-64" placeholder="Pesquisar tickets..." />
                    <select className="px-3 py-2 border rounded">
                      <option value="todos">Todos os Status</option>
                      <option value="novo">Novos</option>
                      <option value="analise">Em Análise</option>
                      <option value="andamento">Em Andamento</option>
                    </select>
                    <select className="px-3 py-2 border rounded">
                      <option value="todos">Todas as Filiais</option>
                      <option value="1">Filial Sul</option>
                      <option value="2">Filial Norte</option>
                      <option value="3">Filial Centro</option>
                    </select>
                    <Button>
                      <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardHeader className="py-3">
                    <div className="grid grid-cols-12 font-medium">
                      <div className="col-span-1">Código</div>
                      <div className="col-span-3">Assunto</div>
                      <div className="col-span-2">Solicitante</div>
                      <div className="col-span-1">Filial</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-1">Prioridade</div>
                      <div className="col-span-2">Data Abertura</div>
                      <div className="col-span-1">Ações</div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 py-3 border-b items-center">
                        <div className="col-span-1">TK-2024-00125</div>
                        <div className="col-span-3">Problema com Impressora</div>
                        <div className="col-span-2">Maria Oliveira</div>
                        <div className="col-span-1">Centro</div>
                        <div className="col-span-1"><Badge className="bg-blue-500">Novo</Badge></div>
                        <div className="col-span-1"><Badge className="bg-red-500">Urgente</Badge></div>
                        <div className="col-span-2">14/03/2025 11:42</div>
                        <div className="col-span-1">
                          <Button size="sm">Atender</Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-12 py-3 border-b items-center">
                        <div className="col-span-1">TK-2024-00124</div>
                        <div className="col-span-3">Transferência de Estoque</div>
                        <div className="col-span-2">Pedro Santos</div>
                        <div className="col-span-1">Norte</div>
                        <div className="col-span-1"><Badge className="bg-yellow-500">Em Análise</Badge></div>
                        <div className="col-span-1"><Badge className="bg-yellow-500">Normal</Badge></div>
                        <div className="col-span-2">14/03/2025 10:15</div>
                        <div className="col-span-1">
                          <Button size="sm">Ver</Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-12 py-3 border-b items-center">
                        <div className="col-span-1">TK-2024-00123</div>
                        <div className="col-span-3">Transferência de Item para Filial Centro</div>
                        <div className="col-span-2">João Silva</div>
                        <div className="col-span-1">Sul</div>
                        <div className="col-span-1"><Badge className="bg-green-500">Em Andamento</Badge></div>
                        <div className="col-span-1"><Badge className="bg-blue-500">Baixa</Badge></div>
                        <div className="col-span-2">14/03/2025 09:35</div>
                        <div className="col-span-1">
                          <Button size="sm">Ver</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Mostrando 3 de 48 tickets</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" disabled>Anterior</Button>
                      <Button size="sm" variant="outline">1</Button>
                      <Button size="sm">2</Button>
                      <Button size="sm" variant="outline">3</Button>
                      <Button size="sm" variant="outline">Próximo</Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
          )}
          
          {userRole === 'operador' && (
            <TabsContent value="relatorios">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold">Relatórios e Estatísticas</h2>
                  <p className="text-gray-500">Acompanhe o desempenho do sistema de tickets</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tickets por Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gray-100 rounded-md">
                        [Gráfico de Pizza]
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tickets por Filial</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gray-100 rounded-md">
                        [Gráfico de Barras]
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tempo de Resolução</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gray-100 rounded-md">
                        [Gráfico de Linhas]
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Relatórios Personalizados</CardTitle>
                    <CardDescription>Crie relatórios personalizados com filtros específicos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="data-inicio">Data Início</Label>
                        <Input id="data-inicio" type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="data-fim">Data Fim</Label>
                        <Input id="data-fim" type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filtro-filial">Filial</Label>
                        <select id="filtro-filial" className="w-full px-3 py-2 border rounded">
                          <option value="todas">Todas as Filiais</option>
                          <option value="1">Filial Sul</option>
                          <option value="2">Filial Norte</option>
                          <option value="3">Filial Centro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filtro-status">Status</Label>
                        <select id="filtro-status" className="w-full px-3 py-2 border rounded">
                          <option value="todos">Todos os Status</option>
                          <option value="aberto">Abertos</option>
                          <option value="resolvido">Resolvidos</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 space-x-2">
                      <Button>Gerar Relatório</Button>
                      <Button variant="outline">Exportar para Excel</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
      
      {/* Diálogo para adicionar produto */}
      <AddProductDialog
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onProductSelect={handleAddProduct}
      />
    </div>
  );
};

export default HelpDeskInterface;