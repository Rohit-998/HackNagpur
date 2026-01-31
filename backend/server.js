// server.js
// Main Node.js + Express + Socket.IO backend for HT-1 Triage System

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const app = express();
const server = http.createServer(app);

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL, // Will be set in production
];

// Allow Vercel preview deployments and Azure App Services
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow Vercel preview URLs (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // Allow Render URLs for testing
    if (origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    
    // Allow Azure App Service URLs (*.azurewebsites.net)
    if (origin.endsWith('.azurewebsites.net')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
};

const io = new Server(server, {
  cors: corsOptions
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY
);

const { Groq } = require('groq-sdk');

// Initialize Groq AI
const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Fetch active alerts (only for waiting patients)
app.get('/api/alerts/active', async (req, res) => {
  try {
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select(`
        *,
        patient:patients!inner(id, full_name, status)
      `)
      .eq('patient.status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Flatten structure for frontend
    const formattedAlerts = alerts.map(a => ({
      ...a,
      full_name: a.patient?.full_name
    }));

    res.json(formattedAlerts);
  } catch (error) {
    console.error('Alerts fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;

// ============ TRIAGE LOGIC ============

// Rule-based triage fallback
function computeTriageRule({ age, symptoms = [], vitals = {}, weights }) {
  let score = 0;
  let fired = [];

  if (symptoms.includes('chest_pain')) {
    score += weights.chest_pain;
    fired.push('chest_pain');
  }
  if (symptoms.includes('shortness_of_breath')) {
    score += weights.shortness_of_breath;
    fired.push('shortness_of_breath');
  }
  if (symptoms.includes('altered_consciousness')) {
    score += weights.altered_consciousness;
    fired.push('altered_consciousness');
  }
  if (vitals.spo2 && vitals.spo2 < 92) {
    score += weights.spo2_low;
    fired.push('spo2_low');
  }
  if (vitals.sbp && vitals.sbp < 90) {
    score += weights.sbp_low;
    fired.push('sbp_low');
  }
  if (vitals.hr && vitals.hr > 130) {
    score += weights.hr_high;
    fired.push('hr_high');
  }
  if (age >= 65) {
    score += weights.age_over_65;
    fired.push('age_over_65');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, fired, method: 'rules' };
}

// Call ML service
async function callMLService(patient) {
  try {
    const payload = {
      age: patient.age,
      hr: patient.vitals?.hr || 80,
      sbp: patient.vitals?.sbp || 120,
      spo2: patient.vitals?.spo2 || 98,
      symptoms: patient.symptoms || [],
      comorbid: patient.meta?.comorbid || 0
    };

    const resp = await axios.post(`${ML_SERVICE_URL}/predict`, payload, {
      timeout: 3000
    });

    return {
      method: 'ml',
      score: resp.data.triage_score,
      probability: resp.data.probability,
      features_used: resp.data.features_used
    };
  } catch (error) {
    console.error('ML service error:', error.message);
    return null;
  }
}

// Get triage weights from admin settings
async function getTriageWeights() {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'triage_weights')
    .single();

  if (error || !data) {
    // Default weights if not in DB
    return {
      chest_pain: 30,
      shortness_of_breath: 25,
      spo2_low: 30,
      sbp_low: 20,
      hr_high: 15,
      altered_consciousness: 40,
      age_over_65: 8,
      comorbid: 10
    };
  }

  return data.value;
}

// Compute triage for a patient
async function computeTriage(patient) {
  const weights = await getTriageWeights();

  // Try ML first
  const mlResult = await callMLService(patient);

  if (mlResult) {
    return {
      score: mlResult.score,
      method: 'ml',
      explanation: {
        probability: mlResult.probability,
        features_used: mlResult.features_used
      }
    };
  }

  // Fallback to rules
  const ruleResult = computeTriageRule({
    age: patient.age,
    symptoms: patient.symptoms || [],
    vitals: patient.vitals || {},
    weights
  });

  return {
    score: ruleResult.score,
    method: 'rules',
    explanation: {
      rules_fired: ruleResult.fired,
      weights_applied: weights
    }
  };
}

// AI-powered custom symptom analyzer (using Groq)
async function analyzeCustomSymptoms(customSymptomText) {
  if (!groq || !customSymptomText || customSymptomText.trim().length === 0) {
    return { urgency_boost: 0, severity: 'unknown', explanation: 'No AI analysis available' };
  }

  try {
    const prompt = `You are a medical triage assistant. Analyze the following patient symptom description and determine its urgency level.

Symptom: "${customSymptomText}"

Provide a JSON response with:
1. "severity": one of ["critical", "high", "moderate", "low", "minimal"]
2. "urgency_boost": a number between 0-40 to add to triage score (0=not urgent, 40=extremely urgent)
3. "explanation": brief clinical reasoning (max 50 words)
4. "recommended_action": what staff should do

Respond ONLY with valid JSON.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile', // Updated to latest stable model
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const choice = chatCompletion.choices[0];
    const jsonText = choice.message?.content || '{}';
    
    // Parse JSON
    const analysis = JSON.parse(jsonText);
    
    return {
      urgency_boost: Math.min(40, Math.max(0, parseInt(analysis.urgency_boost || 0))),
      severity: analysis.severity || 'unknown',
      explanation: analysis.explanation || 'AI analysis completed',
      recommended_action: analysis.recommended_action || 'Standard triage protocol'
    };
  } catch (error) {
    console.error('Groq AI analysis error:', error.message);
    return { urgency_boost: 0, severity: 'unknown', explanation: 'AI analysis failed' };
  }
}

// Critical vitals threshold checker
function checkCriticalVitals(vitals, age) {
  const alerts = [];
  
  // Dangerously low oxygen - immediate intervention needed
  if (vitals.spo2 && vitals.spo2 < 90) {
    alerts.push({
      type: 'critical_vitals',
      severity: 'critical',
      parameter: 'SpO2',
      value: vitals.spo2,
      threshold: 90,
      message: `Critical: SpO2 at ${vitals.spo2}% - Oxygen therapy needed immediately`,
      action: 'Administer supplemental oxygen and assess respiratory status'
    });
  } else if (vitals.spo2 && vitals.spo2 < 94) {
    alerts.push({
      type: 'warning_vitals',
      severity: 'high',
      parameter: 'SpO2',
      value: vitals.spo2,
      threshold: 94,
      message: `⚠️ Low SpO2: ${vitals.spo2}% - Monitor closely`,
      action: 'Consider supplemental oxygen, monitor continuously'
    });
  }
  
  // Dangerous heart rate
  if (vitals.hr) {
    if (vitals.hr > 140) {
      alerts.push({
        type: 'critical_vitals',
        severity: 'critical',
        parameter: 'Heart Rate',
        value: vitals.hr,
        threshold: 140,
        message: `Critical: Severe tachycardia (${vitals.hr} BPM) - Immediate evaluation required`,
        action: 'Obtain ECG, assess for cardiac causes, consider cardioversion if unstable'
      });
    } else if (vitals.hr < 50) {
      alerts.push({
        type: 'critical_vitals',
        severity: 'critical',
        parameter: 'Heart Rate',
        value: vitals.hr,
        threshold: 50,
        message: `Critical: Severe bradycardia (${vitals.hr} BPM) - Assess immediately`,
        action: 'Check for hemodynamic compromise, consider atropine/pacing'
      });
    } else if (vitals.hr > 120) {
      alerts.push({
        type: 'warning_vitals',
        severity: 'medium',
        parameter: 'Heart Rate',
        value: vitals.hr,
        message: `⚠️ Elevated heart rate: ${vitals.hr} BPM`,
        action: 'Assess for pain, anxiety, infection, or cardiac causes'
      });
    }
  }
  
  // Blood pressure thresholds
  if (vitals.sbp) {
    if (vitals.sbp > 180) {
      alerts.push({
        type: 'critical_vitals',
        severity: 'critical',
        parameter: 'Systolic BP',
        value: vitals.sbp,
        threshold: 180,
        message: `Critical: Hypertensive crisis (${vitals.sbp} mmHg) - Risk of stroke/organ damage`,
        action: 'Urgent BP reduction, CT brain if symptoms, consider ICU'
      });
    } else if (vitals.sbp < 90) {
      alerts.push({
        type: 'critical_vitals',
        severity: 'critical',
        parameter: 'Systolic BP',
        value: vitals.sbp,
        threshold: 90,
        message: `Critical: Hypotension (${vitals.sbp} mmHg) - Possible shock`,
        action: 'IV access, fluid resuscitation, assess for bleeding/sepsis'
      });
    } else if (vitals.sbp > 160) {
      alerts.push({
        type: 'warning_vitals',
        severity: 'medium',
        parameter: 'Systolic BP',
        value: vitals.sbp,
        message: `⚠️ Elevated BP: ${vitals.sbp} mmHg`,
        action: 'Monitor BP, check for end-organ damage if symptomatic'
      });
    }
  }
  
  return alerts;
}

// Detect deterioration from vitals history
function detectDeterioration(vitalsHistory) {
  if (!vitalsHistory || vitalsHistory.length < 2) return null;
  
  const latest = vitalsHistory[vitalsHistory.length - 1];
  const previous = vitalsHistory[vitalsHistory.length - 2];
  const alerts = [];
  
  // Calculate time difference
  const timeDiff = new Date(latest.timestamp) - new Date(previous.timestamp);
  const minutesDiff = Math.round(timeDiff / 60000);
  
  // Heart rate trending up significantly
  if (latest.vitals.hr && previous.vitals.hr) {
    const hrChange = latest.vitals.hr - previous.vitals.hr;
    if (hrChange > 20) {
      alerts.push({
        type: 'deteriorating',
        severity: 'high',
        parameter: 'Heart Rate',
        message: `⚠️ Rapid HR increase: ${previous.vitals.hr} → ${latest.vitals.hr} BPM (+${hrChange}) in ${minutesDiff} min`,
        action: 'Reassess patient immediately, check for pain/distress/arrhythmia',
        trend: 'worsening',
        change: hrChange
      });
    }
  }
  
  // Oxygen saturation dropping
  if (latest.vitals.spo2 && previous.vitals.spo2) {
    const spo2Change = previous.vitals.spo2 - latest.vitals.spo2;
    if (spo2Change > 3) {
      alerts.push({
        type: 'deteriorating',
        severity: 'critical',
        parameter: 'SpO2',
        message: `🚨 O2 saturation dropping: ${previous.vitals.spo2}% → ${latest.vitals.spo2}% (-${spo2Change}%) in ${minutesDiff} min`,
        action: 'Apply/increase oxygen immediately, assess airway and breathing',
        trend: 'worsening',
        change: -spo2Change
      });
    }
  }
  
  // Blood pressure changes
  if (latest.vitals.sbp && previous.vitals.sbp) {
    const sbpChange = latest.vitals.sbp - previous.vitals.sbp;
    
    // Rising BP rapidly
    if (sbpChange > 30) {
      alerts.push({
        type: 'deteriorating',
        severity: 'medium',
        parameter: 'Blood Pressure',
        message: `⚠️ BP rising rapidly: ${previous.vitals.sbp} → ${latest.vitals.sbp} mmHg (+${sbpChange}) in ${minutesDiff} min`,
        action: 'Re-assess for pain, anxiety, or hypertensive emergency',
        trend: 'worsening',
        change: sbpChange
      });
    }
    
    // Dropping BP - shock warning
    if (sbpChange < -20) {
      alerts.push({
        type: 'deteriorating',
        severity: 'critical',
        parameter: 'Blood Pressure',
        message: `🚨 BP dropping: ${previous.vitals.sbp} → ${latest.vitals.sbp} mmHg (${sbpChange}) in ${minutesDiff} min`,
        action: 'Assess for shock: IV access, fluids, check for bleeding',
        trend: 'worsening',
        change: sbpChange
      });
    }
  }
  
  return alerts.length > 0 ? alerts : null;
}


// ============ API ENDPOINTS ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Check-in endpoint
app.post('/api/checkin', async (req, res) => {
  try {
    const { full_name, age, sex, symptoms, vitals, comorbid, custom_symptoms } = req.body;

    // Analyze custom symptoms with AI if provided
    let aiAnalysis = null;
    let urgencyBoost = 0;
    
    if (custom_symptoms && custom_symptoms.trim().length > 0) {
      aiAnalysis = await analyzeCustomSymptoms(custom_symptoms);
      urgencyBoost = aiAnalysis.urgency_boost;
      console.log(`AI Analysis: ${aiAnalysis.severity} - Boost: +${urgencyBoost}`);
    }

    // Compute triage
    const patientData = { age, symptoms, vitals, meta: { comorbid } };
    const triageResult = await computeTriage(patientData);
    
    // Apply AI urgency boost
    const finalScore = Math.min(100, triageResult.score + urgencyBoost);

    // Check for critical vitals at check-in
    const criticalVitalsAlerts = checkCriticalVitals(vitals, age);
    const hasCriticalVitals = criticalVitalsAlerts.some(alert => alert.severity === 'critical');
    
    // Store vitals history for tracking
    const vitalsHistory = [{
      timestamp: new Date().toISOString(),
      vitals: vitals,
      taken_by: 'System (Check-in)'
    }];

    // Insert patient
    const { data: patient, error: insertError } = await supabase
      .from('patients')
      .insert({
        full_name,
        age,
        sex,
        symptoms,
        vitals,
        triage_score: finalScore,
        triage_method: aiAnalysis ? `${triageResult.method}+ai` : triageResult.method,
        status: 'waiting',
        meta: { 
          comorbid,
          custom_symptoms,
          ai_analysis: aiAnalysis,
          vitals_history: vitalsHistory,
          critical_vitals_alerts: criticalVitalsAlerts
        }
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Save audit with AI analysis
    await supabase.from('triage_audit').insert({
      patient_id: patient.id,
      method: patient.triage_method,
      score: finalScore,
      explanation: {
        ...triageResult.explanation,
        ai_analysis: aiAnalysis,
        base_score: triageResult.score,
        urgency_boost: urgencyBoost
      }
    });

    // Check if critical (score >= 85)
    if (finalScore >= 85) {
      const { data: alert } = await supabase.from('alerts').insert({
        patient_id: patient.id,
        alert_type: 'critical_patient',
        payload: {
          triage_score: finalScore,
          symptoms,
          custom_symptoms,
          vitals,
          ai_severity: aiAnalysis?.severity
        }
      }).select().single();

      // Emit alert via WebSocket
      io.emit('alert:raised', {
        alert_id: alert?.id,
        patient_id: patient.id,
        full_name: full_name,
        alert_type: 'critical_patient',
        triage_score: finalScore,
        ai_severity: aiAnalysis?.severity,
        timestamp: new Date().toISOString()
      });
    }

    // Raise critical vitals alerts if any
    if (hasCriticalVitals) {
      for (const vitalAlert of criticalVitalsAlerts.filter(a => a.severity === 'critical')) {
        const { data: alert } = await supabase.from('alerts').insert({
          patient_id: patient.id,
          alert_type: 'critical_vitals',
          payload: {
            ...vitalAlert,
            full_name: full_name,
            triage_score: finalScore,
            current_vitals: vitals
          }
        }).select().single();

        // Emit alert via WebSocket
        io.emit('alert:raised', {
          alert_id: alert?.id,
          patient_id: patient.id,
          full_name: full_name,
          alert_type: 'critical_vitals',
          vital_alert: vitalAlert,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Emit queue update
    io.emit('queue:update', {
      action: 'patient_added',
      patient_id: patient.id
    });

    res.json({ success: true, patient, ai_analysis: aiAnalysis });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get queue
app.get('/api/queue', async (req, res) => {
  try {
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .eq('status', 'waiting')
      .order('triage_score', { ascending: false })
      .order('arrival_ts', { ascending: true });

    if (error) throw error;

    // Calculate avg wait time
    const now = new Date();
    const waitTimes = patients.map(p => {
      const arrival = new Date(p.arrival_ts);
      return (now - arrival) / 1000; // seconds
    });
    const avg_wait_secs = waitTimes.length > 0
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
      : 0;

    res.json({
      patients,
      stats: {
        total_waiting: patients.length,
        avg_wait_secs: Math.round(avg_wait_secs),
        critical_count: patients.filter(p => p.triage_score >= 85).length
      }
    });
  } catch (error) {
    console.error('Queue fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Vitals Endpoint
app.post('/api/patients/:id/vitals', async (req, res) => {
  try {
    const { id } = req.params;
    const { vitals, notes } = req.body; // Expecting { hr, sbp, spo2 }
    
    // 1. Fetch current patient data
    const { data: patient, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    
    // 2. Prepare history update
    const currentMeta = patient.meta || {};
    const oldHistory = currentMeta.vitals_history || [];
    
    // Create new history entry
    const newEntry = {
      timestamp: new Date().toISOString(),
      vitals: vitals,
      notes: notes || 'Routine recheck',
      taken_by: 'Staff'
    };
    
    const newHistory = [...oldHistory, newEntry];
    
    // 3. Run Checks
    const criticalAlerts = checkCriticalVitals(vitals, patient.age);
    const deteriorationAlerts = detectDeterioration(newHistory);
    
    // 4. Calculate Score Boost based on findings
    let scoreBoost = 0;
    
    // Deterioration boost
    if (deteriorationAlerts && deteriorationAlerts.length > 0) {
      scoreBoost += 15; // +15 for deterioration trend
    }
    
    // Critical vitals boost
    const hasCritical = criticalAlerts.some(a => a.severity === 'critical');
    if (hasCritical) {
      scoreBoost += 25; // +25 for immediate critical vitals
    }
    
    // Cap score at 100
    const newScore = Math.min(100, patient.triage_score + scoreBoost);
    
    // 5. Update Patient record
    const { data: updatedPatient, error: updateError } = await supabase
      .from('patients')
      .update({
        vitals: vitals, // Update current vitals
        triage_score: newScore,
        // Upgrade method tag if boosted
        triage_method: (scoreBoost > 0 && !patient.triage_method.includes('deterioration')) 
          ? `${patient.triage_method}+deterioration` 
          : patient.triage_method,
        meta: {
          ...currentMeta,
          vitals_history: newHistory,
          latest_alerts: [...(criticalAlerts || []), ...(deteriorationAlerts || [])]
        }
      })
      .eq('id', id)
      .select()
      .single();
      
    if (updateError) throw updateError;
    
    // 6. Generate Alerts
    const allAlerts = [...criticalAlerts, ...(deteriorationAlerts || [])];
    
    for (const alertDetails of allAlerts) {
      // Save to DB
      const { data: alert } = await supabase.from('alerts').insert({
        patient_id: id,
        alert_type: alertDetails.type, // 'critical_vitals' or 'deteriorating'
        payload: {
          ...alertDetails,
          new_score: newScore,
          full_name: patient.full_name
        }
      }).select().single();
      
      // Emit realtime socket event
      io.emit('alert:raised', {
        alert_id: alert?.id,
        patient_id: id,
        full_name: patient.full_name,
        alert_type: alertDetails.type,
        details: alertDetails,
        new_score: newScore,
        timestamp: new Date().toISOString()
      });
    }
    
    // 7. Emit Queue Update to refresh UI
    io.emit('queue:update', {
      action: 'vitals_updated',
      patient_id: id,
      new_score: newScore
    });

    res.json({
      success: true,
      patient: updatedPatient,
      alerts: allAlerts,
      score_boost: scoreBoost
    });
    
  } catch (error) {
    console.error('Vitals update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recompute triage for a patient (admin)
app.post('/api/triage/recompute/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;

    // Fetch patient
    const { data: patient, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patient_id)
      .single();

    if (fetchError) throw fetchError;

    // Recompute
    const triageResult = await computeTriage(patient);

    // Update patient
    const { error: updateError } = await supabase
      .from('patients')
      .update({
        triage_score: triageResult.score,
        triage_method: triageResult.method
      })
      .eq('id', patient_id);

    if (updateError) throw updateError;

    // Save audit
    await supabase.from('triage_audit').insert({
      patient_id: patient.id,
      method: triageResult.method,
      score: triageResult.score,
      explanation: triageResult.explanation
    });

    // Emit update
    io.emit('patient:updated', { patient_id });
    io.emit('queue:update', { action: 'triage_recomputed' });

    res.json({ success: true, new_score: triageResult.score });
  } catch (error) {
    console.error('Recompute error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update triage weights (admin)
app.post('/api/admin/weights', async (req, res) => {
  try {
    const { weights } = req.body;

    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        key: 'triage_weights',
        value: weights
      });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Weights update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get audit for a patient
app.get('/api/audit/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;

    const { data: audits, error } = await supabase
      .from('triage_audit')
      .select('*')
      .eq('patient_id', patient_id)
      .order('computed_at', { ascending: false });

    if (error) throw error;

    res.json({ audits });
  } catch (error) {
    console.error('Audit fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current triage weights
app.get('/api/admin/weights', async (req, res) => {
  try {
    const weights = await getTriageWeights();
    res.json({ weights });
  } catch (error) {
    console.error('Weights fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update patient status
app.post('/api/patient/:patient_id/status', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { status } = req.body;

    const { error } = await supabase
      .from('patients')
      .update({ status })
      .eq('id', patient_id);

    if (error) throw error;

    io.emit('patient:updated', { patient_id, status });
    io.emit('queue:update', { action: 'status_changed' });

    res.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ SOCKET.IO ============

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('client:join', (data) => {
    console.log('Client joined:', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ============ SLA WORKER ============

// Check for SLA breaches every 30 seconds
setInterval(async () => {
  try {
    const { data: patients } = await supabase
      .from('patients')
      .select('*')
      .eq('status', 'waiting');

    const now = new Date();
    const SLA_THRESHOLD = 30 * 60 * 1000; // 30 minutes in ms

    for (const patient of patients || []) {
      const waitTime = now - new Date(patient.arrival_ts);
      
      if (waitTime > SLA_THRESHOLD) {
        // Check if alert already exists
        const { data: existingAlert } = await supabase
          .from('alerts')
          .select('id')
          .eq('patient_id', patient.id)
          .eq('alert_type', 'sla_breach')
          .single();

        if (!existingAlert) {
          await supabase.from('alerts').insert({
            patient_id: patient.id,
            alert_type: 'sla_breach',
            payload: {
              wait_time_mins: Math.round(waitTime / 60000),
              triage_score: patient.triage_score
            }
          });

          io.emit('alert:raised', {
            patient_id: patient.id,
            alert_type: 'sla_breach',
            wait_time_mins: Math.round(waitTime / 60000)
          });
        }
      }
    }
  } catch (error) {
    console.error('SLA worker error:', error);
  }
}, 30000);

// ============ START SERVER ============

server.listen(PORT, () => {
  console.log(`\n🚀 HT-1 Triage Backend running on port ${PORT}`);
  console.log(`📊 ML Service URL: ${ML_SERVICE_URL}`);
  console.log(`💾 Supabase URL: ${process.env.SUPABASE_URL}\n`);
});
