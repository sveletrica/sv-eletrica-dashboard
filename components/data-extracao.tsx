'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function DataExtracao() {
    const [dataExtracao, setDataExtracao] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchDataExtracao() {
            try {
                const response = await fetch('/api/data-extracao')
                if (!response.ok) throw new Error('Failed to fetch data extraction date')
                
                const data = await response.json()
                if (data.dataextracao) {
                    const dateWithoutTZ = data.dataextracao.split('+')[0]
                    const formattedDate = format(parseISO(dateWithoutTZ), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
                    setDataExtracao(formattedDate)
                }
            } catch (err: any) {
                console.error('Error:', err)
                setError('Falha ao carregar a data de extração')
            }
        }

        fetchDataExtracao()
    }, [])

    if (error) return null
    if (!dataExtracao) return null

    return (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded-full text-xs backdrop-blur-sm">
            Dados atualizados em {dataExtracao}
        </div>
    )
} 