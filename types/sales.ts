export interface DailySale {
    cdpedido: string
    nrdocumento: string
    nmpessoa: string
    nmrepresentantevenda: string
    nmempresacurtovenda: string
    tpmovimentooperacao: string
    qtdsku: number
    total_faturamento: number
    total_custo_produto: number
    margem: string
}

export interface SaleDetail {
    cdpedido: string
    nrdocumento: string
    tppessoa: string
    nmpessoa: string
    nmrepresentantevenda: string
    nmempresacurtovenda: string
    vlfaturamento: number
    vltotalcustoproduto: number
    margem: string
    cdproduto: string
    nmproduto: string
    nmgrupoproduto: string
    qtbrutaproduto: number
    tpmovimentooperacao: string
    dsunidadedenegocio: string
} 