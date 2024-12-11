export type MaracanauItem = {
    id: string
    NmProduto: string
    CdProduto: string
    NmGrupoProduto: string
    NmFamiliaProduto: string
    QtEstoque_Empresa59: number
    VlPreco_Empresa59: number
    PrecoPromo: number | null
    PrecoDe: number | null
    DataInicio: string | null
    DataFim: string | null
    Atualizacao: string
}

export type ColumnId = keyof MaracanauItem

export const columnDefinitions: Record<ColumnId, { label: string }> = {
    id: { label: 'ID' },
    NmProduto: { label: 'Produto' },
    CdProduto: { label: 'Código' },
    NmGrupoProduto: { label: 'Grupo' },
    NmFamiliaProduto: { label: 'Família' },
    QtEstoque_Empresa59: { label: 'Estoque Maracanau' },
    VlPreco_Empresa59: { label: 'Preço Maracanau' },
    PrecoPromo: { label: 'Preço Promo' },
    PrecoDe: { label: 'Preço De' },
    DataInicio: { label: 'Início Promo' },
    DataFim: { label: 'Fim Promo' },
    Atualizacao: { label: 'Atualização' },
}

export function getDefaultVisibleColumns(): Set<ColumnId> {
    return new Set([
        'NmProduto',
        'CdProduto',
        'NmGrupoProduto',
        'QtEstoque_Empresa59',
        'VlPreco_Empresa59',
        'PrecoPromo',
        'Atualizacao'
    ])
}

export type MaracanauStats = {
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
    stats: MaracanauStats
    timestamp: number
} 