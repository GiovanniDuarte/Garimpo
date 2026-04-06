import type { Metadata } from 'next'
import { Epilogue, Syne, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const epilogue = Epilogue({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
})

const syne = Syne({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
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
        className={`${epilogue.variable} ${syne.variable} ${jetbrainsMono.variable} min-h-full bg-gp-bg font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
