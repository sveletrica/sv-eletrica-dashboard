import { NextResponse } from 'next/server';

const SERPAPI_KEY = process.env.SERPAPI_KEY;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');

        if (!query) {
            return NextResponse.json(
                { error: 'Query parameter is required' },
                { status: 400 }
            );
        }

        if (!SERPAPI_KEY) {
            return NextResponse.json(
                { error: 'SerpAPI key missing' },
                { status: 500 }
            );
        }

        // Enhance search query for better product results
        const enhancedQuery = `${query}`;

        // Build SerpAPI URL with parameters
        const serpApiUrl = `https://serpapi.com/search.json?` + 
            new URLSearchParams({
                engine: 'google_images',
                q: enhancedQuery,
                google_domain: 'google.com.br',
                location: 'Brazil',
                hl: 'pt',
                gl: 'br',
                api_key: SERPAPI_KEY
            });

        const response = await fetch(serpApiUrl);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SerpAPI Error:', errorText);
            throw new Error(`SerpAPI error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.images_results?.length) {
            console.log('No results found for query:', query);
            return NextResponse.json([]);
        }

        const images = data.images_results
            .filter((item: any) => {
                // Filter out invalid images
                const validImage = 
                    item.original && 
                    item.original_width > 200 && 
                    item.original_height > 200 &&
                    !item.original.includes('data:image') &&
                    !item.original.includes('base64');
                
                if (!validImage) {
                    console.log('Filtered out image:', item.original);
                }
                
                return validImage;
            })
            .map((item: any) => ({
                url: item.original,
                alt: item.title || '',
                thumbnail: item.thumbnail,
                width: item.original_width,
                height: item.original_height,
                source: item.source,
                position: item.position
            }));

        return NextResponse.json(images);
    } catch (error) {
        console.error('Error fetching images:', error);
        return NextResponse.json(
            { error: 'Failed to fetch images', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 