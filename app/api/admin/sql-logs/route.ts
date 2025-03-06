import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET(_request: NextRequest) {
    try {
        console.log('API Request - SQL Import Logs');

        // Fetch SQL import logs
        const { data, error } = await supabase
            .from('sql_import_logs')
            .select('*')
            .order('timestamp', { ascending: false });

        console.log('Supabase Query:', {
            table: 'sql_import_logs',
            resultCount: data?.length || 0
        });

        if (error) {
            console.error('Supabase Error:', {
                error,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            return NextResponse.json({ error: 'Erro ao buscar logs de importação SQL' }, { status: 500 });
        }

        if (!data || data.length === 0) {
            console.log('No SQL import logs found');
            return NextResponse.json([]);
        }

        console.log('Data found:', {
            count: data.length,
            firstRecord: data[0],
            lastRecord: data[data.length - 1]
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('API Route Error:', {
            error,
            message: error.message,
            stack: error.stack,
            details: error.details
        });
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
} 