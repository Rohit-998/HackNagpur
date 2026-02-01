'use client'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { useRealtime } from '@/components/RealtimeProvider'
import { Activity, ArrowLeft, Thermometer, UserCheck, Clock, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import VitalsRecheckModal from '@/components/VitalsRecheckModal'
import DownloadReportButton from '@/components/DownloadReportButton'

export default function TreatmentPage() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 })
  const pageRef = useRef(1)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [hospital, setHospital] = useState(null) // NEW: State for hospital
  
  const { socket } = useRealtime()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  const fetchPatients = async (hospitalId = hospital?.id) => {
    if (!hospitalId) return; // Don't fetch if no ID
    
    try {
      const response = await axios.get(`${API_URL}/api/queue`, {
        params: { 
           status: 'in_treatment', 
           page: pageRef.current,
           hospital_id: hospitalId // FILTER APPLIED
        }
      })
      setPatients(response.data.patients || [])
      setPagination(prev => ({ ...prev, ...response.data.pagination }))
    } catch (error) {
      console.error('Failed to fetch treatment queue:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 1. Check Session
    const session = localStorage.getItem('hospital_session')
    if (!session) {
       // Optional: Redirect to login or just show nothing
       return
    }
    const sessionData = JSON.parse(session)
    setHospital(sessionData)
    
    // 2. Fetch with initial ID
    fetchPatients(sessionData.id)
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('queue:update', () => fetchPatients(hospital?.id))
    return () => socket.off('queue:update')
  }, [socket, hospital])

  const handleDischarge = async (id) => {
    if (!confirm('Are you sure you want to discharge this patient? This will move them to records.')) return
    
    try {
      await axios.post(`${API_URL}/api/patient/${id}/status`, { status: 'completed' })
      // Socket will trigger refresh
    } catch (error) {
      alert('Failed to discharge')
    }
  }

  const changePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.total_pages) return
    pageRef.current = newPage
    setPagination(prev => ({ ...prev, page: newPage }))
    setLoading(true)
    fetchPatients(hospital?.id)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-40glass bg-slate-900/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-auto py-4 md:py-0 md:h-16 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0">
          <div className="flex items-center gap-4 w-full md:w-auto">
             <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-slate-400" />
             </Link>
             <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
               <Activity className="text-emerald-400" /> Active Care Unit
             </h1>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
             <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-400 flex items-center gap-2">
                <UserCheck size={14} /> {pagination.total || 0} Patients Active
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {loading ? (
           <div className="flex items-center justify-center h-64">
             <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
           </div>
        ) : patients.length === 0 ? (
           <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-white/5 border-dashed">
             <UserCheck size={48} className="mx-auto text-slate-600 mb-4" />
             <h3 className="text-lg font-bold text-slate-400">No Active Patients</h3>
             <p className="text-slate-500 mb-6">Queue is empty. Check Dashboard for new triages.</p>
             <Link href="/dashboard" className="btn-primary">Go to Dashboard</Link>
           </div>
        ) : (
           <div className="grid gap-6">
             {patients.map(patient => (
               <div key={patient.id} className="glass-panel p-6 rounded-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                 <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                 
                 <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                   
                   {/* Patient Info */}
                   <div>
                     <div className="flex items-center gap-3 mb-2">
                       <h2 className="text-2xl font-bold text-white tracking-tight">{patient.full_name}</h2>
                       <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-400 border border-white/5">
                         {patient.age}yo {patient.sex}
                       </span>
                     </div>
                     <div className="flex items-center gap-6 text-sm text-slate-400">
                       <span className="flex items-center gap-2">
                         <Clock size={16} className="text-slate-600" /> 
                         Admitted: {new Date(patient.arrival_ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </span>
                       {patient.meta?.comorbid && (
                          <span className="text-yellow-500/80 flex items-center gap-1">
                             <AlertCircle size={14} /> Comorbidities
                          </span>
                       )}
                     </div>
                   </div>

                   {/* Vitals Summary */}
                   <div className="grid grid-cols-3 gap-4 bg-black/20 p-3 rounded-lg border border-white/5">
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">HR</div>
                        <div className={`font-mono font-bold ${patient.vitals?.hr > 100 ? 'text-orange-400' : 'text-emerald-400'}`}>
                           {patient.vitals?.hr || '--'}
                        </div>
                      </div>
                      <div className="text-center px-4 border-x border-white/5">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">BP</div>
                        <div className="font-mono font-bold text-white">
                           {patient.vitals?.sbp || '--'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">SpO2</div>
                        <div className={`font-mono font-bold ${patient.vitals?.spo2 < 95 ? 'text-red-400' : 'text-cyan-400'}`}>
                           {patient.vitals?.spo2 || '--'}%
                        </div>
                      </div>
                   </div>

                   {/* Actions */}
                   <div className="flex flex-col md:flex-row gap-2 md:gap-3 mt-4 md:mt-0">
                      <button 
                         onClick={() => setSelectedPatient(patient)}
                         className="px-4 py-3 md:py-2 glass hover:bg-emerald-500/10 hover:border-emerald-500/30 rounded-lg text-sm text-slate-300 hover:text-emerald-400 transition-all flex items-center justify-center gap-2 w-full md:w-auto"
                      >
                         <Thermometer size={16} /> Vitals Check
                      </button>
                      
                      <DownloadReportButton patient={patient} className="py-3 md:py-2 w-full md:w-auto" />
                      
                      <button 
                         onClick={() => handleDischarge(patient.id)}
                         className="px-4 py-3 md:py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 text-sm flex items-center justify-center gap-2 transition-all w-full md:w-auto"
                      >
                         <CheckCircle size={16} /> Discharge
                      </button>
                   </div>
                 </div>
                 
                 {/* Notes / Symptoms */}
                 <div className="mt-4 pt-4 border-t border-white/5 flex gap-4 text-sm">
                    <div className="text-slate-500 font-bold">Presenting Control:</div>
                    <div className="text-slate-300">
                       {patient.symptoms?.map(s => s.replace(/_/g, ' ')).join(', ')}
                       {patient.custom_symptoms && <span className="text-slate-500 italic ml-2">- "{patient.custom_symptoms}"</span>}
                    </div>
                 </div>

               </div>
             ))}
           </div>
        )}

        {/* Pagination Controls */}
        {pagination.total_pages > 1 && (
           <div className="flex justify-center gap-4 mt-8">
              <button onClick={() => changePage(pagination.page - 1)} disabled={pagination.page<=1} className="px-4 py-2 glass rounded disabled:opacity-50">Prev</button>
              <span className="text-slate-400 self-center">Page {pagination.page} of {pagination.total_pages}</span>
              <button onClick={() => changePage(pagination.page + 1)} disabled={pagination.page>=pagination.total} className="px-4 py-2 glass rounded disabled:opacity-50">Next</button>
           </div>
        )}

      </main>

      {/* Vitals Modal */}
      {selectedPatient && (
        <VitalsRecheckModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onUpdate={fetchPatients}
        />
      )}
    </div>
  )
}
