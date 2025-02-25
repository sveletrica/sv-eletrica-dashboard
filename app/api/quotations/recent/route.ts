import { NextResponse } from 'next/server'

const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos timeout

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            if (response.ok) {
                return response
            }
        } catch (error) {
            if (i === retries - 1) throw error
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }
    throw new Error('Failed after retries')
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const branch = searchParams.get('branch')
        const seller = searchParams.get('seller')
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '25')
        
        // Calculate offset for pagination
        const offset = (page - 1) * pageSize

        // Ordenar primeiro por data_ordenacao e depois por cdpedidodevenda, ambos em ordem descendente
        // Usando .desc para ordenação descendente
        let queryUrl = `https://kinftxezwizaoyrcbfqc.supabase.co/rest/v1/vw_biorcamento_aux_agregado?select=*&order=data_ordenacao.desc,cdpedidodevenda.desc&limit=${pageSize}&offset=${offset}`

        if (branch && branch !== 'all') {
            queryUrl += `&nmempresacurtovenda=eq.${encodeURIComponent(branch)}`
        }
        
        if (seller && seller !== 'all') {
            queryUrl += `&nmrepresentantevenda=eq.${encodeURIComponent(seller)}`
        }

        // Abordagem mais simples para obter a contagem total
        // Vamos fazer uma estimativa baseada no número de registros que temos
        // Isso evita problemas com o cabeçalho content-range que pode não estar disponível
        
        const response = await fetchWithRetry(
            queryUrl,
            {
                headers: {
                    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
                }
            }
        );

        const data = await response.json();
        
        // Estimativa de total - se temos menos registros que o pageSize, provavelmente é o total
        // Caso contrário, vamos assumir que há pelo menos mais uma página
        const hasMorePages = data.length >= pageSize;
        const estimatedTotalCount = hasMorePages ? (page * pageSize) + pageSize : (page - 1) * pageSize + data.length;
        const estimatedTotalPages = hasMorePages ? page + 1 : page;
        
        return NextResponse.json({
            data,
            pagination: {
                page,
                pageSize,
                totalCount: estimatedTotalCount,
                totalPages: estimatedTotalPages
            }
        });
    } catch (error) {
        console.error('Error in recent quotations API:', error)
        return NextResponse.json(
            { error: 'Failed to fetch recent quotations' },
            { status: 500 }
        )
    }
} 