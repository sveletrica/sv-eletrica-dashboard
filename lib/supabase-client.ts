import { createClient } from '@supabase/supabase-js'

// Public URL is safe to use on client and server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

// Check for required environment variables
if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

/**
 * Creates a Supabase admin client with the service role key.
 * IMPORTANT: This should ONLY be used in server contexts (API routes, Server Components, etc.)
 * Never import this function in client components or expose it to the browser.
 */
export function createAdminClient() {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseServiceKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
    }
    
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}

/**
 * For backward compatibility with existing code.
 * This will be deprecated - use createAdminClient() instead.
 * IMPORTANT: Only use in server-side contexts.
 */
export const supabaseAdmin = createAdminClient()

/**
 * For backward compatibility with existing code.
 * This will be deprecated - use createAdminClient() instead.
 * IMPORTANT: Only use in server-side contexts.
 */
export const supabase = supabaseAdmin

/**
 * Creates a Supabase client with the anonymous key.
 * This is safe to use in both client and server contexts.
 * Use this for unauthenticated operations or when working with client components.
 */
export function createPublicClient() {
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseAnonKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
    }
    
    return createClient(supabaseUrl, supabaseAnonKey)
} 