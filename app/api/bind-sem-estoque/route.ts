import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET() {
    try {
        const { data, error } = await supabase
            .rpc('get_bind_sem_estoque_items')

        if (error) throw error

        return Response.json(data)
    } catch (error) {
        console.error('Error:', error)
        return Response.json({ error: 'Failed to fetch bind sem estoque data' }, { status: 500 })
    }
}

export async function OPTIONS() {
    return Response.json(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
} 