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

// ============ API ENDPOINTS ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Check-in endpoint
app.post('/api/checkin', async (req, res) => {
  try {
    const { device_patient_id, age, sex, symptoms, vitals, comorbid, custom_symptoms } = req.body;

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

    // Insert patient
    const { data: patient, error: insertError } = await supabase
      .from('patients')
      .insert({
        device_patient_id,
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
          ai_analysis: aiAnalysis
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
        alert_type: 'critical_patient',
        triage_score: finalScore,
        ai_severity: aiAnalysis?.severity,
        timestamp: new Date().toISOString()
      });
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
