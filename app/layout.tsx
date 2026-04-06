import type { Metadata } from 'next'
import { Roboto, Roboto_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const roboto = Roboto({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

const robotoMono = Roboto_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Garimpo',
  description: 'Descubra e modele canais vencedores no YouTube',
  themeColor: '#0f0f0f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body
        className={`${roboto.variable} ${robotoMono.variable} min-h-full antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
