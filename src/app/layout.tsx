import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'katex/dist/katex.min.css'
import ConditionalLayout from '@/components/ConditionalLayout'
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Arthea Smart Class | Platform Belajar Cerdas AI',
  description: 'Arthea Smart Class adalah platform belajar cerdas berbasis AI untuk menyiapkan generasi terbaik Indonesia dalam menghadapi OSN dan ujian kompetitif lainnya.',
  keywords: ['arthea', 'smart class', 'belajar ai', 'persiapan osn', 'tryout online', 'pendidikan indonesia'],
  authors: [{ name: 'Arsyir Dev' }],
  metadataBase: new URL('https://arthea-smart-class.arsyir.my.id'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Arthea Smart Class',
    description: 'Platform belajar cerdas berbasis AI untuk generasi terbaik Indonesia.',
    url: 'https://arthea-smart-class.arsyir.my.id',
    siteName: 'Arthea Smart Class',
    locale: 'id_ID',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen bg-[#e5ddd5] dark:bg-[#0b141a] text-gray-900 dark:text-gray-100 flex flex-col relative overflow-x-hidden">
        <div className="fixed inset-0 z-0 opacity-10 dark:opacity-5 mix-blend-multiply dark:mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/always-grey.png")' }}></div>
        <div className="relative z-10 w-full flex-1">
          <AuthProvider>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}
