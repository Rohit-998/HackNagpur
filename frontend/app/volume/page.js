'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Calendar, Activity, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

export default function VolumePage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ max: 0, min: 0, avg: 0, total: 0, busiest: null })
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  useEffect(() => {
    // 1. Check Session
    const session = localStorage.getItem('hospital_session')
    if (!session) {
      // should trigger redirect or handle error
      return
    }
    const sessionData = JSON.parse(session)
    
    // 2. Fetch
    fetchData(sessionData.id)
  }, [])

  const fetchData = async (hospitalId) => {
    try {
      const response = await axios.get(`${API_URL}/api/analytics/daily`, {
        params: { hospital_id: hospitalId }
      })
      const rawData = response.data || []
      setData(rawData)
      
      // Calculate Stats
      if (rawData.length > 0) {
        const total = rawData.reduce((acc, curr) => acc + curr.total, 0)
        const avg = total / rawData.length
        const max = Math.max(...rawData.map(d => d.total))
        const min = Math.min(...rawData.map(d => d.total))
        const busiest = rawData.find(d => d.total === max)
        
        setStats({ max, min, avg: Math.round(avg), total, busiest })
      }
    } catch (error) {
      console.error('Failed to fetch volume data:', error)
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/10 p-4 rounded-xl shadow-xl">
          <p className="font-bold text-white mb-2">{label}</p>
          <div className="space-y-1 text-xs">
            <p className="text-primary-400">Total Patients: <span className="font-mono text-white text-sm">{payload[0].value}</span></p>
            <p className="text-red-400">Critical Cases: <span className="font-mono text-white text-sm">{payload[0].payload.critical}</span></p>
            <p className="text-orange-400">High Priority: <span className="font-mono text-white text-sm">{payload[0].payload.high}</span></p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-purple-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-40glass bg-slate-900/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-auto py-4 md:py-0 md:h-16 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0">
          <div className="flex items-center gap-4 w-full md:w-auto">
             <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-slate-400" />
             </Link>
             <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
               <TrendingUp className="text-purple-400" /> Volume Analytics
             </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        
        {loading ? (
           <div className="flex items-center justify-center h-64">
             <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
           </div>
        ) : data.length === 0 ? (
           <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-white/5 border-dashed">
             <Calendar size={48} className="mx-auto text-slate-600 mb-4" />
             <h3 className="text-lg font-bold text-slate-400">No Data Available</h3>
           </div>
        ) : (
           <div className="space-y-8">
             
             {/* Stats Grid */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-purple-500">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Patients</p>
                   <p className="text-3xl font-display font-bold text-white">{stats.total}</p>
                </div>
                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-primary-500">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Avg Daily Volume</p>
                   <p className="text-3xl font-display font-bold text-primary-400">{stats.avg}</p>
                </div>
                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-red-500">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Busiest Day</p>
                   {stats.busiest && (
                     <>
                        <p className="text-xl font-bold text-white mb-1">{stats.busiest.full_date.split(',')[0]}</p>
                        <p className="text-xs text-red-400 font-mono">{stats.busiest.total} PATIENTS</p>
                     </>
                   )}
                </div>
                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-emerald-500">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Current Trend</p>
                   <p className="text-lg text-slate-300">
                      {data[data.length-1].total > stats.avg ? 'High Volume' : 'Normal Volume'}
                   </p>
                </div>
             </div>

             {/* Chart Section */}
             <div className="glass-panel p-6 md:p-8 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                   <Activity size={20} className="text-purple-400" /> Daily Patient Volume
                </h3>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="full_date" 
                        stroke="#64748b" 
                        tick={{fill: '#64748b', fontSize: 10}} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        tick={{fill: '#64748b', fontSize: 10}} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                    
                      <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={50}>
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.total >= stats.avg * 1.2 ? '#ef4444' : entry.total <= stats.avg * 0.8 ? '#10b981' : '#8b5cf6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-6">
                   <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span> High Volume ({'>'}120% Avg)
                   </div>
                   <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-3 h-3 rounded-full bg-purple-500"></span> Normal Volume
                   </div>
                   <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Low Volume ({'<'}80% Avg)
                   </div>
                </div>
             </div>

             {/* Detailed List */}
             <div className="glass-panel p-0 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-white/5 text-xs uppercase text-slate-400 leading-normal">
                      <tr>
                         <th className="p-4 md:p-6 font-bold">Date</th>
                         <th className="p-4 md:p-6 font-bold text-center">Total Volume</th>
                         <th className="p-4 md:p-6 font-bold text-center hidden md:table-cell">Critical</th>
                         <th className="p-4 md:p-6 font-bold text-center hidden md:table-cell">High Acuity</th>
                         <th className="p-4 md:p-6 font-bold text-right">Status</th>
                      </tr>
                   </thead>
                   <tbody className="text-sm">
                      {data.map((day, i) => (
                         <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-4 md:p-6">
                               <div className="font-bold text-white">{day.full_date}</div>
                               <div className="text-xs text-slate-500">{day.weekday}</div>
                            </td>
                            <td className="p-4 md:p-6 text-center">
                               <span className="text-xl font-display font-bold text-white">{day.total}</span>
                            </td>
                            <td className="p-4 md:p-6 text-center text-red-400 font-mono hidden md:table-cell">{day.critical}</td>
                            <td className="p-4 md:p-6 text-center text-orange-400 font-mono hidden md:table-cell">{day.high}</td>
                            <td className="p-4 md:p-6 text-right">
                               <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${
                                  day.total >= stats.avg * 1.2 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                  day.total <= stats.avg * 0.8 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                               }`}>
                                  {day.total >= stats.avg * 1.2 ? 'High Load' : day.total <= stats.avg * 0.8 ? 'Quiet' : 'Normal'}
                               </span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>

           </div>
        )}
      </main>
    </div>
  )
}
