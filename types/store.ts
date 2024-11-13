export type StoreStats = {
    totalTagged: number
    tagsUsedTwice: number
    taggedNoStock: number
    lastUpdate: string
    recentActivity: {
        date: string
        action: string
        product: string
        user: string
    }[]
}

export type TaggingActivity = {
    date: string
    product: string
    action: 'tagged' | 'untagged' | 'replaced'
    user: string
}