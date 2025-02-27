import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('esl_stk_mozart')
            .select(`
                sku,
                produto,
                grupo,
                familia,
                layout,
                unidade,
                stock1,
                QtEstoque_Empresa20,
                price,
                VlPreco_Empresa20
            `)
            .order('sku')

        if (error) {
            console.error('Supabase Error:', error)
            throw error
        }

        return NextResponse.json(data || [])
    } catch (error: any) {
        console.error('API Route Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
} 