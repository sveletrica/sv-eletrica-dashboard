import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET() {
    try {
        // Execute a raw SQL query to count unique CdChamada values
        const { data, error } = await supabase
            .rpc('execute_sql', {
                sql: 'SELECT COUNT(DISTINCT "CdChamada") as total_items FROM "DBestoque";'
            })

        if (error) {
            console.error('Supabase Error:', error)
            throw error
        }

        // The result should be an array with one item containing the count
        const totalItems = data && data.length > 0 ? data[0].total_items : 0

        return NextResponse.json({ totalItems })
    } catch (error: any) {
        console.error('API Route Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}