import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bacheo Recovery - Sistema de Emergencia',
  description: 'Sistema de carga masiva de evidencia fotográfica para bacheo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
