import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-client';

export async function POST(request: Request) {
    try {
        const { userId, userName, orderNumber } = await request.json();

        if (!userId || !userName || !orderNumber) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // Insert log into the sql_import_logs table
        const { data, error } = await supabase
            .from('sql_import_logs')
            .insert({
                user_id: userId,
                user_name: userName,
                order_number: orderNumber,
                timestamp: new Date().toISOString()
            });

        if (error) {
            console.error('Error logging SQL import:', error);
            return NextResponse.json(
                { error: 'Failed to log SQL import' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in SQL import logging:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 