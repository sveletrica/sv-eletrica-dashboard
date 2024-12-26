/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: [
            'kinftxezwizaoyrcbfqc.supabase.co', // Supabase storage domain
            'images.google.com',                 // For Google image search results
            'encrypted-tbn0.gstatic.com',        // Google image thumbnails
            'encrypted-tbn1.gstatic.com',
            'encrypted-tbn2.gstatic.com',
            'encrypted-tbn3.gstatic.com',
        ],
    },
    env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        NEXT_PUBLIC_AUTH_PASSWORD: process.env.NEXT_PUBLIC_AUTH_PASSWORD,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        GOOGLE_CX: process.env.GOOGLE_CX,
    },
    // Keep any other existing config options
}

module.exports = nextConfig 