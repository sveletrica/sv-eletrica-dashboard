import { useState } from 'react'
import { toast } from 'sonner'

export function useClipboard() {
    const [isCopying, setIsCopying] = useState(false)

    const copy = async (text: string) => {
        if (isCopying) return

        try {
            setIsCopying(true)
            await navigator.clipboard.writeText(text)
            toast.success('Copiado para a área de transferência')
        } catch (err) {
            console.error('Failed to copy:', err)
            toast.error('Erro ao copiar para a área de transferência')
        } finally {
            setIsCopying(false)
        }
    }

    return {
        copy,
        isCopying
    }
} 