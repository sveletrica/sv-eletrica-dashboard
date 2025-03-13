import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET(request: Request) {
    try {
        // Get the parameters from the URL
        const { searchParams } = new URL(request.url)
        const year = searchParams.get('year')
        const month = searchParams.get('month')
        
        // If no year or month is provided, use current month
        const currentDate = new Date()
        const currentYear = year || currentDate.getFullYear().toString()
        const currentMonth = month || (currentDate.getMonth() + 1).toString().padStart(2, '0')
        
        // Calculate first and last day of the month
        const firstDayOfMonth = `${currentYear}-${currentMonth}-01`
        
        // Last day of month (correctly calculated in local timezone)
        // O mês em JS é 0-indexed, então para o último dia, usamos o mês seguinte (month) e dia 0
        const lastDay = new Date(parseInt(currentYear), parseInt(currentMonth), 0)
        const lastDayOfMonth = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
        
        console.log(`Buscando dados de vendas diárias de ${firstDayOfMonth} até ${lastDayOfMonth}`)

        // Query the daily sales for the specified month
        const { data, error } = await supabase
            .from('faturamento_diario')
            .select('*')
            .gte('data_emissao', firstDayOfMonth)
            .lte('data_emissao', lastDayOfMonth)
            .order('data_emissao', { ascending: true })

        if (error) throw error

        return NextResponse.json({ data })
    } catch (error) {
        console.error('Error fetching daily sales data:', error)
        return NextResponse.json({ error: 'Failed to fetch daily sales data' }, { status: 500 })
    }
}