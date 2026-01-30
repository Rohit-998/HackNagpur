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

  const getScoreBadge = (score) => {
    if (score >= 85) return 'bg-critical/20 border-critical'
    if (score >= 70) return 'bg-high/20 border-high'
    if (score >= 50) return 'bg-medium/20 border-medium'
    return 'bg-low/20 border-low'
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
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Queue Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 flex items-center space-x-2">
              <span>{connected ? '🟢' : '🔴'}</span>
              <span>{connected ? 'Real-time updates active' : 'Disconnected'}</span>
            </p>
          </div>
          <Link href="/" className="px-4 py-2 glass rounded-lg hover:shadow-glow transition-all">
            ← Home
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-xl p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Waiting</p>
            <p className="text-4xl font-bold text-primary-600">{stats.total_waiting || 0}</p>
          </div>
          <div className="glass rounded-xl p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Critical Patients</p>
            <p className="text-4xl font-bold text-critical">{stats.critical_count || 0}</p>
          </div>
          <div className="glass rounded-xl p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Wait Time</p>
            <p className="text-4xl font-bold text-medium">
              {stats.avg_wait_secs ? Math.round(stats.avg_wait_secs / 60) : 0}
              <span className="text-lg ml-1">min</span>
            </p>
          </div>
          <div className="glass rounded-xl p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Recent Alerts</p>
            <p className="text-4xl font-bold text-high">{alerts.length}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Queue List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold mb-4">Patient Queue</h2>
            
            {loading ? (
              <div className="glass rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-600 dark:text-gray-400">Loading queue...</p>
              </div>
            ) : queue.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">✓</div>
                <p className="text-gray-600 dark:text-gray-400">No patients waiting</p>
              </div>
            ) : (
              queue.map((patient, idx) => (
                <div
                  key={patient.id}
                  className={`glass rounded-xl p-6 border-2 ${getScoreBadge(patient.triage_score)} ${
                    patient.triage_score >= 85 ? 'animate-pulse-critical' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold text-gray-400">#{idx + 1}</div>
                      <div>
                        <p className="font-mono font-semibold text-lg">
                          {patient.device_patient_id}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {patient.age}y · {patient.sex}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-5xl font-bold ${getScoreColor(patient.triage_score)}`}>
                        {patient.triage_score}
                      </p>
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        {patient.triage_method}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Waiting</p>
                      <p className="font-semibold">{getWaitTime(patient.arrival_ts)} min</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Symptoms</p>
                      <p className="font-semibold">
                        {patient.symptoms?.length || 0} reported
                      </p>
                    </div>
                  </div>

                  {patient.symptoms && patient.symptoms.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Symptoms:</p>
                      <div className="flex flex-wrap gap-2">
                        {patient.symptoms.map(s => (
                          <span
                            key={s}
                            className="px-2 py-1 bg-primary-500/20 rounded text-xs"
                          >
                            {s.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStatusChange(patient.id, 'in_treatment')}
                      className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
                    >
                      Start Treatment
                    </button>
                    <button
                      onClick={() => handleStatusChange(patient.id, 'completed')}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                    >
                      Mark Complete
                    </button>
                    <Link
                      href={`/audit/${patient.id}`}
                      className="px-4 py-2 glass rounded-lg hover:shadow-glow transition-all text-sm flex items-center"
                    >
                      📋 Audit
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Alerts Feed */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">🚨 Recent Alerts</h3>
              {alerts.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No alerts yet</p>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className="bg-red-500/10 border border-red-500/30 rounded-lg p-3"
                    >
                      <p className="font-semibold text-sm">
                        {alert.alert_type === 'critical_patient' ? '⚠️ Critical Patient' : '⏰ SLA Breach'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Patient #{alert.patient_id}
                        {alert.triage_score && ` · Score: ${alert.triage_score}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">📈 Wait Time Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="wait"
                    stroke="#0ea5e9"
                    fill="#0ea5e9"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Actions */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">⚡ Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/checkin"
                  className="block w-full px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-center"
                >
                  + New Check-in
                </Link>
                <Link
                  href="/admin"
                  className="block w-full px-4 py-3 glass rounded-lg hover:shadow-glow transition-all text-center"
                >
                  ⚙️ Admin Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
