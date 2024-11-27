import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('vw_etiquetasio_estoque_produtos_unicos')
            .select('cdproduto, nmproduto')

        if (error) throw error

        return Response.json(data)
    } catch (error) {
        console.error('Error:', error)
        return Response.json({ error: 'Failed to fetch products' }, { status: 500 })
    }
} 