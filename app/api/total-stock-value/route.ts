import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET() {
    try {
        // Query to calculate the total stock value
        const { data, error } = await supabase
            .from('mvw_mssql_etiquetasio_estoques')
            .select('stktotal, vlprecoreposicao')
            .gt('stktotal', 0);

        if (error) {
            console.error('Supabase Error:', error);
            throw error;
        }

        // Calculate the total value
        let totalValue = 0;
        if (data && data.length > 0) {
            totalValue = data.reduce((sum, item) => {
                if (item.stktotal && item.vlprecoreposicao) {
                    return sum + (item.stktotal * item.vlprecoreposicao);
                }
                return sum;
            }, 0);
        }

        // Format the value in Brazilian currency with compact notation for millions
        const formattedValue = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(totalValue);

        return NextResponse.json({
            totalValue,
            totalItems: data.length,
            formattedValue
        });
    } catch (error: any) {
        console.error('API Route Error:', error);
        return NextResponse.json(
            { 
                totalValue: 0,
                totalItems: 0,
                formattedValue: 'R$ 0,00',
                error: 'Internal Server Error', 
                details: error.message 
            },
            { status: 500 }
        );
    }
}
