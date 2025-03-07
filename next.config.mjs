/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        NEXT_PUBLIC_AUTH_PASSWORD: process.env.NEXT_PUBLIC_AUTH_PASSWORD,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        GOOGLE_CX: process.env.GOOGLE_CX,
    },
    serverRuntimeConfig: {
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    publicRuntimeConfig: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'kinftxezwizaoyrcbfqc.supabase.co',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'images.google.com',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'encrypted-tbn0.gstatic.com',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'encrypted-tbn1.gstatic.com',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'encrypted-tbn2.gstatic.com',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'encrypted-tbn3.gstatic.com',
                pathname: '**',
            },
        ],
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    output: 'standalone',
    experimental: {
        memoryBasedWorkersCount: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig; 