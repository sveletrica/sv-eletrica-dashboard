import { NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    if (!GOOGLE_API_KEY || !GOOGLE_CX) {
        return NextResponse.json({ error: 'Google API configuration missing' }, { status: 500 });
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&searchType=image&num=1`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch from Google API');
        }

        const data = await response.json();
        const firstImage = data.items?.[0];

        if (!firstImage) {
            return NextResponse.json(null);
        }

        return NextResponse.json({
            url: firstImage.link,
            alt: firstImage.title
        });
    } catch (error) {
        console.error('Error fetching image:', error);
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
    }
} 