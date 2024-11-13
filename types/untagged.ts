export type UntaggedItem = {
    codigo: string
    nome: string
    estoque: number
}

export type CachedData = {
    items: UntaggedItem[]
    timestamp: number
} 