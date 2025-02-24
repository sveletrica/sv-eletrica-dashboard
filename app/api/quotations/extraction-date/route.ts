import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const response = await fetch(
            'https://kinftxezwizaoyrcbfqc.supabase.co/rest/v1/vw_biorcamento_aux?select=dataextracao&order=dataextracao.desc&limit=1',
            {
                headers: {
                    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
                }
            }
        )

        if (!response.ok) {
            throw new Error('Failed to fetch extraction date')
        }

        const data = await response.json()
        return NextResponse.json(data[0])
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch extraction date' },
            { status: 500 }
        )
    }
} 