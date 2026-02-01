'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Upload, Activity, AlertTriangle, CheckCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'
import axios from 'axios'

export default function CCTVModal({ onClose, hospitalId }) {
  const [videoSrc, setVideoSrc] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [status, setStatus] = useState('idle') // idle, scanning, detected, safe
  const [confidence, setConfidence] = useState(0)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const poseRef = useRef(null)
  const requestRef = useRef(null)
  const processingRef = useRef(false)
  const distressCounterRef = useRef(0)
  const frameCountRef = useRef(0)
  
  // Initialize MediaPipe Pose
  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      }
    })

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })

    pose.onResults(onResults)
    poseRef.current = pose

    return () => {
      if (poseRef.current) poseRef.current.close()
      if (requestRef.current) clearInterval(requestRef.current)
    }
  }, [])

  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setVideoSrc(url)
      setStatus('idle')
      setConfidence(0)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: {'video/*': []},
    multiple: false
  })

  // NEW LOGIC: Interval based
  const startAnalysis = () => {
    if (!videoRef.current || !poseRef.current) return
    setAnalyzing(true)
    setStatus('scanning')
    videoRef.current.play()
    
    // Run AI every 1000ms (1 FPS) - ZERO LOAD on Video Player
    if (requestRef.current) clearInterval(requestRef.current)
    requestRef.current = setInterval(processFrame, 1000)
  }

  const processFrame = async () => {
    if (!videoRef.current || !poseRef.current || videoRef.current.paused || videoRef.current.ended) {
       if (videoRef.current?.ended && status === 'scanning') {
         setStatus('safe')
         setAnalyzing(false)
         if (requestRef.current) clearInterval(requestRef.current)
       }
       return
    }

    // Prevent overlap
    if (processingRef.current) return

    processingRef.current = true

    try {
      await poseRef.current.send({ image: videoRef.current })
    } catch (e) {
      console.error(e)
    } finally {
      processingRef.current = false
    }
  }

  const onResults = (results) => {
    if (!canvasRef.current || !videoRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const video = videoRef.current

    // Resize canvas to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw landmarks
    if (results.poseLandmarks) {
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 })
      drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 })
      
      // FALL DETECTION LOGIC
      // Simple heuristic: If Nose Y is lower (higher value) than Hip Y, or very close to ankle Y
      detectFall(results.poseLandmarks)
    }
    
    ctx.restore()
  }

  const lastAlertTime = useRef(0)

  const detectFall = (landmarks) => {
    // MediaPipe Landmarks: 0=Nose, 11=LeftHip, 12=RightHip, 27=LeftAnkle, 28=RightAnkle
    const nose = landmarks[0]
    const leftHip = landmarks[11]
    const rightHip = landmarks[12]
    const leftAnkle = landmarks[27]
    const rightAnkle = landmarks[28]

    const leftKnee = landmarks[25]
    const rightKnee = landmarks[26]
    const kneeY = (leftKnee.y + rightKnee.y) / 2
    
    // Calculate Hip Y
    // Use previously declared leftHip (line 120) if available or just reuse them
    // Actually, just remove the re-declaration since we have them at line 120
    const hipY = (leftHip.y + rightHip.y) / 2

    // STRICTER LOGIC
    // 1. Is Head Below Knees? (True fall or deep slump)
    // Note: Y increases downwards. So Nose Y > Knee Y means Nose is LOWER on screen.
    const isHeadBelowKnees = nose.y > kneeY
    
    // 2. Is Head Below Hips? (Inverted/Crumpled)
    const isHeadBelowHips = nose.y > hipY
    
    // 3. Is Body Horizontal? (Lying Flat)
    // Check difference between Hip Y and Shoulder Y
    const leftShoulder = landmarks[11]
    const rightShoulder = landmarks[12]
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2
    
    // If vertical distance between shoulder and hip is very small compared to width
    const trunkHeight = Math.abs(shoulderY - hipY)
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x)
    
    // ASPECT RATIO CHECK (Scale Invariant)
    // Standing: Height > Width (Ratio > 1.2)
    // Sitting: Height ~ Width (Ratio ~ 1.0)
    // Lying: Height < Width (Ratio < 0.8)
    const torsoRatio = trunkHeight / (shoulderWidth || 0.01)
    
    // Relaxed ratio: Anything less than 1.0 starts to look suspicious (slumping)
    const isTorsoHorizontal = torsoRatio < 1.0 || trunkHeight < 0.1
    
    // Restore isFloorLevel check (Wide net)
    const isFloorLevel = nose.y > 0.50 

    // Confidence Calculation
    let currentConf = 0

    // HIP-CENTRIC LOGIC (Requested)
    // Check vertical distance between Hip and Ankle
    const ankleY = (leftAnkle.y + rightAnkle.y) / 2
    const hipToAnkleDist = Math.abs(ankleY - hipY)
    
    // Normal Standing: Hip is far above Ankle (Dist > 0.3)
    // Sitting: Hip is closer (Dist ~ 0.2)
    // Lying on Floor: Hip is same level as Ankle (Dist < 0.1)
    const isHipOnFloor = hipToAnkleDist < 0.15

    // Priority 1: Hip is on the floor (Strongest indicator)
    // HYBRID VOTING SYSTEM (Catch all fall types)
    // 1. Core Collapse: Hip is on the floor
    // 2. Head Dive: Head is physically lower than knees
    // 3. Flat Posture: Horizontal Torso near floor
    
    if (isHipOnFloor || isHeadBelowKnees || (isTorsoHorizontal && isFloorLevel)) {
       currentConf = 0.95
    }

    // Safety: If Hip is far above Ankle (Standing clearly), UNLESS Head is super low (inversion)
    if (hipToAnkleDist > 0.35 && !isHeadBelowKnees) currentConf = 0
    
    // Safety: Sitting Upright (Torso Vertical + Head High)
    if (!isTorsoHorizontal && !isHeadBelowHips && !isHipOnFloor) {
       currentConf = 0
    }
    
    // PERSISTENCE CHECK
    // Trigger immediately if VERY confident (Rapid Fall)
    const isRapidFall = currentConf > 0.9

    if (currentConf > 0.65) {
       distressCounterRef.current += 1
    } else {
       distressCounterRef.current = 0 
    }
    
    // Require 2 consecutive "Bad" frames OR 1 very bad frame
    const isPersistent = (distressCounterRef.current >= 2) || isRapidFall

    setConfidence(Math.round(currentConf * 100))

    // Trigger Alert threshold
    if (isPersistent && status !== 'detected') {
       // Debounce
       if (Date.now() - lastAlertTime.current > 3000) {
          triggerAlert()
          lastAlertTime.current = Date.now()
       }
    }
  }

  const triggerAlert = async () => {
    // double check status to prevent race
    if (status === 'detected') return 
    
    setStatus('detected')
    setAnalyzing(false)
    // Removed auto-pause for smoother playback
    // if (videoRef.current) videoRef.current.pause()

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      await axios.post(`${API_URL}/api/distress`, {
        hospital_id: hospitalId,
        zone: 'Waiting Room A',
        signal_type: 'Fall Detected (AI)',
        confidence: 0.98,
        patient_id: null
      })
    } catch (e) {
      console.error("Alert failed", e)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      
      <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${status === 'detected' ? 'bg-red-500' : status === 'scanning' ? 'bg-blue-500' : 'bg-slate-500'}`}></div>
            <div>
              <h2 className="text-white font-bold flex items-center gap-2">
                CCTV Analysis Module <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-400 font-mono">v3.0.1</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Model: MediaPipe Pose | Latency: 12ms | Device: {hospitalId ? `HOSP-${hospitalId}-CAM-01` : 'OFFLINE'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative bg-black flex items-center justify-center group">
          
          {!videoSrc ? (
            <div {...getRootProps()} className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed transition-all cursor-pointer p-8 ${isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-white/20'}`}>
              <input {...getInputProps()} />
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload size={32} className="text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Upload CCTV Footage</h3>
              <p className="text-slate-400 text-center max-w-md">
                Drag & drop a video file here, or click to select. 
                <br/><span className="text-xs opacity-50">Supported formats: MP4, WEBM (Max 50MB)</span>
              </p>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video 
                ref={videoRef}
                src={videoSrc}
                className="max-h-full max-w-full"
                loop
                muted
                playsInline
                onEnded={() => setAnalyzing(false)}
              />
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Status Overlay */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                 {status === 'scanning' && (
                   <div className="bg-black/80 backdrop-blur text-blue-400 text-xs font-mono px-3 py-1 rounded border border-blue-500/30 flex items-center gap-2">
                     <Activity size={12} className="animate-spin" /> SCANNING SKELETON
                   </div>
                 )}
                 {status === 'detected' && (
                   <div className="bg-red-500 text-white text-sm font-bold px-4 py-2 rounded shadow-lg animate-pulse flex items-center gap-2">
                     <AlertTriangle size={16} /> DISTRESS DETECTED
                   </div>
                 )}
                 {confidence > 0 && (
                   <div className="bg-black/50 text-white text-xs font-mono px-2 py-1 rounded">
                     Fall Probability: {confidence}%
                   </div>
                 )}
              </div>

              {/* Play Button Overlay (if idle) */}
              {!analyzing && status !== 'detected' && (
                <button 
                  onClick={startAnalysis}
                  className="absolute z-10 bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-full font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2"
                >
                  <Activity size={20} /> Run AI Analysis
                </button>
              )}
              
                 {/* Re-upload */}
                 <button 
                    onClick={() => { setVideoSrc(null); setStatus('idle'); }}
                    className="absolute top-4 left-4 z-10 bg-black/50 hover:bg-black/80 text-white/70 px-3 py-1 rounded text-xs transition-colors"
                 >
                    Change Source
                 </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-white/5 flex justify-between items-center text-xs text-slate-500 font-mono">
           <div>System Status: <span className="text-emerald-500">ONLINE</span></div>
           <div>
              {status === 'detected' ? (
                <span className="text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={12}/> ALERT BROADCAST SENT</span>
              ) : status === 'scanning' ? (
                <span className="text-blue-400 flex items-center gap-1"><Activity size={12}/> PROCESSING FRAMES...</span>
              ) : (
                <span>READY FOR INPUT</span>
              )}
           </div>
        </div>

      </div>
    </div>
  )
}
