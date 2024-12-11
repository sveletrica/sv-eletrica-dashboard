if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
}

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export const API_ROUTES = {
    inventory: '/api/inventory',
    untaggedItems: '/api/untagged-items',
    sobral: '/api/sobral',
    maracanau: '/api/maracanau',
} as const