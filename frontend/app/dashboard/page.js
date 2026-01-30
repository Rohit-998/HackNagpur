'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { useRealtime } from '@/components/RealtimeProvider'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const [queue, setQueue] = useState([])
  const [stats, setStats] = useState({})
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const { socket, connected } = useRealtime()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  const fetchQueue = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/queue`)
      setQueue(response.data.patients || [])
      setStats(response.data.stats || {})
    } catch (error) {
      console.error('Failed to fetch queue:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  useEffect(() => {
    if (!socket) return

    socket.on('queue:update', () => {
      fetchQueue()
    })

    socket.on('alert:raised', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 10))
    })

    return () => {
      socket.off('queue:update')
      socket.off('alert:raised')
    }
  }, [socket])

  const handleStatusChange = async (patientId, newStatus) => {
    try {
      await axios.post(`${API_URL}/api/patient/${patientId}/status`, {
        status: newStatus
      })
      fetchQueue()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-critical'
    if (score >= 70) return 'text-high'
    if (score >= 50) return 'text-medium'
    return 'text-low'
  }

  const getWaitTime = (arrival) => {
    const now = new Date()
    const arrivalDate = new Date(arrival)
    const diffMs = now - arrivalDate
    const mins = Math.floor(diffMs / 60000)
    return mins
  }

  // Chart data - simple mock trend
  const chartData = [
    { time: '10m ago', wait: 12 },
    { time: '5m ago', wait: 15 },
    { time: 'Now', wait: stats.avg_wait_secs ? Math.round(stats.avg_wait_secs / 60) : 0 }
  ]

  return (
    <main className="min-h-screen py-8 px-4 md:px-8 relative overflow-hidden">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                {connected ? 'System Online' : 'Reconnect Required'}
              </div>
              <span className="text-slate-500 text-xs font-mono">WS_LATENCY: 12ms</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Command Center</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="px-4 py-2 glass-panel hover:bg-white/5 rounded-lg text-sm text-slate-300 transition-colors">
              Terminal
            </Link>
            <Link href="/checkin" className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
              <span className="text-lg">+</span> Intake
            </Link>
          </div>
        </div>

        {/* HUD Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel p-5 rounded-xl border-l-4 border-l-primary-500">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Queue Load</p>
            <p className="text-3xl font-display font-bold text-white">{stats.total_waiting || 0}</p>
          </div>
          <div className="glass-panel p-5 rounded-xl border-l-4 border-l-red-500">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Critical Tier</p>
            <p className="text-3xl font-display font-bold text-red-400 text-glow">{stats.critical_count || 0}</p>
          </div>
          <div className="glass-panel p-5 rounded-xl border-l-4 border-l-amber-500">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Avg Wait</p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-display font-bold text-amber-400">
                {stats.avg_wait_secs ? Math.round(stats.avg_wait_secs / 60) : 0}
              </p>
              <span className="text-sm text-slate-500 font-mono">MIN</span>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-xl border-l-4 border-l-purple-500">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Active Alerts</p>
            <p className="text-3xl font-display font-bold text-purple-400">{alerts.length}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Main Queue List */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-primary-400">❖</span> Active Triage Queue
              </h2>
              <span className="text-xs text-slate-500 font-mono">UPDATED: {new Date().toLocaleTimeString()}</span>
            </div>
            
            <div className="space-y-3">
              {loading ? (
                <div className="glass-panel rounded-xl p-12 text-center animate-pulse">
                  <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400 font-mono text-sm">SYNCHRONIZING DATALINK...</p>
                </div>
              ) : queue.length === 0 ? (
                <div className="glass-panel rounded-xl p-16 text-center border-dashed border-slate-800">
                  <div className="text-5xl mb-4 opacity-20">⚡</div>
                  <p className="text-slate-500 font-mono">NO ACTIVE PATIENTS IN QUEUE</p>
                </div>
              ) : (
                queue.map((patient, idx) => (
                  <div
                    key={patient.id}
                    className={`glass-card p-0 flex flex-col md:flex-row rounded-xl group ${
                      patient.triage_score >= 85 
                        ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]' 
                        : 'border-white/5'
                    }`}
                  >
                    {/* Score Strip */}
                    <div className={`p-4 md:w-24 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 ${
                      patient.triage_score >= 85 ? 'bg-red-500/10' : 'bg-slate-900/50'
                    }`}>
                      <span className={`text-3xl font-display font-bold ${getScoreColor(patient.triage_score)}`}>
                        {patient.triage_score}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase mt-1">Score</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono text-lg font-bold text-white tracking-wide">{patient.device_patient_id}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-bold uppercase">{patient.sex} · {patient.age}Y</span>
                            {patient.triage_score >= 85 && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-red-500 text-white font-bold uppercase animate-pulse">Critical</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            <span className="text-slate-600">ARRIVED:</span> {new Date(patient.arrival_ts).toLocaleTimeString()} · 
                            <span className="text-slate-600 ml-2">WAIT:</span> <span className="text-white">{getWaitTime(patient.arrival_ts)} min</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500 uppercase">Analysis Method</div>
                          <div className="font-mono text-xs text-primary-400">{patient.triage_method}</div>
                        </div>
                      </div>

                      {/* Symptoms Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {patient.symptoms?.map(s => (
                          <span key={s} className="px-2 py-1 bg-white/5 border border-white/5 rounded text-[10px] text-slate-300 uppercase tracking-wide">
                            {s.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {patient.custom_symptoms && (
                           <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-[10px] text-purple-300 uppercase tracking-wide flex items-center gap-1">
                             <span>🤖</span> AI Note
                           </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                         <button
                            onClick={() => handleStatusChange(patient.id, 'in_treatment')}
                            className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 text-xs font-bold uppercase tracking-wider rounded border border-primary-500/20 transition-all flex-1"
                         >
                           Initiate Care
                         </button>
                         <button
                            onClick={() => handleStatusChange(patient.id, 'completed')}
                            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded border border-emerald-500/20 transition-all flex-1"
                         >
                           Discharge
                         </button>
                         <Link href={`/audit/${patient.id}`} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors" title="Audit Log">
                           📋
                         </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Alerts Feed */}
            <div className="glass-panel rounded-xl p-0 overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-slate-900/50">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Live Alert Feed
                </h3>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-600 font-mono text-center py-4">NO ACTIVE ALERTS</p>
                ) : (
                  alerts.map((alert, idx) => (
                    <div key={idx} className="bg-red-500/5 border-l-2 border-red-500 p-3 rounded-r-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-red-400 text-xs font-bold uppercase">
                          {alert.alert_type === 'critical_patient' ? 'Critical Triage' : 'SLA Breach'}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Patient #{alert.patient_id} <span className="text-slate-500">·</span> Score {alert.triage_score}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Wait Trend */}
            <div className="glass-panel rounded-xl p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Wait Time Velocity</h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorWait" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="wait"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      fill="url(#colorWait)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/checkin" className="glass-panel p-4 rounded-xl hover:bg-white/5 transition-all text-center group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📝</div>
                <div className="text-xs font-bold text-slate-300">New Intake</div>
              </Link>
              <Link href="/admin" className="glass-panel p-4 rounded-xl hover:bg-white/5 transition-all text-center group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚙️</div>
                <div className="text-xs font-bold text-slate-300">Config</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
