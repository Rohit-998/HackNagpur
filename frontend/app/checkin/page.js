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
    full_name: '',
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
  const [speechError, setSpeechError] = useState(null)
  const recognitionRef = useRef(null) 

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      
      if (SpeechRecognition) {
        setSpeechSupported(true)
        const recognition = new SpeechRecognition()
        
        // Simple configuration
        recognition.continuous = false       // Single phrase at a time
        recognition.interimResults = false   // Only final results
        recognition.lang = 'en-IN'           // English (India) - better for Indian accents
        
        recognition.onstart = () => {
          setIsListening(true)
          setSpeechError(null)
          console.log('🎤 Listening...')
        }
        
        recognition.onend = () => {
          console.log('🎤 Stopped')
          setIsListening(false)
        }
        
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          console.log('🎤 Got:', transcript)
          
          if (transcript) {
            setFormData(prev => ({
              ...prev,
              custom_symptoms: prev.custom_symptoms 
                ? `${prev.custom_symptoms} ${transcript}` 
                : transcript
            }))
          }
        }
        
        recognition.onerror = (event) => {
          console.error('🎤 Error:', event.error)
          setIsListening(false)
          
          if (event.error === 'not-allowed') {
            setSpeechError('Microphone blocked. Click 🔒 in address bar to allow.')
          } else if (event.error === 'no-speech') {
            setSpeechError('No speech heard. Try again.')
          } else if (event.error === 'network') {
            setSpeechError('Internet required for voice recognition.')
          }
        }
        
        recognitionRef.current = recognition
      }
    }
  }, [])

  const toggleListening = async () => {
    if (!recognitionRef.current) {
      setSpeechError('Voice not supported in this browser. Use Chrome.')
      return
    }
    
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      // Request mic permission
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        setSpeechError(null)
        recognitionRef.current.start()
      } catch (err) {
        setSpeechError('Allow microphone access to use voice input.')
      }
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
          full_name: '',
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
    if (score >= 50) return 'text-high'
    if (score >= 25) return 'text-medium'
    return 'text-low'
  }

  const getScoreBg = (score) => {
    if (score >= 85) return 'bg-critical/20 border-critical'
    if (score >= 50) return 'bg-high/20 border-high'
    if (score >= 25) return 'bg-medium/20 border-medium'
    return 'bg-low/20 border-low'
  }

  const getPriorityBadge = (score) => {
    if (score >= 85) return { text: 'CRITICAL', color: 'bg-red-500', emoji: '🔴' }
    if (score >= 50) return { text: 'HIGH', color: 'bg-orange-500', emoji: '🟠' }
    if (score >= 25) return { text: 'MEDIUM', color: 'bg-yellow-500', emoji: '🟡' }
    return { text: 'LOW', color: 'bg-green-500', emoji: '🟢' }
  }

  return (
    <main className="min-h-screen py-12 px-4 md:px-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-6 gap-4 md:gap-0">
          <div>
            <div className="text-primary-400 text-xs font-mono mb-2 tracking-widest uppercase">Protocol: Standard Intake</div>
            <h1 className="text-4xl font-display font-bold text-white tracking-tight">Patient Check-in</h1>
          </div>
          
          <Link href="/dashboard" className="group flex items-center gap-3 px-5 py-3 glass rounded-xl hover:shadow-glow transition-all border border-white/10 hover:border-primary-500/50">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs text-slate-400 group-hover:text-slate-300">View Active Queue</span>
              <span className="text-sm font-bold text-white group-hover:text-primary-400">Live Dashboard</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </Link>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Form Column */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-8 space-y-8">
              
              {/* Section 1: Demographics */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                  Patient Identification
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={e => setFormData({...formData, full_name: e.target.value})}
                      className="glass-input font-mono focus:border-primary-400"
                      placeholder="Rahul Sharma"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Age</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="120"
                      value={formData.age}
                      onChange={e => setFormData({...formData, age: e.target.value})}
                      className="glass-input focus:border-primary-400"
                      placeholder="Years"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Sex</label>
                    <select
                      value={formData.sex}
                      onChange={e => setFormData({...formData, sex: e.target.value})}
                      className="glass-input focus:border-primary-400 appearance-none bg-[url('https://api.iconify.design/heroicons/chevron-down.svg?color=gray')] bg-no-repeat bg-[right_1rem_center] bg-[length:1.2em]"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Vitals */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Telemetry / Vitals
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass-card bg-slate-900/40 p-4 border border-white/5 hover:border-primary-500/30 transition-colors group">
                    <label className="block text-xs text-slate-500 mb-1 group-hover:text-primary-400 transition-colors">Heart Rate</label>
                    <div className="flex items-baseline gap-2">
                      <input
                        type="number"
                        min="40"
                        max="220"
                        value={formData.vitals.hr}
                        onChange={e => setFormData({...formData, vitals: {...formData.vitals, hr: e.target.value}})}
                        className="w-full bg-transparent text-2xl font-bold font-mono text-white outline-none placeholder-slate-700"
                        placeholder="--"
                      />
                      <span className="text-xs text-slate-600">BPM</span>
                    </div>
                  </div>
                  <div className="glass-card bg-slate-900/40 p-4 border border-white/5 hover:border-primary-500/30 transition-colors group">
                    <label className="block text-xs text-slate-500 mb-1 group-hover:text-primary-400 transition-colors">Systolic BP</label>
                    <div className="flex items-baseline gap-2">
                      <input
                        type="number"
                        min="60"
                        max="220"
                        value={formData.vitals.sbp}
                        onChange={e => setFormData({...formData, vitals: {...formData.vitals, sbp: e.target.value}})}
                        className="w-full bg-transparent text-2xl font-bold font-mono text-white outline-none placeholder-slate-700"
                        placeholder="--"
                      />
                      <span className="text-xs text-slate-600">mmHg</span>
                    </div>
                  </div>
                  <div className="glass-card bg-slate-900/40 p-4 border border-white/5 hover:border-primary-500/30 transition-colors group">
                    <label className="block text-xs text-slate-500 mb-1 group-hover:text-primary-400 transition-colors">SpO2</label>
                    <div className="flex items-baseline gap-2">
                      <input
                        type="number"
                        min="70"
                        max="100"
                        value={formData.vitals.spo2}
                        onChange={e => setFormData({...formData, vitals: {...formData.vitals, spo2: e.target.value}})}
                        className="w-full bg-transparent text-2xl font-bold font-mono text-white outline-none placeholder-slate-700"
                        placeholder="--"
                      />
                      <span className="text-xs text-slate-600">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Symptoms */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  Clinical Signs
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SYMPTOM_OPTIONS.map(symptom => (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => handleSymptomToggle(symptom)}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        formData.symptoms.includes(symptom)
                          ? 'bg-primary-500/20 border-primary-500 text-primary-200 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                          : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${formData.symptoms.includes(symptom) ? 'bg-primary-400' : 'bg-slate-700'}`}></span>
                      {symptom.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 4: AI Analysis */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className={`p-1 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 ${isListening ? 'border-primary-500/50 shadow-glow' : ''}`}>
                  <div className="bg-slate-950/80 rounded-xl p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                        <span className="text-xl">🤖</span> AI Symptom Analysis
                      </label>
                      {speechSupported && (
                         <button
                           type="button"
                           onClick={toggleListening}
                           className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                             isListening 
                               ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' 
                               : 'bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:bg-primary-500/20'
                           }`}
                         >
                           {isListening ? (
                             <>
                               <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                               Listening...
                             </>
                           ) : (
                             <>
                               <span>🎙️</span> Voice Input
                             </>
                           )}
                         </button>
                      )}
                    </div>

                    <textarea
                      value={formData.custom_symptoms}
                      onChange={e => setFormData({...formData, custom_symptoms: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none min-h-[100px] resize-none font-sans text-sm leading-relaxed"
                      placeholder={isListening ? "Listening... Speak clearly..." : "Describe detailed symptoms here. The AI will analyze for critical keywords and severity patterns."}
                    />
                    
                    {speechError && (
                      <p className="mt-2 text-xs text-orange-400 flex items-center gap-2">
                        ⚠️ {speechError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

               {/* Comorbidities */}
               <div className="pt-4 border-t border-white/5">
                 <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-white/5">
                   <label className="text-sm font-medium text-slate-400">Known Comorbidities</label>
                   <input
                     type="number"
                     min="0"
                     max="10"
                     value={formData.comorbid}
                     onChange={e => setFormData({...formData, comorbid: parseInt(e.target.value) || 0})}
                     className="bg-slate-950 border border-slate-700 rounded-lg w-20 px-3 py-1 text-center font-mono text-white focus:border-primary-500 outline-none"
                   />
                 </div>
               </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full text-lg tracking-wide uppercase"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Triage...
                  </span>
                ) : 'Submit for Triage'}
              </button>
            </form>
          </div>

          {/* Sidebar / Results Column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Status Panel */}
             <div className="glass-panel rounded-xl p-6">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">System Status</h4>
               <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">ML Model</span>
                   <span className="flex items-center gap-2 text-emerald-400">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                     Online
                   </span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">AI Analysis</span>
                   <span className="text-primary-400">Active</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">Queue Latency</span>
                   <span className="font-mono text-slate-200">~12ms</span>
                 </div>
               </div>
             </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl text-sm leading-relaxed backdrop-blur-sm">
                <strong className="block text-red-400 mb-1">ERR_SUBMISSION_FAILED</strong>
                {error}
              </div>
            )}

            {/* Success Result Card */}
            {result ? (
              <div className={`glass-panel rounded-2xl overflow-hidden border-2 ${result.triage_score >= 85 ? 'border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)]' : 'border-primary-500/50 shadow-glow'}`}>
                <div className={`p-1 ${result.triage_score >= 85 ? 'bg-red-500' : 'bg-primary-500'}`}></div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-display font-bold text-white mb-1">Triage Complete</h3>
                      <p className="text-xs font-mono text-slate-400">{result.id}</p>
                    </div>
                    <span className={`${getPriorityBadge(result.triage_score).color} text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${result.triage_score >= 85 ? 'animate-pulse' : ''}`}>
                      <span>{getPriorityBadge(result.triage_score).emoji}</span>
                      {getPriorityBadge(result.triage_score).text}
                    </span>
                  </div>
                  
                  <div className="text-center py-8 relative">
                    <div className={`text-7xl font-display font-bold mb-2 ${result.triage_score >= 85 ? 'text-red-400 text-glow' : 'text-primary-400 text-glow'}`}>
                      {result.triage_score}
                    </div>
                    <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">Calculated Urgency Score</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Method</p>
                      <p className="font-mono text-sm text-slate-300">{result.triage_method}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Placement</p>
                      <p className="font-mono text-sm text-white"># PENDING</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
               <div className="glass-panel rounded-xl p-8 text-center border-dashed border-slate-800">
                 <div className="text-4xl mb-4 opacity-20">📊</div>
                 <p className="text-sm text-slate-500">
                   Result telemetry will appear here after analysis is complete.
                 </p>
               </div>
            )}

            {/* AI Analysis Card */}
            {aiAnalysis && aiAnalysis.severity !== 'unknown' && (
              <div className="glass-panel rounded-xl p-6 border-l-4 border-l-purple-500">
                <h4 className="flex items-center gap-2 font-bold text-white mb-4">
                  <span className="text-purple-400">✦</span> AI Insights
                </h4>
                
                <div className="mb-4">
                   <div className="flex justify-between text-sm mb-1">
                     <span className="text-slate-400">Severity Assessment</span>
                     <span className="text-white font-medium capitalize">{aiAnalysis.severity}</span>
                   </div>
                   <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                     <div 
                       className={`h-full ${aiAnalysis.severity === 'critical' ? 'bg-red-500' : 'bg-purple-500'}`} 
                       style={{width: aiAnalysis.severity === 'critical' ? '100%' : '60%'}}
                     ></div>
                   </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-white/5 rounded-lg p-3 text-sm text-slate-300 leading-relaxed">
                    {aiAnalysis.explanation}
                  </div>
                  
                  <div className="flex items-start gap-3 mt-4 pt-4 border-t border-white/5">
                    <span className="text-blue-400 mt-0.5">ⓘ</span>
                    <div>
                      <p className="text-xs font-bold text-blue-400 uppercase mb-1">Recommendation</p>
                      <p className="text-sm text-slate-300">{aiAnalysis.recommended_action}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <span className="inline-block bg-purple-500/20 text-purple-300 text-xs font-bold px-3 py-1 rounded-full border border-purple-500/30">
                    +{aiAnalysis.urgency_boost} Point Boost Applied
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
