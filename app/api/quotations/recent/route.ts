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

        let queryUrl = 'https://kinftxezwizaoyrcbfqc.supabase.co/rest/v1/vw_biorcamento_aux_agregado?select=*&order=data_ordenacao.desc&limit=100'

        if (branch && branch !== 'all') {
            queryUrl += `&nmempresacurtovenda=eq.${encodeURIComponent(branch)}`
        }
        
        if (seller && seller !== 'all') {
            queryUrl += `&nmrepresentantevenda=eq.${encodeURIComponent(seller)}`
        }

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
        console.error('Error in recent quotations API:', error)
        return NextResponse.json(
            { error: 'Failed to fetch recent quotations' },
            { status: 500 }
        )
    }
} 