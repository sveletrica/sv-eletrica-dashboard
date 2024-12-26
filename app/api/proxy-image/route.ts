import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const url = request.nextUrl.searchParams.get('url')
        if (!url) {
            return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
        }

        const response = await fetch(url, {
            headers: {
                // Simula um navegador Chrome
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': new URL(url).origin,
                'Sec-Fetch-Dest': 'image',
                'Sec-Fetch-Mode': 'no-cors',
                'Sec-Fetch-Site': 'cross-site',
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
        }

        const contentType = response.headers.get('Content-Type')
        
        // Verifica se é uma imagem de forma mais permissiva
        if (!contentType || (!contentType.startsWith('image/') && !contentType.includes('application/octet-stream'))) {
            console.error('Invalid content type:', contentType)
            throw new Error(`Invalid content type: ${contentType}`)
        }

        const buffer = await response.arrayBuffer()
        
        // Se o content-type for application/octet-stream mas sabemos que é uma imagem pela extensão
        const finalContentType = contentType === 'application/octet-stream' 
            ? (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg'))
                ? 'image/jpeg'
                : url.toLowerCase().endsWith('.png')
                    ? 'image/png'
                    : contentType
            : contentType

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': finalContentType,
                'Content-Length': buffer.byteLength.toString(),
                'Cache-Control': 'public, max-age=31536000',
            },
        })
    } catch (error: any) {
        console.error('Proxy error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to proxy image' },
            { status: 500 }
        )
    }
}

export async function OPTIONS(request: Request) {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    })
} 