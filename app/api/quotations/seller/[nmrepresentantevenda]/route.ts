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

export async function GET(
    request: Request,
    { params }: { params: { nmrepresentantevenda: string } }
) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '10')
        const nmrepresentantevenda = decodeURIComponent(params.nmrepresentantevenda)

        // Ordenar primeiro por data_ordenacao e depois por cdpedidodevenda, ambos em ordem descendente
        let queryUrl = `https://kinftxezwizaoyrcbfqc.supabase.co/rest/v1/vw_biorcamento_aux_agregado?select=*&order=data_ordenacao.desc,cdpedidodevenda.desc&limit=${limit}&nmrepresentantevenda=eq.${encodeURIComponent(nmrepresentantevenda)}`

        const response = await fetchWithRetry(
            queryUrl,
            {
                headers: {
                    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
                }
            }
        )

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error in seller quotations API:', error)
        return NextResponse.json(
            { error: 'Failed to fetch seller quotations' },
            { status: 500 }
        )
    }
} 