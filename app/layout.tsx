import './globals.css'
import type { Metadata } from 'next'
import { Sora, Roboto } from 'next/font/google'
import { Sidebar } from "@/components/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from '@/components/providers/auth-provider'
import { cn } from '@/lib/utils'
import { Toaster } from 'sonner'
import { headers } from 'next/headers'

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

export const metadata: Metadata = {
  title: 'SV Eletrica Dashboard',
  description: 'Electronic tag monitoring for SV Eletrica',
  icons: {
    icon: '/favicon.ico',
  },
}

export const shouldApplyLayout = (pathname: string) => {
  return !pathname.startsWith('/quotation/print')
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const isPrintRoute = pathname.includes('/quotation/print')

  return (
    <html 
      lang="pt-BR" 
      suppressHydrationWarning
      className={cn(
        sora.variable,
        roboto.variable
      )}
    >
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body 
        suppressHydrationWarning
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          sora.variable,
          roboto.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {isPrintRoute ? (
              <main className="min-h-screen bg-white print:bg-transparent">
                {children}
              </main>
            ) : (
              <div className="flex min-h-screen relative">
                <Sidebar />
                <div className="flex-1 flex flex-col min-h-screen w-full">
                  <main className="flex-1 p-4 md:p-6 bg-background">
                    {children}
                  </main>
                </div>
              </div>
            )}
          </AuthProvider>
        </ThemeProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}