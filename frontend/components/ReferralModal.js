'use client'

import { useState } from 'react'
import axios from 'axios'
import { X, Check, ArrowRight, Ambulance } from 'lucide-react'

export default function ReferralModal({ patient, currentHospital, network, onClose, onSuccess }) {
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [priority, setPriority] = useState('normal')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleTransfer = async () => {
    if (!selectedHospital) return
    setLoading(true)

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/referrals`, {
        patient_id: patient.id,
        from_hospital_id: currentHospital.id,
        to_hospital_id: selectedHospital.id,
        notes: notes || 'Capacity load balancing',
        priority
      })
      onSuccess()
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  // Filter out current hospital from network list
  const availableHospitals = Array.isArray(network) ? network.filter(h => h.id !== currentHospital?.id) : []

  // AI LOGIC: Find best hospital
  // Score = Wait Time + (Distance * 2). Lower is better.
  const recommendedHospital = availableHospitals.length > 0 ? [...availableHospitals].sort((a, b) => {
      const scoreA = (a.wait_time_min || 0) + ((a.distance_km || 0) * 2)
      const scoreB = (b.wait_time_min || 0) + ((b.distance_km || 0) * 2)
      return scoreA - scoreB
  })[0] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900/90">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Ambulance className="text-blue-400" size={20} />
            Smart City Transfer
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Patient Summary */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex justify-between items-center">
             <div>
               <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Patient</p>
               <p className="text-lg font-bold text-white">{patient?.full_name}</p>
             </div>
             <div className="text-right">
               <div className={`text-2xl font-bold font-mono ${patient?.triage_score >= 85 ? 'text-red-400' : 'text-blue-400'}`}>
                 {patient?.triage_score}
               </div>
               <p className="text-[10px] text-slate-500">Triage Score</p>
             </div>
          </div>

          {/* Destination Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">AI Recommendation Engine</label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
              {availableHospitals.length === 0 ? (
                 <p className="text-sm text-slate-500 italic text-center py-4">No other hospitals in network</p>
              ) : (
                availableHospitals.map(hosp => {
                  const isRecommended = recommendedHospital?.id === hosp.id
                  return (
                  <button
                    key={hosp.id}
                    onClick={() => setSelectedHospital(hosp)}
                    className={`relative w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                      selectedHospital?.id === hosp.id 
                        ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10' 
                        : isRecommended 
                           ? 'bg-emerald-500/10 border-emerald-500/50 hover:bg-emerald-500/20' 
                           : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    {isRecommended && (
                        <div className="absolute -top-2.5 right-4 bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                            🤖 AI OPTIMAL CHOICE
                        </div>
                    )}

                    <div className="text-left">
                      <p className={`text-sm font-bold ${
                          selectedHospital?.id === hosp.id ? 'text-blue-400' : 
                          isRecommended ? 'text-emerald-400' : 'text-slate-200'
                      }`}>{hosp.name}</p>
                      
                      <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                              📍 {hosp.distance_km}km
                          </span>
                          <span className={`text-xs flex items-center gap-1 font-mono ${isRecommended ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                              🕒 {hosp.wait_time_min}m Wait
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                              🛏️ {hosp.capacity}% Cap
                          </span>
                      </div>
                    </div>
                    
                    {selectedHospital?.id === hosp.id ? (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check size={14} className="text-white" />
                        </div>
                    ) : (
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isRecommended ? 'border-emerald-500/30' : 'border-slate-700'}`}>
                        </div>
                    )}
                  </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Reason / Notes */}
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Clinical Reason</label>
             <textarea 
               value={notes} 
               onChange={(e) => setNotes(e.target.value)}
               placeholder="Why is this patient being transferred? (e.g. ICU Full, Specialist Required)"
               className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 h-24 resize-none"
             ></textarea>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleTransfer}
            disabled={!selectedHospital || loading}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            {loading ? 'Routing...' : 'Confirm Transfer'}
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  )
}
