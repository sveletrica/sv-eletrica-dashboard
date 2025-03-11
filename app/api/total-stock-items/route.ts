import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET() {
    try {
        const { count, error } = await supabase
            .from('DBestoque')
            .select('CdChamada', { count: 'exact', head: true })
            .gt('StkTotal', 0)
            .limit(1);

        if (error) {
            console.error('Supabase Error:', error);
            throw error;
        }

        return NextResponse.json({ totalItems: count });
    } catch (error: any) {
        console.error('API Route Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}