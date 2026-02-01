'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Activity, ShieldCheck, Zap, ArrowRight, Lock } from 'lucide-react'

export default function LandingPage() {
  const [session, setSession] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('hospital_session')
    if (stored) setSession(JSON.parse(stored))
  }, [])

  if (!mounted) return null

  return (
    <main className="min-h-screen bg-slate-950 text-white relative overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-cyan-500/30">
        
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-8">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-400 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                SYSTEM ONLINE // V2.4.0
            </div>

            {/* Title */}
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-slate-500 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                HT-1 TRIAGE
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
                The next generation of emergency response. <br className="hidden md:block"/>
                <span className="text-cyan-400">AI-Powered Injury Analysis</span>, <span className="text-blue-400">Smart City Routing</span>, and <span className="text-purple-400">Real-time Coordination</span>.
            </p>

            {/* Actions */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-8 animate-in fade-in zoom-in duration-1000 delay-300">
                {session ? (
                    <Link href="/dashboard" className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-cyan-600 font-lg rounded-xl hover:bg-cyan-500 hover:shadow-lg hover:shadow-cyan-500/30 focus:outline-none ring-offset-2 focus:ring-2 ring-cyan-500">
                        <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
                        <span className="relative flex items-center gap-3">
                           ENTER DASHBOARD <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </span>
                    </Link>
                ) : (
                    <Link href="/login" className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-blue-600 font-lg rounded-xl hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/30 focus:outline-none ring-offset-2 focus:ring-2 ring-blue-500">
                         <span className="relative flex items-center gap-3">
                           SECURE LOGIN <Lock size={18} />
                        </span>
                    </Link>
                )}
                
                <Link href="/checkin" className="px-8 py-4 font-bold text-slate-300 transition-all duration-200 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-800 hover:text-white hover:border-slate-500 flex items-center gap-2">
                    Check-in Patient <Activity size={18} />
                </Link>
            </div>

            {/* Features Snippet */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mt-12 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500 opacity-60">
                <div className="p-4 rounded-lg bg-white/5 border border-white/5 backdrop-blur-sm">
                    <ShieldCheck className="text-cyan-400 mb-2" size={24} />
                    <h3 className="font-bold text-white">Client-Side AI</h3>
                    <p className="text-xs text-slate-400 mt-1">Privacy-first injury analysis running locally.</p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/5 backdrop-blur-sm">
                    <Zap className="text-blue-400 mb-2" size={24} />
                    <h3 className="font-bold text-white">Instant Triage</h3>
                    <p className="text-xs text-slate-400 mt-1">Hybrid ML + Rules engine for microsecond scoring.</p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/5 backdrop-blur-sm">
                    <Activity className="text-purple-400 mb-2" size={24} />
                    <h3 className="font-bold text-white">City Grid</h3>
                    <p className="text-xs text-slate-400 mt-1">Load balancing across entire metro network.</p>
                </div>
            </div>

        </div>
    </main>
  )
}
