'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Link from 'next/link'

export default function AuditPage({ params }) {
  // In Next.js 14, params is already resolved, no need for use() hook
  const patientId = params.patientId

  const [audits, setAudits] = useState([])
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  useEffect(() => {
    fetchAudit()
  }, [patientId])

  const fetchAudit = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/audit/${patientId}`)
      setAudits(response.data.audits || [])

      // Also fetch patient info
      const queueResp = await axios.get(`${API_URL}/api/queue`)
      const allPatients = queueResp.data.patients || []
      const foundPatient = allPatients.find(p => p.id === parseInt(patientId))
      setPatient(foundPatient)
    } catch (error) {
      console.error('Failed to fetch audit:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">Loading audit trail...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Triage Audit Trail</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Patient ID: {patientId}
              {patient && ` (${patient.full_name})`}
            </p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 glass rounded-lg hover:shadow-glow transition-all">
            ← Dashboard
          </Link>
        </div>

        {/* Patient Summary */}
        {patient && (
          <div className="glass rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Patient Summary</h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Current Score</p>
                <p className="text-3xl font-bold text-primary-600">{patient.triage_score}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Method</p>
                <p className="font-mono text-lg">{patient.triage_method.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Status</p>
                <p className="font-semibold text-lg capitalize">{patient.status}</p>
              </div>
            </div>
          </div>
        )}

        {/* Audit Entries */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Computation History</h2>
          
          {audits.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-gray-600 dark:text-gray-400">No audit entries found</p>
            </div>
          ) : (
            audits.map((audit, idx) => (
              <div key={audit.id} className="glass rounded-xl p-6 border-l-4 border-primary-500">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg">
                      Computation #{audits.length - idx}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(audit.computed_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary-600">{audit.score}</p>
                    <p className="text-xs font-mono text-gray-500">{audit.method}</p>
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-white/50 dark:bg-black/30 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 text-sm">Explainability Details</h4>
                  
                  {/* ML Details (Show if probability exists, regardless of method tag) */}
                  {audit.explanation?.probability !== undefined && (
                    <div className="space-y-2 text-sm mb-4 border-b border-white/5 pb-4">
                      <div className="flex justify-between items-center bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                        <span className="text-blue-200 font-bold flex items-center gap-2">
                          <span>🤖</span> ML Confidence
                        </span>
                        <span className="font-mono text-xl text-blue-400 font-bold">
                          {(audit.explanation.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      
                      {audit.explanation.features_used && (
                        <div className="mt-3">
                          <p className="text-gray-500 uppercase text-[10px] font-bold tracking-wider mb-2">Key Drivers</p>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(audit.explanation.features_used).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-xs bg-white/5 p-2 rounded">
                                <span className="text-slate-400">{key}:</span>
                                <span className="font-mono text-slate-200">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {audit.method === 'rules' && audit.explanation?.rules_fired && (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Rules Fired:</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {audit.explanation.rules_fired.map(rule => (
                            <span
                              key={rule}
                              className="px-3 py-1 bg-primary-500/20 rounded-full text-xs font-mono"
                            >
                              {rule}
                            </span>
                          ))}
                        </div>
                      </div>
                      {audit.explanation.weights_applied && (
                        <div className="mt-3">
                          <p className="text-gray-600 dark:text-gray-400 mb-2">Weights Applied:</p>
                          <pre className="text-xs font-mono bg-black/20 p-2 rounded overflow-x-auto">
                            {JSON.stringify(audit.explanation.weights_applied, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI & AI+ML Explanation */}
                  {(audit.method.includes('ai') || audit.explanation?.ai_analysis) && (
                    <div className="space-y-4 text-sm">
                      {(() => {
                        const aiData = audit.explanation?.ai_analysis || audit.explanation || {};
                        const reasoning = aiData.clinical_reasoning || aiData.reasoning || aiData.explanation || "No reasoning provided.";
                        // Handle actions as array or single string
                        const rawActions = aiData.recommended_actions || aiData.recommended_action;
                        const actions = Array.isArray(rawActions) ? rawActions : (rawActions ? [rawActions] : []);
                        const risks = aiData.risk_factors || [];

                        return (
                          <>
                            {/* Reasoning */}
                            <div>
                              <h5 className="font-bold text-slate-300 mb-1 flex items-center gap-2">
                                <span>🧠</span> Clinical Reasoning
                              </h5>
                              <p className="text-slate-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                                {reasoning}
                              </p>
                            </div>

                            {/* Risk Factors */}
                            {risks.length > 0 && (
                              <div>
                                <h5 className="font-bold text-slate-300 mb-2">Risk Factors</h5>
                                <div className="flex flex-wrap gap-2">
                                  {risks.map((risk, i) => (
                                    <span key={i} className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded">
                                      {risk}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Recommended Actions */}
                            {actions.length > 0 && (
                              <div>
                                <h5 className="font-bold text-slate-300 mb-2">Recommended Actions</h5>
                                <ul className="grid grid-cols-1 gap-2">
                                  {actions.map((action, i) => (
                                    <li key={i} className="flex items-start gap-2 text-slate-400 bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
                                      <span className="text-emerald-500 mt-0.5">✓</span>
                                      {action}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Raw Explanation JSON */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      Show raw JSON
                    </summary>
                    <pre className="mt-2 text-xs font-mono bg-black/20 p-3 rounded overflow-x-auto">
                      {JSON.stringify(audit.explanation, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Privacy Notice */}
        <div className="mt-8 text-center text-sm text-gray-500">
          🔒 This audit trail ensures full transparency and accountability in triage decisions
        </div>
      </div>
    </main>
  )
}
