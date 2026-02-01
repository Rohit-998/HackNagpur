'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Lock, Mail, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = (e) => {
    e.preventDefault()
    setLoading(true)

    // FAKE AUTH LOGIC FOR DEMO
    setTimeout(() => {
      // 1. Enforce Password
      if (password !== 'admin') {
        alert('ACCESS DENIED: Invalid Passcode')
        setLoading(false)
        return
      }

      let hospitalData = null

      if (email.includes('citygeneral')) {
        hospitalData = {
          id: 1,
          name: 'General City Hospital',
          role: 'Triage Admin',
          email: email
        }
      } else if (email.includes('westside')) {
        hospitalData = {
          id: 2,
          name: 'Westside Urgent Care',
          role: 'Triage Nurse',
          email: email
        }
      } else if (email.includes('trauma')) {
        hospitalData = {
          id: 3,
          name: 'Memorial Trauma Center',
          role: 'Chief Resident',
          email: email
        }
      } else {
        // Default fallback for judges
        hospitalData = {
          id: 1,
          name: 'General City Hospital',
          role: 'Guest User',
          email: email
        }
      }

      // Save session
      localStorage.setItem('hospital_session', JSON.stringify(hospitalData))
      
      // Redirect
      router.push('/dashboard')
    }, 800)
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0a0a]">
       {/* Background Effects */}
       <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse"></div>
       <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]"></div>

       <div className="relative z-10 w-full max-w-md p-6">
         <div className="glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
           
           <div className="text-center mb-8">
             <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
               <Activity size={32} className="text-white" />
             </div>
             <h1 className="text-3xl font-display font-bold text-white mb-2">HT-1 Access</h1>
             <p className="text-slate-400 text-sm">Secure Clinical Command Center</p>
           </div>

           <form onSubmit={handleLogin} className="space-y-4">
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Identity</label>
               <div className="relative">
                 <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                 <input 
                   type="email" 
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   placeholder="admin@citygeneral.com"
                   className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all font-mono text-sm"
                   required
                 />
               </div>
             </div>

             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Passcode</label>
               <div className="relative">
                 <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                 <input 
                   type="password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   placeholder="••••••••"
                   className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all font-mono text-sm"
                   required
                 />
               </div>
             </div>

             <div className="pt-4">
               <button 
                 type="submit" 
                 disabled={loading}
                 className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
               >
                 {loading ? (
                   <span className="animate-pulse">Authenticating...</span>
                 ) : (
                   <>
                     Access System <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                   </>
                 )}
               </button>
             </div>
           </form>

           <div className="mt-6 pt-6 border-t border-white/5 text-center">
             <p className="text-xs text-slate-500 mb-2">Demo Credentials:</p>
             <div className="flex gap-2 justify-center text-[10px font-mono text-slate-400]">
               <span className="px-2 py-1 bg-white/5 rounded cursor-pointer hover:text-white" onClick={() => setEmail('admin@citygeneral.com')}>@citygeneral.com</span>
               <span className="px-2 py-1 bg-white/5 rounded cursor-pointer hover:text-white" onClick={() => setEmail('nurse@westside.com')}>@westside.com</span>
             </div>
           </div>

         </div>
       </div>
    </main>
  )
}
