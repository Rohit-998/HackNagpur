import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 grid-bg z-[-1]"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary-500/20 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 py-24">
        {/* Hero Section */}
        <div className="text-center mb-12 md:mb-24 relative z-10 animate-float">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            HT-1 System Online
          </div>
          
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-display font-bold mb-6 tracking-tight text-white leading-tight">
            Triage <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-cyan-200">Intelligence</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
            The next generation of critical care prioritization. 
            AI-powered decision support for high-velocity clinical environments.
          </p>
        </div>

        {/* Action Grid (Bento Style) */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          <Link href="/checkin" className="group col-span-1 md:col-span-1">
            <div className="glass-card h-full p-8 flex flex-col justify-between hover:bg-primary-900/10">
              <div className="mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-600 flex items-center justify-center text-3xl mb-6 shadow-glow">
                  📝
                </div>
                <h2 className="text-3xl font-display font-bold text-white mb-2">Patient Intake</h2>
                <p className="text-slate-400">Rapid assessment protocol with vitals and AI symptom analysis.</p>
              </div>
              <div className="flex items-center text-primary-400 font-medium group-hover:translate-x-2 transition-transform">
                Initiate Protocol <span className="ml-2">→</span>
              </div>
            </div>
          </Link>

          <Link href="/dashboard" className="group col-span-1 md:col-span-2">
            <div className="glass-card h-full p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between h-full gap-8">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl mb-6">
                    📊
                  </div>
                  <h2 className="text-3xl font-display font-bold text-white mb-2">Live Command Center</h2>
                  <p className="text-slate-400 max-w-md">Real-time telemetry and queue orchestration. Monitor critical breaches and AI alerts instantly.</p>
                </div>
                <div className="bg-primary-600/20 border border-primary-500/30 backdrop-blur-md rounded-xl px-6 py-3 text-primary-300 font-mono text-sm">
                  Waiting: <span className="text-white font-bold text-lg">Active</span>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin" className="group col-span-1">
            <div className="glass-card p-8 h-full flex flex-col justify-center items-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl mb-4 text-slate-400 group-hover:text-white transition-colors">
                ⚙️
              </div>
              <h3 className="text-lg font-semibold text-slate-200">System Config</h3>
              <p className="text-sm text-slate-500 mt-2">Algorithm Weights</p>
            </div>
          </Link> 

           <div className="col-span-1 md:col-span-2 glass-panel rounded-2xl p-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-4xl">🤖</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Powered by Groq LPU™</h3>
                  <p className="text-slate-400 text-sm">Sub-second inference for clinical decision support</p>
                </div>
              </div>
              <div className="hidden md:flex gap-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-1 h-8 bg-primary-500/30 rounded-full animate-pulse" style={{animationDelay: `${i * 0.1}s`}}></div>
                ))}
              </div>
           </div>
        </div>

        {/* Footer info */}
        <div className="text-center border-t border-slate-800 pt-8">
            <p className="text-slate-600 text-sm font-mono">
                SYSTEM STATUS: <span className="text-emerald-500">OPERATIONAL</span> | VERSION 2.0.4
            </p>
        </div>
      </div>
    </main>
  )
}
