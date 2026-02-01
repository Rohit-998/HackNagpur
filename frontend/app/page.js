'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // SECURITY GUARD: Check for session immediately
    const session = localStorage.getItem('hospital_session')
    
    if (session) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
         <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
         <p className="text-slate-400 font-mono text-sm animate-pulse">Establishing Secure Uplink...</p>
      </div>
    </main>
  )
}
