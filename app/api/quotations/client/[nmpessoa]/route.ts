import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: { nmpessoa: string } }
) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = searchParams.get('limit') || '10'
        const clientName = decodeURIComponent(params.nmpessoa)

        const response = await fetch(
            `https://kinftxezwizaoyrcbfqc.supabase.co/rest/v1/vw_biorcamento_aux_agregado?nmpessoa=eq.${encodeURIComponent(clientName)}&order=data_ordenacao.desc&limit=${limit}`,
            {
                headers: {
                    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
                }
            }
        )

        if (!response.ok) {
            throw new Error('Failed to fetch client quotations')
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error in client quotations API:', error)
        return NextResponse.json(
            { error: 'Failed to fetch client quotations' },
            { status: 500 }
        )
    }
} 