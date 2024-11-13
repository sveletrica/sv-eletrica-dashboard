if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is defined')
}

export const WEBHOOKS = {
    inventory: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/DBestoque`,
    untaggedItems: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/itenssemetiquetas`,
    sobral: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/apisobral`,
} as const

export const SUPABASE = {
    apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
} as const