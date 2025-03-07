export type MozartItem = {
    id: string
    NmProduto: string
    CdProduto: string
    NmGrupoProduto: string
    NmFamiliaProduto: string
    QtEstoque_Empresa20: number
    VlPreco_Empresa20: number
    PrecoPromo: number | null
    PrecoDe: number | null
    DataInicio: string | null
    DataFim: string | null
    Atualizacao: string
}

export type ColumnId = keyof MozartItem

export const columnDefinitions: Record<ColumnId, { label: string }> = {
    id: { label: 'ID' },
    NmProduto: { label: 'Produto' },
    CdProduto: { label: 'Código' },
    NmGrupoProduto: { label: 'Grupo' },
    NmFamiliaProduto: { label: 'Família' },
    QtEstoque_Empresa20: { label: 'Estoque Mozart' },
    VlPreco_Empresa20: { label: 'Preço Mozart' },
    PrecoPromo: { label: 'Preço Promo' },
    PrecoDe: { label: 'Preço De' },
    DataInicio: { label: 'Início Promo' },
    DataFim: { label: 'Fim Promo' },
    Atualizacao: { label: 'Atualização' },
};

export function getDefaultVisibleColumns(): Set<ColumnId> {
    return new Set([
        'NmProduto',
        'CdProduto',
        'NmGrupoProduto',
        'QtEstoque_Empresa20',
        'VlPreco_Empresa20',
        'PrecoPromo',
        'Atualizacao'
    ]);
}

export type MozartStats = {
    totalEstoque: number
    produtosEtiquetados: number
    produtosSemEtiqueta: number
    produtosMultiplasEtiquetas: number
    etiquetasDuplicadas: number
    emStkSemEtiq: number
    bindSemStk: number
    skuetiquetados: number
}

export type CachedData = {
    stats: MozartStats
    timestamp: number
} 