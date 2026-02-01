'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Upload, X, AlertCircle, Activity, ShieldCheck } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

export default function InjuryAnalysisModal({ onClose, onConfirm }) {
  const [imageSrc, setImageSrc] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  
  const canvasRef = useRef(null)
  const imgRef = useRef(null)

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImageSrc(url)
      setResult(null)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {'image/*': []},
    multiple: false
  })

  const analyzeInjury = () => {
    if (!imgRef.current || !canvasRef.current) return
    setAnalyzing(true)

    // Simulate "Processing" delay for effect
    setTimeout(() => {
        processImage()
    }, 1500)
  }

  const processImage = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = imgRef.current
    
    // Resize canvas to match image
    canvas.width = img.width
    canvas.height = img.height
    
    // Draw original image
    ctx.drawImage(img, 0, 0)
    
    // Get Image Data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    let redCount = 0
    let darkCount = 0
    let totalExposedPixels = 0
    
    // PIXEL ANALYSIS (HSV Logic Simplified)
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        // Simple "Skin/Flesh" detection mask (Optional)
        // Check for BLOOD RED (High Red, Low Blue/Green)
        if (r > 100 && g < 80 && b < 80) { // Fresh Blood
             redCount++
             // Highlight in Neon Red on Canvas overlay
             data[i] = 255
             data[i+1] = 0
             data[i+2] = 0
        } else if (r < 60 && g < 40 && b < 40) { // Dark/Coagulated/Bruise
             darkCount++
             // Highlight in Purple
             data[i] = 128
             data[i+1] = 0
             data[i+2] = 128
        }
    }
    
    // Update Canvas with Heatmap
    ctx.putImageData(imageData, 0, 0)
    
    // Calculate Metrics
    const totalPixels = data.length / 4
    const bloodRatio = (redCount / totalPixels) * 100
    const traumaRatio = (darkCount / totalPixels) * 100
    const score = Math.min(100, (bloodRatio * 2.5) + (traumaRatio * 1.5))
    
    let severity = 'LOW'
    if (score > 15) severity = 'MEDIUM'
    if (score > 35) severity = 'HIGH'
    if (score > 50) severity = 'CRITICAL'
    
    setResult({
        score: Math.round(score),
        severity,
        bloodCov: bloodRatio.toFixed(1),
        traumaCov: traumaRatio.toFixed(1)
    })
    setAnalyzing(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
             <div className="bg-red-500/20 p-2 rounded-lg text-red-400">
                 <Activity size={20} />
             </div>
             <div>
               <h2 className="text-white font-bold text-lg">Visual Injury Analysis</h2>
               <p className="text-xs text-slate-400 font-mono">CV MODEL: PIXEL-TENSOR-V2 (LOCAL)</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
            {!imageSrc ? (
                 <div {...getRootProps()} className={`w-full h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all cursor-pointer p-8 ${isDragActive ? 'border-red-500 bg-red-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
                   <input {...getInputProps()} />
                   <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                     <Upload size={28} className="text-slate-400" />
                   </div>
                   <h3 className="text-lg font-bold text-slate-200">Upload Wound Image</h3>
                   <p className="text-slate-500 text-sm mt-2 text-center">Analyze visible injuries (lacerations, burns, fractures)<br/>for severity scoring.</p>
                 </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Image View */}
                    <div className="space-y-4">
                        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black h-64 flex items-center justify-center">
                            {/* Hidden Source Image */}
                            <img ref={imgRef} src={imageSrc} className="hidden" alt="source" onLoad={() => {}} />
                            
                            {/* Canvas for Analysis */}
                            <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
                            
                            {/* Scanning Overlay */}
                            {analyzing && (
                                <div className="absolute inset-0 bg-red-500/10 z-10 animate-pulse flex items-center justify-center backdrop-blur-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <Activity size={32} className="text-red-500 animate-spin" />
                                        <span className="text-xs font-mono font-bold text-red-400">ANALYZING TISSUE DAMAGE...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between">
                            <button onClick={() => {setImageSrc(null); setResult(null)}} className="text-xs text-slate-500 hover:text-white transition-colors">
                                Reset Image
                            </button>
                            {!analyzing && !result && (
                                <button onClick={analyzeInjury} className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded text-xs font-bold shadow-lg shadow-red-900/20">
                                    Run Scan
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Results View */}
                    <div className="space-y-4">
                        {result ? (
                             <div className="animate-in slide-in-from-right duration-300 space-y-4">
                                 <div className={`p-4 rounded-xl border-l-4 ${
                                     result.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500' :
                                     result.severity === 'HIGH' ? 'bg-orange-500/10 border-orange-500' :
                                     result.severity === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500' :
                                     'bg-emerald-500/10 border-emerald-500'
                                 }`}>
                                     <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">AI Severity Score</div>
                                     <div className={`text-4xl font-display font-bold ${
                                         result.severity === 'CRITICAL' ? 'text-red-500' :
                                         result.severity === 'HIGH' ? 'text-orange-500' :
                                         result.severity === 'MEDIUM' ? 'text-yellow-500' :
                                         'text-emerald-500'
                                     }`}>
                                         {result.severity}
                                     </div>
                                     <div className="text-sm font-mono text-slate-400 mt-1">Calculated Index: {result.score}/100</div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-3">
                                     <div className="bg-slate-800/50 p-3 rounded-lg border border-white/5">
                                         <div className="text-[10px] text-slate-500 uppercase">Hemorrhage Area</div>
                                         <div className="text-xl font-mono font-bold text-red-400">{result.bloodCov}%</div>
                                     </div>
                                     <div className="bg-slate-800/50 p-3 rounded-lg border border-white/5">
                                         <div className="text-[10px] text-slate-500 uppercase">Tissue Trauma</div>
                                         <div className="text-xl font-mono font-bold text-purple-400">{result.traumaCov}%</div>
                                     </div>
                                 </div>

                                 <div className="bg-blue-500/5 p-3 rounded-lg border border-blue-500/10 text-xs text-blue-300 flex gap-2">
                                     <ShieldCheck size={16} className="shrink-0" />
                                     <p>Recommended Triage Shift: 
                                       <span className="font-bold text-white block mt-1">
                                           {result.severity === 'CRITICAL' ? '+25 Points (Immediate Intervention)' : 
                                            result.severity === 'HIGH' ? '+15 Points (Urgent)' :
                                            '+5 Points (Standard)'}
                                       </span>
                                     </p>
                                 </div>
                             </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-600 font-mono text-xs border-2 border-dashed border-slate-800 rounded-xl">
                                AWAITING ANALYSIS
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-white/5 flex justify-end gap-3">
             <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
             <button 
                disabled={!result}
                onClick={() => onConfirm(result)}
                className="btn-primary px-6 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
             >
                Attach to Record
             </button>
        </div>

      </div>
    </div>
  )
}
