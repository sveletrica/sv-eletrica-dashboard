import './globals.css'
import type { Metadata } from 'next'
import { Sora } from 'next/font/google'
import { Sidebar } from "@/components/sidebar"
import { ThemeProvider } from "@/components/theme-provider"

const sora = Sora({
  subsets: ['latin'],
  // Define all the weights we'll use
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sora', // This allows us to reference it in Tailwind
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
    <html lang="en" suppressHydrationWarning className={sora.variable}>
      <head>
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
      </head>
      <body className={sora.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen w-screen">
              <main className="flex-1 p-4 md:p-6 bg-background">
                {children}
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}