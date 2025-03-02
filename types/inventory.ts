export interface InventoryItem {
  CdChamada: string;
  NmProduto: string;
  NmGrupoProduto: string;
  NmFamiliaProduto: string;
  NmFornecedorPrincipal: string;
  QtEstoque_Empresa1: number;
  QtEstoque_Empresa4: number;
  QtEstoque_Empresa12: number;
  QtEstoque_Empresa59: number;
  QtEstoque_Empresa13: number;
  QtEstoque_Empresa15: number;
  QtEstoque_Empresa17: number;
  QtEstoque_Empresa20: number;
  StkTotal: number;
  VlPreco_Empresa59: number;
  Atualizacao: string;
  PrecoPromo: number | null;
  StatusPromo: string | null;
  PrecoDe: number | null;
  DataInicio: string | null;
  DataFim: string | null;
  CdSigla: string;
}

export const columnDefinitions = {
  CdChamada: { label: 'Cod', show: true },
  NmProduto: { label: 'Produto', show: true },
  NmGrupoProduto: { label: 'Grupo', show: true },
  NmFamiliaProduto: { label: 'Família', show: false },
  NmFornecedorPrincipal: { label: 'Fornecedor', show: true },
  QtEstoque_Empresa1: { label: 'Stk Matriz', show: true },
  QtEstoque_Empresa4: { label: 'Stk CD', show: true },
  QtEstoque_Empresa12: { label: 'Stk BM', show: false },
  QtEstoque_Empresa59: { label: 'Stk WS', show: true },
  QtEstoque_Empresa13: { label: 'Stk MA', show: false },
  QtEstoque_Empresa15: { label: 'Stk JU', show: false },
  QtEstoque_Empresa17: { label: 'Stk Sobral', show: false },
  QtEstoque_Empresa20: { label: 'Stk Mozart', show: true },
  StkTotal: { label: 'Stk Total', show: true },
  VlPreco_Empresa59: { label: 'Preço', show: true },
  Atualizacao: { label: 'Última Atualização', show: false },
  PrecoPromo: { label: 'Preço Promocional', show: false },
  StatusPromo: { label: 'Status Promoção', show: false },
  PrecoDe: { label: 'Preço Original', show: false },
  DataInicio: { label: 'Início Promoção', show: false },
  DataFim: { label: 'Fim Promoção', show: false },
  CdSigla: { label: 'Un', show: true }
} as const;

export type ColumnId = keyof typeof columnDefinitions;