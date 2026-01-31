'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Link from 'next/link'
import DownloadReportButton from '../../components/DownloadReportButton'

export default function PatientsDirectory() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1
  })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [error, setError] = useState(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPagination(prev => ({ ...prev, page: 1 }))
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch Patients
  useEffect(() => {
    fetchPatients()
  }, [debouncedSearch, pagination.page])

  const fetchPatients = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.get(`${API_URL}/api/patients`, {
        params: {
          search: debouncedSearch,
          page: pagination.page,
          limit: pagination.limit
        }
      })
      setPatients(data.patients || [])
      setPagination(data.pagination)
    } catch (err) {
      console.error('Failed to fetch patients:', err)
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (score) => {
    if (score >= 85) return 'text-red-500 bg-red-500/10 border-red-500/20'
    if (score >= 50) return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
    if (score >= 25) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
    return 'text-green-500 bg-green-500/10 border-green-500/20'
  }

  return (
    <main className="min-h-screen p-4 md:p-8 relative">
       {/* Background Ambience similar to Check-in */}
       <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 rounded-full blur-[100px] pointer-events-none"></div>
       <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
             <h1 className="text-3xl font-display font-bold text-white tracking-tight">Patient Records</h1>
             <p className="text-slate-400 mt-1">Search, view history, and download reports</p>
          </div>
          <div className="flex items-center gap-3">
             <Link href="/dashboard" className="px-4 py-2 glass rounded-lg hover:shadow-glow transition-all text-sm font-bold text-slate-300 hover:text-white border border-white/5">
                ← Live Dashboard
             </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 font-mono text-sm">
            ⚠ Error loading records: {error}
          </div>
        )}

        {/* Controls */}
        <div className="glass-panel p-4 rounded-xl mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Patient Name..."
              className="w-full bg-slate-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-primary-500 outline-none transition-all"
            />
            <svg className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="text-xs text-slate-500 font-mono">
            Showing {patients.length} of {pagination.total} Records
          </div>
        </div>

        {/* Table */}
        <div className="glass-panel rounded-xl overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-xs uppercase tracking-wider text-slate-400 font-bold border-b border-white/5">
                  <th className="p-4">Patient</th>
                  <th className="p-4">Age/Sex</th>
                  <th className="p-4">Arrival</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Triage Score</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="6" className="p-4">
                        <div className="h-8 bg-white/5 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : patients.length === 0 ? (
                   <tr>
                     <td colSpan="6" className="p-12 text-center text-slate-500">
                        No records found matching "{debouncedSearch}"
                     </td>
                   </tr>
                ) : (
                  patients.map(patient => (
                    <tr key={patient.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-white">{patient.full_name}</div>
                        <div className="text-xs text-slate-500 font-mono">#{patient.id}</div>
                      </td>
                      <td className="p-4 text-sm text-slate-300">
                        {patient.age}Y <span className="text-slate-500">/</span> {patient.sex}
                      </td>
                      <td className="p-4 text-sm text-slate-300 font-mono">
                        {new Date(patient.arrival_ts).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                          patient.status === 'waiting' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          patient.status === 'in_treatment' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {patient.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                           <span className={`font-mono font-bold text-lg ${
                              patient.triage_score >= 85 ? 'text-red-500' :
                              patient.triage_score >= 50 ? 'text-orange-500' :
                              patient.triage_score >= 25 ? 'text-yellow-500' : 'text-green-500'
                           }`}>
                             {patient.triage_score}
                           </span>
                           {patient.triage_score >= 85 && <span className="animate-pulse">🔴</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                         <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            <DownloadReportButton 
                              patient={patient}
                              history={patient.meta?.vitals_history || []}
                              alerts={patient.meta?.latest_alerts || []}
                            />
                            <Link href={`/audit/${patient.id}`} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded border border-white/10 transition-colors">
                              Audit Logic
                            </Link>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-6">
           <button
             disabled={pagination.page <= 1}
             onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
             className="px-4 py-2 glass rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
           >
             ← Previous
           </button>
           <div className="flex gap-2">
              {Array.from({ length: Math.min(5, pagination.total_pages) }).map((_, i) => {
                 // Simple logic to show surrounding pages (omitted for brevity, showing first 5 or logic)
                 // For now just 1..totalPages capped at 5
                 // Better: Page X of Y
                 return null;
              })}
              <span className="text-sm text-slate-400 font-mono py-2">
                Page {pagination.page} of {pagination.total_pages}
              </span>
           </div>
           <button
             disabled={pagination.page >= pagination.total_pages}
             onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
             className="px-4 py-2 glass rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
           >
             Next →
           </button>
        </div>

      </div>
    </main>
  )
}
