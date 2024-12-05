'use client'

import QuotationDetails from '../page'
import { use } from 'react'

export default function QuotationPage({ params }: { params: Promise<{ cdpedido: string }> }) {
    const resolvedParams = use(params)
    return <QuotationDetails initialCode={resolvedParams.cdpedido} />
} 