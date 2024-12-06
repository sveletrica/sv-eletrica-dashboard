import './globals.css'
import type { Metadata } from 'next'
import { Sora, Roboto } from 'next/font/google'
import { Sidebar } from "@/components/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from '@/components/providers/auth-provider'
import { cn } from '@/lib/utils'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import { Toaster } from "sonner"

const sora = Sora({
  subsets: ['latin'],
  // Define all the weights we'll use
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sora', // This allows us to reference it in Tailwind
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(
      "min-h-screen bg-background font-sans antialiased",
      sora.variable,
      roboto.variable
    )}>
      <head>
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
      </head>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        sora.variable,
        roboto.variable
      )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <AuthProvider>
            <div className="flex min-h-screen relative">
              <Sidebar />
              <div className="flex-1 flex flex-col min-h-screen w-full">
                <main className="flex-1 p-4 md:p-6 bg-background">
                  {children}
                </main>
              </div>
            </div>
          </AuthProvider>
        </ThemeProvider>
        <SpeedInsights />
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}