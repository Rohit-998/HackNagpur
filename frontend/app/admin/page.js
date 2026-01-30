'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Link from 'next/link'

export default function AdminPage() {
  const [weights, setWeights] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  useEffect(() => {
    fetchWeights()
  }, [])

  const fetchWeights = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/weights`)
      setWeights(response.data.weights)
    } catch (error) {
      console.error('Failed to fetch weights:', error)
    }
  }

  const handleWeightChange = (key, value) => {
    setWeights(prev => ({
      ...prev,
      [key]: parseInt(value) || 0
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await axios.post(`${API_URL}/api/admin/weights`, { weights })
      setMessage({ type: 'success', text: '✓ Weights updated successfully' })
      
      // Notify to recompute all waiting patients
      setTimeout(() => {
        setMessage({
          type: 'info',
          text: '💡 Tip: Recompute patient scores to apply new weights'
        })
      }, 2000)
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Failed to update weights: ' + error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleRecomputeAll = async () => {
    setMessage({ type: 'info', text: '⏳ Recomputing all patient scores...' })
    
    try {
      // Fetch all waiting patients
      const queueResp = await axios.get(`${API_URL}/api/queue`)
      const patients = queueResp.data.patients || []
      
      // Recompute each
      for (const patient of patients) {
        await axios.post(`${API_URL}/api/triage/recompute/${patient.id}`)
      }
      
      setMessage({ type: 'success', text: `✓ Recomputed ${patients.length} patients` })
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Failed to recompute: ' + error.message })
    }
  }

  const resetToDefaults = () => {
    setWeights({
      chest_pain: 30,
      shortness_of_breath: 25,
      spo2_low: 30,
      sbp_low: 20,
      hr_high: 15,
      altered_consciousness: 40,
      age_over_65: 8,
      comorbid: 10
    })
    setMessage({ type: 'info', text: '↺ Reset to default values (not saved yet)' })
  }

  if (!weights) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </main>
    )
  }

  const weightEntries = Object.entries(weights)

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure triage weights and manage queue settings
            </p>
          </div>
          <Link href="/" className="px-4 py-2 glass rounded-lg hover:shadow-glow transition-all">
            ← Home
          </Link>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-xl p-4 mb-6 border-2 ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500'
                : message.type === 'error'
                ? 'bg-red-500/10 border-red-500'
                : 'bg-blue-500/10 border-blue-500'
            }`}
          >
            <p
              className={
                message.type === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : message.type === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              }
            >
              {message.text}
            </p>
          </div>
        )}

        {/* Weights Configuration */}
        <div className="glass rounded-2xl p-8 mb-6">
          <h2 className="text-2xl font-bold mb-6">Triage Weight Configuration</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Adjust the importance of each factor in triage scoring. Higher values = higher priority.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {weightEntries.map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                  <span className="text-2xl font-bold text-primary-600">{value}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={value}
                  onChange={e => handleWeightChange(key, e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex space-x-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-xl hover:shadow-glow transition-all disabled:opacity-50"
            >
              {saving ? '⏳ Saving...' : '💾 Save Weights'}
            </button>
            <button
              onClick={resetToDefaults}
              className="px-6 py-4 glass rounded-xl hover:shadow-glow transition-all"
            >
              ↺ Reset to Defaults
            </button>
          </div>
        </div>

        {/* Queue Management */}
        <div className="glass rounded-2xl p-8 mb-6">
          <h2 className="text-2xl font-bold mb-6">Queue Management</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/30 rounded-xl">
              <div>
                <h3 className="font-semibold">Recompute All Patients</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Recalculate triage scores for all waiting patients using current weights
                </p>
              </div>
              <button
                onClick={handleRecomputeAll}
                className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                🔄 Recompute
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/30 rounded-xl">
              <div>
                <h3 className="font-semibold">View Queue Dashboard</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Monitor real-time patient queue and alerts
                </p>
              </div>
              <Link
                href="/dashboard"
                className="px-6 py-3 glass rounded-lg hover:shadow-glow transition-all"
              >
                📊 Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="glass rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6">System Information</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between p-3 bg-white/50 dark:bg-black/30 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">Triage Method</span>
              <span className="font-mono">ML → Rules Fallback</span>
            </div>
            <div className="flex justify-between p-3 bg-white/50 dark:bg-black/30 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">ML Model</span>
              <span className="font-mono">Logistic Regression</span>
            </div>
            <div className="flex justify-between p-3 bg-white/50 dark:bg-black/30 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">Critical Threshold</span>
              <span className="font-mono">Score ≥ 85</span>
            </div>
            <div className="flex justify-between p-3 bg-white/50 dark:bg-black/30 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">SLA Threshold</span>
              <span className="font-mono">30 minutes</span>
            </div>
            <div className="flex justify-between p-3 bg-white/50 dark:bg-black/30 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">Real-time Updates</span>
              <span className="font-mono">WebSocket (Socket.IO)</span>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 text-center text-sm text-gray-500">
          🔒 All triage decisions are audited and logged for transparency
        </div>
      </div>
    </main>
  )
}
