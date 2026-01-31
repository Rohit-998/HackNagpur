import { useState, useEffect } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import DownloadReportButton from './DownloadReportButton'

export default function VitalsRecheckModal({ patient, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    hr: '',
    sbp: '',
    spo2: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Initialize with current vitals
  useEffect(() => {
    if (patient) {
      setFormData({
        hr: patient.vitals?.hr || '',
        sbp: patient.vitals?.sbp || '',
        spo2: patient.vitals?.spo2 || '',
        notes: ''
      })
    }
  }, [patient])

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        vitals: {
          hr: parseInt(formData.hr),
          sbp: parseInt(formData.sbp),
          spo2: parseInt(formData.spo2)
        },
        notes: formData.notes
      }

      await axios.post(`${API_URL}/api/patients/${patient.id}/vitals`, payload)
      onUpdate() // Callback to refresh queue
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  // Parse history for chart
  const historyData = patient?.meta?.vitals_history?.map(entry => ({
    time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    hr: entry.vitals.hr,
    sbp: entry.vitals.sbp,
    spo2: entry.vitals.spo2
  })) || []

  // Add current if existing history
  if (historyData.length === 0 && patient?.vitals) {
    historyData.push({
      time: 'Check-in',
      hr: patient.vitals.hr,
      sbp: patient.vitals.sbp,
      spo2: patient.vitals.spo2
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <div>
            <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Vital Signs Monitor
            </h3>
            <p className="text-xs font-mono text-slate-400 mt-1">
              PATIENT: <span className="text-white font-bold">{patient?.full_name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DownloadReportButton 
              patient={patient} 
              history={patient?.meta?.vitals_history || []} 
              alerts={patient?.meta?.latest_alerts || []} 
            />
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-8">
          
          {/* Left: Input Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Heart Rate */}
                <div className="group">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 group-focus-within:text-emerald-400 transition-colors">Heart Rate</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={formData.hr}
                      onChange={e => setFormData({...formData, hr: e.target.value})}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-2xl font-mono font-bold text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                      placeholder="--"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">BPM</span>
                  </div>
                </div>

                {/* SpO2 */}
                <div className="group">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 group-focus-within:text-cyan-400 transition-colors">SpO2</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      max="100"
                      value={formData.spo2}
                      onChange={e => setFormData({...formData, spo2: e.target.value})}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-2xl font-mono font-bold text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
                      placeholder="--"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">%</span>
                  </div>
                </div>
              </div>

              {/* BP */}
              <div className="group">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 group-focus-within:text-pink-400 transition-colors">Systolic BP</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={formData.sbp}
                    onChange={e => setFormData({...formData, sbp: e.target.value})}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-2xl font-mono font-bold text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 outline-none transition-all"
                    placeholder="--"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">mmHg</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Clinical Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  rows={2}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all resize-none"
                  placeholder="Optional observations..."
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 text-base font-bold tracking-wide uppercase shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-all"
            >
              {loading ? 'Updating & Analyzing...' : 'Update Vitals & Re-Analyze'}
            </button>
          </form>

          {/* Right: Trends */}
          <div className="flex flex-col h-full min-h-[300px]">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Live Deterioration Tracking
            </h4>
            
            <div className="flex-1 bg-slate-950/30 rounded-xl border border-white/5 p-4 relative overflow-hidden">
              {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <defs>
                      <linearGradient id="chartBg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} dy={10} />
                    <YAxis domain={['auto', 'auto']} tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px'}}
                      itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                    />
                    <Line type="monotone" dataKey="hr" stroke="#10b981" strokeWidth={2} dot={{fill: '#10b981', r: 3}} name="HR" />
                    <Line type="monotone" dataKey="sbp" stroke="#ec4899" strokeWidth={2} dot={{fill: '#ec4899', r: 3}} name="BP" />
                    <Line type="monotone" dataKey="spo2" stroke="#06b6d4" strokeWidth={2} dot={{fill: '#06b6d4', r: 3}} name="SpO2" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-mono text-xs">
                  NO TREND DATA YET
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <div className="text-[10px] text-slate-500 uppercase font-bold">HR Trend</div>
                <div className="text-emerald-400 font-mono text-xs">Stable</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-pink-500/5 border border-pink-500/10">
                <div className="text-[10px] text-slate-500 uppercase font-bold">BP Trend</div>
                <div className="text-pink-400 font-mono text-xs">Varied</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                <div className="text-[10px] text-slate-500 uppercase font-bold">SpO2</div>
                <div className="text-cyan-400 font-mono text-xs">Normal</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
