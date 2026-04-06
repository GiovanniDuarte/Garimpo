import type { Metadata } from 'next'
import { Roboto, Roboto_Mono, Outfit } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const roboto = Roboto({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

const outfit = Outfit({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  display: 'swap',
})

const robotoMono = Roboto_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Garimpo',
  description: 'Descubra e modele canais vencedores no YouTube',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body
        className={`${roboto.variable} ${outfit.variable} ${robotoMono.variable} min-h-full antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
