import './globals.css'
import { Inter } from 'next/font/google'
import { RealtimeProvider } from '@/components/RealtimeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'HT-1 Patient Queue & Triage Optimizer',
  description: 'Privacy-first, explainable triage system for busy clinics',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RealtimeProvider>
          {children}
        </RealtimeProvider>
      </body>
    </html>
  )
}
