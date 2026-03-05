import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { QueryClientProvider } from '../lib/react-query-provider'
import { Toaster } from 'react-hot-toast'
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistema de Inventario',
  description: 'Sistema de inventario para tienda de ropa',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <QueryClientProvider>
          {children}
          <Toaster position="top-right" />
        </QueryClientProvider>
      </body>
    </html>
  )
}