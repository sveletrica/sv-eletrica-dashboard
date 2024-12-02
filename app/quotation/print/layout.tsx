import './styles.css'
import { Sora, Roboto } from 'next/font/google'
import { cn } from '@/lib/utils'

const sora = Sora({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-sora',
})

const roboto = Roboto({
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    variable: '--font-roboto',
})

export default function PrintLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div 
            suppressHydrationWarning
            className={cn(
                "min-h-screen bg-white font-sans antialiased print:bg-transparent",
                sora.variable,
                roboto.variable
            )}
        >
            {children}
        </div>
    )
} 