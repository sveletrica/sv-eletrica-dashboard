export class GoogleCustomSearch {
    private apiKey: string
    private cx: string

    constructor(apiKey: string, cx: string) {
        this.apiKey = apiKey
        this.cx = cx
    }

    async searchImages(query: string) {
        const url = `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${this.cx}&q=${encodeURIComponent(query)}&searchType=image`

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error('Failed to fetch from Google API')
        }

        const data = await response.json()
        return data.items?.map((item: any) => ({
            url: item.link,
            alt: item.title
        })) || []
    }
} 