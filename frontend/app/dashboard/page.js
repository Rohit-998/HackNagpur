'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { useRealtime } from '@/components/RealtimeProvider'
import { Activity, FolderOpen, Bot, AlertCircle, FileText, Bell, Siren, Monitor, LogOut, ArrowRight, ArrowLeft, TrendingUp } from 'lucide-react'
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import VitalsRecheckModal from '@/components/VitalsRecheckModal'

import { useRouter } from 'next/navigation'
import ReferralModal from '@/components/ReferralModal'
import CCTVModal from '@/components/CCTVModal'

export default function DashboardPage() {
  const router = useRouter()
  const [hospital, setHospital] = useState(null)
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [showCCTVModal, setShowCCTVModal] = useState(false)
  const [incomingReferral, setIncomingReferral] = useState(null)
  const [queue, setQueue] = useState([])
  const [stats, setStats] = useState({})
  const [analytics, setAnalytics] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [network, setNetwork] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 })
  const pageRef = useRef(1)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const { socket, connected } = useRealtime()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  const fetchQueue = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/queue`, {
         params: { 
           page: pageRef.current,
           hospital_id: hospital?.id 
         }
      })
      setQueue(response.data.patients || [])
      setStats(response.data.stats || {})
      setPagination(prev => ({ ...prev, ...response.data.pagination }))
    } catch (error) {
      console.error('Failed to fetch queue:', error)
    } finally {
      setLoading(false)
    }
  }

  const changePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.total_pages) return
    pageRef.current = newPage
    setPagination(prev => ({ ...prev, page: newPage }))
    setLoading(true)
    fetchQueue()
  }

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/alerts/active`, {
        params: { hospital_id: hospital?.id }
      })
      setAlerts(response.data || [])
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/analytics`, {
         params: { hospital_id: hospital?.id }
      })
      setAnalytics(data)
    } catch (e) {
      console.error('Analytics fetch error', e)
    }
  }

  const fetchNetwork = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/network`)
      setNetwork(data)
    } catch (e) {
      console.error('Network fetch error', e)
    }
  }

  const triggerDistressSignal = async () => {
    try {
      await axios.post(`${API_URL}/api/distress`, {
        zone: 'Waiting Room A',
        signal_type: 'collapse',
        confidence: 0.95,
        hospital_id: hospital?.id || 1
      })
      // Alert will come via socket
    } catch (e) {
      console.error('Distress trigger error', e)
    }
  }

  useEffect(() => {
    // Check Session
    const session = localStorage.getItem('hospital_session')
    if (!session) {
      router.push('/login')
      return
    }
    const sessionData = JSON.parse(session)
    setHospital(sessionData)

    // Initial Fetch (will depend on hospital state in next render, but we can rely on effect dependency)
  }, [])

  useEffect(() => {
    if (hospital) {
      fetchQueue()
      fetchAlerts()
      fetchAnalytics()
      fetchNetwork()
    }
  }, [hospital])

  useEffect(() => {
    if (!socket) return

    socket.on('queue:update', () => {
      fetchQueue()
      fetchAlerts()
    })

    socket.on('alert:raised', (alert) => {
      // Filter alerts: If alert has hospital_id, it MUST match mine. 
      // If it has no ID (legacy), we show it (fall back).
      if (alert.hospital_id && hospital && alert.hospital_id !== hospital.id) return;
      
      // const audio = new Audio('/alert.mp3') // Placeholder sound
      // audio.play().catch(e => console.log('Audio blocked'))

      setAlerts(prev => [alert, ...prev].slice(0, 10))
    })

    socket.on('referral:incoming', (data) => {
      // Only show if it's for ME
      if (hospital && data.to_hospital_id === hospital.id) {
        setIncomingReferral(data.referral)
        // Play sound
        // const audio = new Audio('/alert_classic.mp3') // Placeholder
        // audio.play().catch(e => console.log('Audio blocked'))
      }
    })

    socket.on('queue:update', (data) => {
       if (data.hospital_id && hospital && data.hospital_id !== hospital.id) return // Ignore updates for other hospitals
       fetchQueue()
       fetchAlerts()
    })

    socket.on('alert:created', (data) => {
       if (data.hospital_id && hospital && data.hospital_id !== hospital.id) return
       fetchAlerts()
    })

    return () => {
      socket.off('queue:update')
      socket.off('alert:raised')
      socket.off('referral:incoming')
      socket.off('alert:created')
    }
  }, [socket, hospital])

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

  const getPriorityBadge = (score) => {
    if (score >= 85) return { text: 'CRITICAL', color: 'bg-red-500', emoji: '🔴', border: 'border-red-500/50', bg_soft: 'bg-red-500/10' }
    if (score >= 50) return { text: 'HIGH', color: 'bg-orange-500', emoji: '🟠', border: 'border-orange-500/50', bg_soft: 'bg-orange-500/10' }
    if (score >= 25) return { text: 'MEDIUM', color: 'bg-yellow-500', emoji: '🟡', border: 'border-yellow-500/50', bg_soft: 'bg-yellow-500/10' }
    return { text: 'LOW', color: 'bg-emerald-500', emoji: '🟢', border: 'border-emerald-500/50', bg_soft: 'bg-emerald-500/10' }
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
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-end justify-between border-b border-white/5 pb-6 gap-4 md:gap-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                {connected ? 'System Online' : 'Reconnect Required'}
              </div>
              <span className="text-slate-500 text-xs font-mono">ID: {hospital?.id} · {hospital?.role}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
              {hospital ? hospital.name : 'Command Center'}
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <Link href="/" className="px-3 md:px-4 py-2 glass-panel hover:bg-white/5 rounded-lg text-sm text-slate-300 transition-colors whitespace-nowrap">
              Terminal
            </Link>
            <Link href="/treatment" className="px-3 md:px-4 py-2 glass-panel hover:bg-emerald-500/10 hover:border-emerald-500/20 rounded-lg text-sm text-emerald-400 font-bold transition-all flex items-center gap-2 whitespace-nowrap">
              <Activity size={16} /> <span className="hidden sm:inline">Active Care</span>
            </Link>
            <Link href="/volume" className="px-3 md:px-4 py-2 glass-panel hover:bg-purple-500/10 hover:border-purple-500/20 rounded-lg text-sm text-purple-400 font-bold transition-all flex items-center gap-2 whitespace-nowrap">
              <TrendingUp size={16} /> <span className="hidden sm:inline">Volume</span>
            </Link>
            <Link href="/patients" className="px-3 md:px-4 py-2 glass-panel hover:bg-white/5 rounded-lg text-sm text-slate-300 transition-colors flex items-center gap-2 whitespace-nowrap">
              <FolderOpen size={16} /> <span className="hidden sm:inline">Records</span>
            </Link>
            <Link href="/checkin" className="btn-primary flex items-center gap-2 px-3 md:px-4 py-2 text-sm whitespace-nowrap">
              <span className="text-lg">+</span> <span className="hidden sm:inline">Intake</span>
            </Link>
            <button 
               onClick={() => {
                 if (confirm('Disconnect secure session?')) {
                   localStorage.removeItem('hospital_session')
                   router.push('/login')
                 }
               }}
               className="p-2 glass-panel hover:bg-red-500/10 hover:border-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-all"
               title="Secure Logout"
            >
              <LogOut size={18} />
            </button>
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

        {/* Analytics Row */}
        {analytics && (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="glass-panel p-5 rounded-xl">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Acuity Distribution (24h)</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Critical', value: analytics.acuity.critical, color: '#ef4444' },
                        { name: 'High', value: analytics.acuity.high, color: '#f97316' },
                        { name: 'Medium', value: analytics.acuity.medium, color: '#eab308' },
                        { name: 'Low', value: analytics.acuity.low, color: '#22c55e' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[
                        { name: 'Critical', value: analytics.acuity.critical, color: '#ef4444' },
                        { name: 'High', value: analytics.acuity.high, color: '#f97316' },
                        { name: 'Medium', value: analytics.acuity.medium, color: '#eab308' },
                        { name: 'Low', value: analytics.acuity.low, color: '#22c55e' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155'}} itemStyle={{color: '#fff'}} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '10px'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="glass-panel p-5 rounded-xl">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Top Presenting Symptoms</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.top_symptoms} layout="vertical" margin={{left: 10, right: 10}}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10, fill: '#94a3b8'}} interval={0} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155'}} itemStyle={{color: '#fff'}} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16}>
                       {analytics.top_symptoms.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${210 + index * 10}, 80%, 60%)`} />
                       ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Main Queue List */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity size={20} className="text-primary-400" /> Active Triage Queue
              </h2>
              <span suppressHydrationWarning className="text-xs text-slate-500 font-mono">UPDATED: {new Date().toLocaleTimeString()}</span>
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
                queue.map((patient, idx) => {
                  const badge = getPriorityBadge(patient.triage_score)
                  return (
                    <div
                      key={patient.id}
                      className={`glass-card p-0 flex flex-col md:flex-row rounded-xl group border transition-all hover:scale-[1.01] duration-300 ${
                        badge.border
                      } ${patient.triage_score >= 85 ? 'shadow-[0_0_20px_rgba(239,68,68,0.15)]' : ''}`}
                    >
                      {/* Redirection Suggestion (Smart City Feature) */}
                      {getWaitTime(patient.arrival_ts) > 45 && network.some(h => h.status === 'optimal' && h.wait_time_min < 30) && (
                        <div className="absolute -top-3 right-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1 animate-bounce cursor-help" title="City-wide load balancing recommended">
                          <ArrowRight size={10} /> REDIRECT SUGGESTED
                        </div>
                      )}
                      {/* Score Strip */}
                      <div className={`p-4 md:w-24 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 ${badge.bg_soft}`}>
                        <span className={`text-3xl font-display font-bold ${getScoreColor(patient.triage_score)}`}>
                          {patient.triage_score}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase mt-1">Score</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-5">
                        <div className="flex flex-col md:flex-row items-start md:justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-mono text-lg font-bold text-white tracking-wide">{patient.full_name}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-bold uppercase">{patient.sex} · {patient.age}Y</span>
                              
                              {/* Dynamic Priority Badge */}
                              <span className={`px-2 py-0.5 rounded text-[10px] ${badge.color} text-white font-bold uppercase flex items-center gap-1.5 ${patient.triage_score >= 85 ? 'animate-pulse' : ''}`}>
                                <span>{badge.emoji}</span>
                                {badge.text}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              <span className="text-slate-600">ARRIVED:</span> <span suppressHydrationWarning>{new Date(patient.arrival_ts).toLocaleTimeString()}</span> · 
                              <span className="text-slate-600 ml-2">WAIT:</span> <span suppressHydrationWarning className="text-white">{getWaitTime(patient.arrival_ts)} min</span>
                            </div>
                          </div>
                          <div className="text-left md:text-right mt-2 md:mt-0">
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
                             <Bot size={12} /> AI Note
                           </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col md:flex-row gap-2 md:gap-3 opacity-100 md:opacity-60 group-hover:opacity-100 transition-opacity mt-4 md:mt-0">
                         <button
                            onClick={() => setSelectedPatient(patient)}
                            className="px-4 py-3 md:py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider rounded border border-blue-500/20 transition-all w-full md:w-auto md:flex-[0.5] flex items-center justify-center gap-2"
                         >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                           </svg>
                           Monitor
                         </button>
                         <button
                            onClick={() => { setSelectedPatient(patient); setShowReferralModal(true); }}
                            className="px-4 py-3 md:py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider rounded border border-purple-500/20 transition-all w-full md:w-auto md:flex-[0.5] flex items-center justify-center gap-2"
                            title="City-wide Transfer"
                         >
                           <ArrowRight size={16} />
                           Refer
                         </button>
                         <button
                            onClick={() => handleStatusChange(patient.id, 'in_treatment')}
                            className="px-4 py-3 md:py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 text-xs font-bold uppercase tracking-wider rounded border border-primary-500/20 transition-all w-full md:w-auto md:flex-1"
                         >
                           Initiate Care
                         </button>
                         <button
                            onClick={() => handleStatusChange(patient.id, 'completed')}
                            className="px-4 py-3 md:py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded border border-emerald-500/20 transition-all w-full md:w-auto md:flex-1"
                         >
                           Discharge
                         </button>
                         <Link href={`/audit/${patient.id}`} className="px-3 py-3 md:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors flex items-center justify-center w-full md:w-auto" title="Audit Log">
                           <FileText size={16} />
                         </Link>
                      </div>
                    </div>
                  </div>
                  )
                })
              )}
            </div>
            {/* Pagination Controls */}
            {pagination.total_pages > 1 && (
              <div className="flex justify-center items-center gap-4 py-4 glass-panel rounded-lg mt-4">
                <button
                  onClick={() => changePage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 glass rounded-lg text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-slate-400 font-mono text-sm">
                  Page <span className="text-white font-bold">{pagination.page}</span> of {pagination.total_pages}
                </span>
                <button
                  onClick={() => changePage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                  className="px-4 py-2 glass rounded-lg text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
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
                    <div key={idx} className={`border-l-2 p-3 rounded-r-lg ${
                      alert.alert_type === 'distress_signal' ? 'bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]' :
                      alert.alert_type === 'deteriorating' ? 'bg-orange-500/5 border-orange-500' :
                      alert.alert_type === 'critical_vitals' ? 'bg-red-500/5 border-red-500' :
                      'bg-red-500/5 border-red-500'
                    }`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-bold uppercase flex items-center gap-2 ${
                          alert.alert_type === 'distress_signal' ? 'text-purple-400' :
                          alert.alert_type === 'deteriorating' ? 'text-orange-400' : 'text-red-400'
                        }`}>
                          {alert.alert_type === 'distress_signal' && <Siren size={12} className="animate-pulse" />}
                          {alert.alert_type === 'critical_patient' ? 'Critical Triage' :
                           alert.alert_type === 'critical_vitals' ? 'Critical Vitals' :
                           alert.alert_type === 'deteriorating' ? 'Deteriorating' :
                           alert.alert_type === 'distress_signal' ? 'CCTV DISTRESS' :
                           'Alert'}
                        </span>
                        <span suppressHydrationWarning className="text-[10px] text-slate-600 font-mono">{new Date(alert.timestamp || alert.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-xs text-slate-300">
                        {alert.alert_type === 'distress_signal' ? (
                           <div className="flex flex-col gap-0.5">
                             <div className="flex items-center gap-2 text-white font-bold text-[10px] tracking-wider">
                               <span>📍 {alert.zone || alert.payload?.zone || 'Waiting Room A'}</span>
                               <span className="text-slate-600">|</span>
                               <span>UNK. PERSON</span>
                             </div>
                             <span className="text-purple-300 font-mono text-[10px]">{alert.message || alert.payload?.message}</span>
                           </div>
                        ) : (
                           <>
                           Patient <span className="font-mono font-bold text-white">
                             {alert.full_name || alert.payload?.full_name || '#' + alert.patient_id}
                           </span> <span className="text-slate-500">·</span> Score {alert.triage_score || alert.new_score || alert.payload?.triage_score || alert.payload?.new_score || 'N/A'}
                           </>
                        )}
                      </div>
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
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Link href="/checkin" className="glass-panel p-4 rounded-xl hover:bg-white/5 transition-all text-center group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📝</div>
                <div className="text-xs font-bold text-slate-300">New Intake</div>
              </Link>
              <Link href="/admin" className="glass-panel p-4 rounded-xl hover:bg-white/5 transition-all text-center group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚙️</div>
                <div className="text-xs font-bold text-slate-300">Config</div>
              </Link>
            </div>

            {/* City Network Status (New City-Scale Feature) */}
            <div className="glass-panel rounded-xl p-0 overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                  <Monitor size={16} className="text-blue-400" />
                  City Network
                </h3>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 animate-pulse">LIVE</span>
              </div>
              <div className="p-4 space-y-3">
                {network.length === 0 ? (
                  <p className="text-xs text-slate-600 font-mono text-center">OFFLINE</p>
                ) : (
                  network.map((hosp, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          hosp.status === 'optimal' ? 'bg-emerald-500' :
                          hosp.status === 'busy' ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}></div>
                        <span className="text-slate-300">{hosp.name}</span>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-bold ${
                           hosp.status === 'optimal' ? 'text-emerald-400' :
                           hosp.status === 'busy' ? 'text-amber-400' :
                           'text-red-400'
                        }`}>{hosp.load_percentage}%</div>
                        <div className="text-[10px] text-slate-500">{hosp.wait_time_min}m wait</div>
                      </div>
                    </div>
                  ))
                )}
                <div className="pt-3 border-t border-white/5 mt-2">
                   <button 
                     onClick={() => setShowCCTVModal(true)}
                     className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                   >
                     <Siren size={12} /> Simulate CCTV Distress
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedPatient && (
        <VitalsRecheckModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onUpdate={fetchQueue}
        />
      )}
      {/* Referral Modal (Sender) */}
      {showReferralModal && selectedPatient && (
        <ReferralModal
           patient={selectedPatient}
           currentHospital={hospital}
           network={network}
           onClose={() => { setShowReferralModal(false); setSelectedPatient(null); }}
           onSuccess={() => { fetchQueue(); setShowReferralModal(false); setSelectedPatient(null); }}
        />
      )}

      {/* CCTV Modal */}
      {showCCTVModal && (
        <CCTVModal 
           onClose={() => setShowCCTVModal(false)}
           hospitalId={hospital?.id}
        />
      )}

      {/* Incoming Referral Alert (Receiver) */}
      {incomingReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="glass-panel p-6 max-w-lg w-full rounded-2xl border-l-4 border-l-blue-500 shadow-[0_0_50px_rgba(37,99,235,0.2)] animate-in zoom-in-95 duration-200">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                 <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                    <ArrowRight className="text-white" size={18} />
                 </div>
                 Incoming Transfer Request
              </h2>
              
              <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/5">
                 <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Patient</p>
                 <p className="text-lg font-bold text-white">{incomingReferral.patient.full_name}</p>
                 <p className="text-sm text-slate-300 mt-1">
                   {incomingReferral.patient.sex} · {incomingReferral.patient.age}Y · Score {incomingReferral.patient.triage_score}
                 </p>
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5">
                 <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Reason</p>
                 <p className="text-sm text-slate-200 italic">"{incomingReferral.notes || 'No notes provided'}"</p>
              </div>

              <div className="flex gap-3">
                 <button 
                   onClick={() => setIncomingReferral(null)}
                   className="flex-1 py-3 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 font-bold"
                 >
                   Defer
                 </button>
                 <button 
                   onClick={async () => {
                      try {
                        await axios.post(`${API_URL}/api/referrals/${incomingReferral.id}/accept`)
                        setIncomingReferral(null)
                        fetchQueue()
                      } catch(e) { console.error(e) }
                   }}
                   className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/25"
                 >
                   Accept Transfer
                 </button>
              </div>
           </div>
        </div>
      )}
    </main>
  )
}
