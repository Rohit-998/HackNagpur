import './globals.css'
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google'
import { RealtimeProvider } from '@/components/RealtimeProvider'

const outfit = Outfit({ 
  subsets: ['latin'], 
  variable: '--font-outfit',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'], 
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata = {
  title: 'HT-1 Triage Optimizer',
  description: 'AI-Powered Critical Care Prioritization System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${jakarta.variable} font-sans bg-slate-950 text-slate-50 antialiased selection:bg-cyan-500/30 selection:text-cyan-200`}>
        <RealtimeProvider>
          <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
          {children}
        </RealtimeProvider>
      </body>
    </html>
  )
}
