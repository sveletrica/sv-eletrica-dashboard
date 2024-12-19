import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('mvw_mssql_bivendas_aux_geral')
            .select('dataextracao')
            .order('dataextracao', { ascending: false })
            .limit(1)

        if (error) throw error

        return NextResponse.json({ dataextracao: data[0]?.dataextracao })
    } catch (error) {
        console.error('Error fetching data extraction date:', error)
        return NextResponse.json({ error: 'Failed to fetch data extraction date' }, { status: 500 })
    }
} 