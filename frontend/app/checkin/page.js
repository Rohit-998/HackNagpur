'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import Link from 'next/link'

const SYMPTOM_OPTIONS = [
  'chest_pain',
  'shortness_of_breath',
  'altered_consciousness',
  'abdominal_pain',
  'headache',
  'fever',
  'nausea',
  'bleeding',
  'trauma'
]

export default function CheckinPage() {
  const [formData, setFormData] = useState({
    device_patient_id: '',
    age: '',
    sex: 'other',
    symptoms: [],
    vitals: {
      hr: '',
      sbp: '',
      spo2: ''
    },
    comorbid: 0,
    custom_symptoms: ''
  })

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  
  // Voice Input Logic
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  // Fix: Use useRef properly
  const recognitionRef = useRef(null) 

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      setSpeechSupported(true)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      
      recognitionRef.current.onstart = () => setIsListening(true)
      recognitionRef.current.onend = () => setIsListening(false)
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setFormData(prev => ({
          ...prev,
          custom_symptoms: prev.custom_symptoms 
            ? `${prev.custom_symptoms} ${transcript}` 
            : transcript
        }))
      }
    }
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
    }
  } 


  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  const handleSymptomToggle = (symptom) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setResult(null)
    setAiAnalysis(null)

    try {
      const payload = {
        ...formData,
        age: parseInt(formData.age),
        vitals: {
          hr: formData.vitals.hr ? parseInt(formData.vitals.hr) : undefined,
          sbp: formData.vitals.sbp ? parseInt(formData.vitals.sbp) : undefined,
          spo2: formData.vitals.spo2 ? parseInt(formData.vitals.spo2) : undefined
        }
      }

      const response = await axios.post(`${API_URL}/api/checkin`, payload)
      setResult(response.data.patient)
      setAiAnalysis(response.data.ai_analysis)

      // Reset form
      setTimeout(() => {
        setFormData({
          device_patient_id: '',
          age: '',
          sex: 'other',
          symptoms: [],
          vitals: { hr: '', sbp: '', spo2: '' },
          comorbid: 0,
          custom_symptoms: ''
        })
        setResult(null)
        setAiAnalysis(null)
      }, 8000)

    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-critical'
    if (score >= 70) return 'text-high'
    if (score >= 50) return 'text-medium'
    return 'text-low'
  }

  const getScoreBg = (score) => {
    if (score >= 85) return 'bg-critical/20 border-critical'
    if (score >= 70) return 'bg-high/20 border-high'
    if (score >= 50) return 'bg-medium/20 border-medium'
    return 'bg-low/20 border-low'
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Patient Check-in</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter patient information for automated triage
            </p>
          </div>
          <Link href="/" className="px-4 py-2 glass rounded-lg hover:shadow-glow transition-all">
            ← Home
          </Link>
        </div>

        {/* Success Result */}
        {result && (
          <div className={`glass rounded-xl p-6 mb-6 ${getScoreBg(result.triage_score)} border-2 animate-pulse-glow`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">✓ Patient Checked In</h3>
              <span className="text-sm text-gray-600">ID: {result.id}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Triage Score</p>
                <p className={`text-5xl font-bold ${getScoreColor(result.triage_score)}`}>
                  {result.triage_score}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Method</p>
                <p className="font-mono text-sm">{result.triage_method.toUpperCase()}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {result.triage_score >= 85 && '🚨 Critical alert sent!'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis Result */}
        {aiAnalysis && aiAnalysis.severity !== 'unknown' && (
          <div className="glass rounded-xl p-6 mb-6 border-2 border-purple-500 bg-purple-500/10">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">🤖</span>
              <h3 className="text-lg font-bold">AI Symptom Analysis</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Severity Level</p>
                <p className="font-bold text-lg capitalize">{aiAnalysis.severity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Urgency Boost</p>
                <p className="font-bold text-lg text-purple-600">+{aiAnalysis.urgency_boost} points</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/30 dark:bg-black/20 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Clinical Reasoning</p>
              <p className="text-sm">{aiAnalysis.explanation}</p>
            </div>
            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Recommended Action</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">{aiAnalysis.recommended_action}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border-2 border-red-500 rounded-xl p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">❌ {error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-6">
          {/* Basic Info */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Patient ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.device_patient_id}
                onChange={e => setFormData({...formData, device_patient_id: e.target.value})}
                className="w-full px-4 py-2 rounded-lg bg-white/50 dark:bg-black/30 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="e.g., PT-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                max="120"
                value={formData.age}
                onChange={e => setFormData({...formData, age: e.target.value})}
                className="w-full px-4 py-2 rounded-lg bg-white/50 dark:bg-black/30 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Years"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sex</label>
              <select
                value={formData.sex}
                onChange={e => setFormData({...formData, sex: e.target.value})}
                className="w-full px-4 py-2 rounded-lg bg-white/50 dark:bg-black/30 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Vitals */}
          <div>
            <label className="block text-sm font-medium mb-3">Vital Signs (Optional)</label>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  min="40"
                  max="200"
                  value={formData.vitals.hr}
                  onChange={e => setFormData({...formData, vitals: {...formData.vitals, hr: e.target.value}})}
                  className="w-full px-4 py-2 rounded-lg bg-white/50 dark:bg-black/30 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="80"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Blood Pressure (systolic)
                </label>
                <input
                  type="number"
                  min="60"
                  max="200"
                  value={formData.vitals.sbp}
                  onChange={e => setFormData({...formData, vitals: {...formData.vitals, sbp: e.target.value}})}
                  className="w-full px-4 py-2 rounded-lg bg-white/50 dark:bg-black/30 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="120"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  SpO2 (%)
                </label>
                <input
                  type="number"
                  min="70"
                  max="100"
                  value={formData.vitals.spo2}
                  onChange={e => setFormData({...formData, vitals: {...formData.vitals, spo2: e.target.value}})}
                  className="w-full px-4 py-2 rounded-lg bg-white/50 dark:bg-black/30 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="98"
                />
              </div>
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <label className="block text-sm font-medium mb-3">Symptoms</label>
            <div className="grid md:grid-cols-3 gap-3">
              {SYMPTOM_OPTIONS.map(symptom => (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => handleSymptomToggle(symptom)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    formData.symptoms.includes(symptom)
                      ? 'bg-primary-500 border-primary-600 text-white'
                      : 'bg-white/50 dark:bg-black/30 border-gray-300 dark:border-gray-700 hover:border-primary-400'
                  }`}
                >
                  {symptom.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Symptoms with AI Analysis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                <span className="flex items-center gap-2">
                  Other Symptoms 
                  <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">🤖 AI Powered</span>
                </span>
              </label>
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                  }`}
                >
                  {isListening ? '🔴 Listening...' : '🎙️ Voice Input'}
                </button>
              )}
            </div>
            <textarea
              value={formData.custom_symptoms}
              onChange={e => setFormData({...formData, custom_symptoms: e.target.value})}
              className="w-full px-4 py-3 rounded-lg bg-white/50 dark:bg-black/30 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              placeholder="Describe any additional symptoms not listed above... AI will analyze the severity and urgency."
              rows="3"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 AI will analyze this text and automatically boost the triage score based on severity
            </p>
          </div>

          {/* Comorbidities */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Number of Comorbidities
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.comorbid}
              onChange={e => setFormData({...formData, comorbid: parseInt(e.target.value) || 0})}
              className="w-full px-4 py-2 rounded-lg bg-white/50 dark:bg-black/30 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="0"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-xl hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '⏳ Processing...' : '✓ Check In Patient'}
          </button>
        </form>

        {/* Link to Dashboard */}
        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-primary-500 hover:underline">
            → View Queue Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
