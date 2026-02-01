require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');

// Modular Imports
const { supabase } = require('./config/clients');
const { checkCriticalVitals, detectDeterioration, getTriageWeights } = require('./services/mlService');
const { analyzeCustomSymptoms } = require('./services/aiService');

const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL, 
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    if (origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com') || origin.endsWith('.azurewebsites.net')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
};

// Initialize Socket.IO
const io = new Server(server, { cors: corsOptions });

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// ============ API ENDPOINTS ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Fetch active alerts
app.get('/api/alerts/active', async (req, res) => {
  try {
    const { hospital_id } = req.query;

    let query = supabase
      .from('alerts')
      .select('*, patient:patients(id, full_name, status, hospital_id)') 
      // Removed .eq('resolved', false) as column doesn't exist.
      // We assume alerts are ephemeral or "Active" if recently created.
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: alerts, error } = await query;

    if (error) throw error;

    let formattedAlerts = alerts.map(a => ({
      ...a,
      full_name: a.patient?.full_name,
      hospital_id: a.patient?.hospital_id || a.payload?.hospital_id // Fallback to payload for distress signals
    }));

    // Manual Filter for Hospital context
    if (hospital_id) {
       formattedAlerts = formattedAlerts.filter(a => 
          // If linked to a patient, must match hospital
          (a.patient && a.patient.hospital_id == hospital_id) || 
          // OR if it's a distress signal with explicit ID
          (a.alert_type === 'distress_signal' && a.payload?.hospital_id == hospital_id)
       );
    }
    
    res.json(formattedAlerts);


  } catch (error) {
    console.error('Alerts fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check-in endpoint
app.post('/api/checkin', async (req, res) => {
  try {
    const { full_name, age, sex, symptoms, vitals, comorbid, custom_symptoms, hospital_id, injury_score } = req.body;

    // AI Analysis
    let aiAnalysis = null;
    let urgencyBoost = 0;
    
    if (custom_symptoms && custom_symptoms.trim().length > 0) {
      aiAnalysis = await analyzeCustomSymptoms(custom_symptoms);
      urgencyBoost = aiAnalysis.urgency_boost;
    }

    // Compute triage (Include Injury Score)
    const patientData = { age, symptoms, vitals, injury_score: injury_score || 0, meta: { comorbid } };
    const triageResult = await computeTriage(patientData);
    
    const finalScore = Math.min(100, triageResult.score + urgencyBoost);

    // Critical Vitals Check
    const criticalVitalsAlerts = checkCriticalVitals(vitals, age);
    const hasCriticalVitals = criticalVitalsAlerts.some(alert => alert.severity === 'critical');
    
    const vitalsHistory = [{
      timestamp: new Date().toISOString(),
      vitals: vitals,
      taken_by: 'System (Check-in)'
    }];

    // Insert patient
    const { data: patient, error: insertError } = await supabase
      .from('patients')
      .insert({
        hospital_id: hospital_id || 1, // Default to General Hospital if missing
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
          injury_score: injury_score || 0, // Persist raw injury score
          custom_symptoms,
          ai_analysis: aiAnalysis,
          vitals_history: vitalsHistory,
          critical_vitals_alerts: criticalVitalsAlerts
        }
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Audit Log
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

    // Alert: Critical Patient
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

    // Alert: Critical Vitals
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

    io.emit('queue:update', { action: 'patient_added', patient_id: patient.id });
    res.json({ success: true, patient, ai_analysis: aiAnalysis });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Queue (Paginated, filtered by status)
app.get('/api/queue', async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'waiting', hospital_id } = req.query;
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;

    // 1. Fetch Summary for Stats
    let statsQuery = supabase
      .from('patients')
      .select('triage_score, arrival_ts')
      .eq('status', status);
      
    if (hospital_id) statsQuery = statsQuery.eq('hospital_id', hospital_id);
    
    const { data: allMatching, error: statsError } = await statsQuery;
      
    if (statsError) throw statsError;

    const now = new Date();
    const waitTimes = allMatching.map(p => (now - new Date(p.arrival_ts)) / 1000);
    const avg_wait_secs = waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0;
    const critical_count = allMatching.filter(p => p.triage_score >= 85).length;
    const total_count = allMatching.length;

    // 2. Fetch Paginated Rows
    // 2. Fetch Paginated Rows
    let queueQuery = supabase
      .from('patients')
      .select('*')
      .eq('status', status);
      
    if (hospital_id) queueQuery = queueQuery.eq('hospital_id', hospital_id);

    const { data: patients, error } = await queueQuery
      .order('triage_score', { ascending: false })
      .order('arrival_ts', { ascending: true })
      .range(from, to);

    if (error) throw error;

    res.json({
      patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total_count,
        total_pages: Math.ceil(total_count / parseInt(limit))
      },
      stats: {
        total_waiting: total_count, // Keeping key name for compatibility, but represents matching count
        avg_wait_secs: Math.round(avg_wait_secs),
        critical_count
      }
    });
  } catch (error) {
    console.error('Queue fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Patient Directory
app.get('/api/patients', async (req, res) => {
  try {
    const { search, page = 1, limit = 10, hospital_id } = req.query;
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;

    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .order('arrival_ts', { ascending: false })
      .range(from, to);

    if (search) {
      query = query.ilike('full_name', `%${search}%`);
    }
    
    if (hospital_id) {
       query = query.eq('hospital_id', hospital_id);
    }

    const { data: patients, count, error } = await query;
    if (error) throw error;

    res.json({
      patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        total_pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Patients fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { hospital_id } = req.query; 

    let query = supabase
      .from('patients')
      .select('triage_score, symptoms, arrival_ts, status')
      .gte('arrival_ts', yesterday.toISOString());
      
    if (hospital_id) query = query.eq('hospital_id', hospital_id);

    const { data: patients, error } = await query;

    if (error) throw error;

    const acuity = { critical: 0, high: 0, medium: 0, low: 0 };
    patients.forEach(p => {
      if (p.triage_score >= 85) acuity.critical++;
      else if (p.triage_score >= 50) acuity.high++;
      else if (p.triage_score >= 25) acuity.medium++;
      else acuity.low++;
    });

    const symptomMap = {};
    patients.forEach(p => {
      if (Array.isArray(p.symptoms)) {
        p.symptoms.forEach(s => {
          const clean = s.replace(/_/g, ' ');
          symptomMap[clean] = (symptomMap[clean] || 0) + 1;
        });
      }
    });
    const topSymptoms = Object.entries(symptomMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      total_24h: patients.length,
      acuity,
      top_symptoms: topSymptoms,
      status_breakdown: {
        waiting: patients.filter(p => p.status === 'waiting').length,
        in_treatment: patients.filter(p => p.status === 'in_treatment').length,
        completed: patients.filter(p => p.status === 'completed').length
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Vitals (Recheck)
app.post('/api/patients/:id/vitals', async (req, res) => {
  try {
    const { id } = req.params;
    const { vitals, notes } = req.body;
    
    const { data: patient, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    
    const currentMeta = patient.meta || {};
    const oldHistory = currentMeta.vitals_history || [];
    
    const newEntry = {
      timestamp: new Date().toISOString(),
      vitals: vitals,
      notes: notes || 'Routine recheck',
      taken_by: 'Staff'
    };
    
    const newHistory = [...oldHistory, newEntry];
    
    // Checks
    const criticalAlerts = checkCriticalVitals(vitals, patient.age);
    const deteriorationAlerts = detectDeterioration(newHistory);
    
    let scoreBoost = 0;
    if (deteriorationAlerts && deteriorationAlerts.length > 0) scoreBoost += 15;
    if (criticalAlerts.some(a => a.severity === 'critical')) scoreBoost += 25;
    
    const newScore = Math.min(100, patient.triage_score + scoreBoost);
    
    const { data: updatedPatient, error: updateError } = await supabase
      .from('patients')
      .update({
        vitals: vitals,
        triage_score: newScore,
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
    
    const allAlerts = [...criticalAlerts, ...(deteriorationAlerts || [])];
    
    for (const alertDetails of allAlerts) {
      const { data: alert } = await supabase.from('alerts').insert({
        patient_id: id,
        alert_type: alertDetails.type,
        payload: {
          ...alertDetails,
          new_score: newScore,
          full_name: patient.full_name
        }
      }).select().single();
      
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
    
    io.emit('queue:update', { action: 'vitals_updated', patient_id: id, new_score: newScore });

    res.json({ success: true, patient: updatedPatient, alerts: allAlerts, score_boost: scoreBoost });
  } catch (error) {
    console.error('Vitals update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update patient status
app.post('/api/patient/:patient_id/status', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { status } = req.body;
    const { error } = await supabase.from('patients').update({ status }).eq('id', patient_id);
    if (error) throw error;
    io.emit('patient:updated', { patient_id, status });
    io.emit('queue:update', { action: 'status_changed' });
    res.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recompute triage (Admin/Audit)
app.post('/api/triage/recompute/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params; 
    const { data: patient } = await supabase.from('patients').select('*').eq('id', patient_id).single();
    if (!patient) throw new Error('Patient not found');
    const triageResult = await computeTriage(patient);
    await supabase.from('patients').update({ triage_score: triageResult.score, triage_method: triageResult.method }).eq('id', patient_id);
    await supabase.from('triage_audit').insert({ patient_id, method: triageResult.method, score: triageResult.score, explanation: triageResult.explanation });
    io.emit('patient:updated', { patient_id });
    io.emit('queue:update', { action: 'triage_recomputed' });
    res.json({ success: true, new_score: triageResult.score });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Audit
app.get('/api/audit/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { data: audits } = await supabase.from('triage_audit').select('*').eq('patient_id', patient_id).order('computed_at', { ascending: false });
    res.json({ audits });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Weights
app.get('/api/admin/weights', async (req, res) => {
  try {
    const weights = await getTriageWeights();
    res.json({ weights });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CITY & NETWORK FEATURES ============

// Get City Network Status (Hospital Load)
app.get('/api/network', async (req, res) => {
  try {
    const { data: hospitals, error } = await supabase
      .from('hospitals')
      .select('*')
      .order('distance_km', { ascending: true });
      
    if (error) throw error;
    res.json(hospitals);
  } catch (error) {
    console.error('Network fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simulate Distress Signal (CCTV/Visual AI)
app.post('/api/distress', async (req, res) => {
  try {
    const { zone, signal_type, confidence, patient_id, hospital_id } = req.body;
    
    // Create a special alert for distress
    const { data: alert, error } = await supabase.from('alerts').insert({
       patient_id: patient_id || null, 
       alert_type: 'distress_signal',
       payload: {
         zone: zone || 'Waiting Room A',
         signal: signal_type || 'collapse',
         confidence: confidence || 0.92,
         message: `Visual Distress Detected: ${signal_type} in ${zone}`,
         detected_at: new Date().toISOString(),
         hospital_id: hospital_id || 1 
       }
    }).select().single();
    
    if (error) throw error;
    
    // Broadcast immediately to all dashboards
    io.emit('alert:raised', {
      alert_id: alert.id,
      alert_type: 'distress_signal',
      zone: zone || 'Waiting Room A',
      signal: signal_type || 'collapse',
      message: `Visual Distress: ${signal_type} detected in ${zone || 'Waiting Room A'}`,
      timestamp: new Date().toISOString(),
      hospital_id: hospital_id || 1
    });
    
    res.json({ success: true, alert_id: alert.id });
  } catch (error) {
    console.error('Distress signal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Daily Volume Analytics
app.get('/api/analytics/daily', async (req, res) => {
  try {
    const { hospital_id } = req.query;

    let query = supabase
      .from('patients')
      .select('arrival_ts, triage_score')
      .order('arrival_ts', { ascending: true });
      
    if (hospital_id) query = query.eq('hospital_id', hospital_id);

    const { data, error } = await query;

    if (error) throw error;

    const dailyMap = {};
    
    data.forEach(p => {
      const dateObj = new Date(p.arrival_ts);
      const date = dateObj.toLocaleDateString('en-CA'); 
      
      if (!dailyMap[date]) {
        dailyMap[date] = { 
          date, 
          full_date: dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          weekday: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
          total: 0, 
          critical: 0, 
          high: 0 
        };
      }
      
      dailyMap[date].total++;
      if (p.triage_score >= 85) dailyMap[date].critical++;
      else if (p.triage_score >= 50) dailyMap[date].high++;
    });

    const result = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    res.json(result);
  } catch (error) {
    console.error('Daily analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Compute Triage (Rule Based + Injury Aware)
// Helper: Compute Triage (ML First -> Rule Fallback)
async function computeTriage(patient) {
  try {
    // 1. Try ML Service
    const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/predict`, {
      age: patient.age,
      hr: patient.vitals.hr || 80,
      sbp: patient.vitals.sbp || 120,
      spo2: patient.vitals.spo2 || 98,
      temp: patient.vitals.temp || 37.0,
      rr: patient.vitals.rr || 16,
      symptoms: patient.symptoms,
      comorbid: patient.meta.comorbid || 0,
      injury_score: patient.injury_score || 0
    });
    
    let score = mlResponse.data.triage_score;
    let method = 'ml';
    
    // Safety Net: Even if ML says low, if injury is MASSIVE, force high score.
    // The ML model is trained on this, but let's be safe.
    if (patient.injury_score > 80 && score < 70) {
        score = 85; 
        method = 'ml+injury_override';
    }

    return { score, method, explanation: mlResponse.data.features_used };

  } catch (error) {
    console.error('ML Service unavailable, using rule fallback:', error.message);
    
    // 2. Fallback Rules
    let score = 30;
    let method = 'rule-fallback';

    if (patient.injury_score > 50) { score += 40; method = 'rule-injury-critical'; }
    else if (patient.injury_score > 20) { score += 20; method = 'rule-injury-moderate'; }

    if (patient.symptoms.includes('chest_pain')) score += 40;
    if (patient.symptoms.includes('shortness_of_breath')) score += 30;
    if (patient.age > 65) score += 10;
    
    if (patient.vitals.spo2 && patient.vitals.spo2 < 90) score += 25;
    if (patient.vitals.sbp && (patient.vitals.sbp > 180 || patient.vitals.sbp < 90)) score += 20;
    
    return { score: Math.min(99, score), method };
  }
}

// ============ REFERRAL ENDPOINTS (MULTI-HOSPITAL) ============

// Create Referral (Send Patient)
app.post('/api/referrals', async (req, res) => {
  try {
    const { patient_id, from_hospital_id, to_hospital_id, notes, priority } = req.body;
    
    // 1. Create Referral Record
    const { data: referral, error } = await supabase.from('referrals').insert({
      patient_id, from_hospital_id, to_hospital_id, notes, priority, status: 'pending'
    }).select('*, patient:patients(*)').single();
    
    if (error) throw error;
    
    // 2. Update Patient Status visually (optional, or just add a flag)
    await supabase.from('patients').update({ 
      redirect_recommended: true, 
      redirect_hospital_id: to_hospital_id 
    }).eq('id', patient_id);

    // 3. AUTO-RESOLVE ALERTS FOR THIS PATIENT
    // Delete them because they are no longer relevant for the Sender
    await supabase.from('alerts')
      .delete()
      .eq('patient_id', patient_id);
    
    // 4. Create "Incoming Referral" Alert for Receiver
    await supabase.from('alerts').insert({
       patient_id: patient_id,
       alert_type: 'incoming_referral',
       payload: {
         hospital_id: to_hospital_id, // TARGET HOSPITAL
         message: `Incoming Referral: ${priority} Priority`,
         from_hospital_id
       }
    });

    // 5. Broadcast Updates
    io.emit('referral:incoming', { to_hospital_id, referral });
    io.emit('queue:update', { hospital_id: from_hospital_id });
    io.emit('alert:created', { hospital_id: from_hospital_id }); // Refresh Sender
    io.emit('alert:created', { hospital_id: to_hospital_id });   // Refresh Receiver
    
    res.json({ success: true, referral });
  } catch (error) {
    console.error('Referral creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Pending Referrals (For Receiver)
app.get('/api/referrals/pending', async (req, res) => {
  try {
    const { hospital_id } = req.query;
    if (!hospital_id) throw new Error("hospital_id required");
    
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('*, patient:patients(*), from_hospital:hospitals!referrals_from_hospital_id_fkey(name)')
      .eq('to_hospital_id', hospital_id)
      .eq('status', 'pending');
      
    if (error) throw error;
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept Referral
app.post('/api/referrals/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Get Referral Data
    const { data: referral } = await supabase.from('referrals').select('*').eq('id', id).single();
    if (!referral) throw new Error("Referral not found");
    
    // 2. Update Referral Status
    await supabase.from('referrals').update({ status: 'accepted' }).eq('id', id);
    
    // 3. Move Patient (The Magic)
    // We update their hospital_id to the new hospital and ensure status is 'waiting'
    const { data: patient } = await supabase.from('patients')
      .update({ 
        hospital_id: referral.to_hospital_id,
        status: 'waiting',
        redirect_recommended: false,
        redirect_hospital_id: null
      })
      .eq('id', referral.patient_id)
      .select().single();
      
    // 4. Emit Events
    // To Receiver (Add to queue)
    io.emit('queue:update', { action: 'patient_transferred_in', hospital_id: referral.to_hospital_id });
    // To Sender (Remove from queue)
    io.emit('queue:update', { action: 'patient_transferred_out', hospital_id: referral.from_hospital_id });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Referral accept error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// SLA Worker
setInterval(async () => {
  try {
    const { data: patients } = await supabase.from('patients').select('*').eq('status', 'waiting');
    const now = new Date();
    const SLA_THRESHOLD = 30 * 60 * 1000; 

    for (const patient of patients || []) {
      const waitTime = now - new Date(patient.arrival_ts);
      if (waitTime > SLA_THRESHOLD) {
        const { data: existing } = await supabase.from('alerts').select('id').eq('patient_id', patient.id).eq('alert_type', 'sla_breach').single();
        if (!existing) {
          await supabase.from('alerts').insert({
            patient_id: patient.id, alert_type: 'sla_breach',
            payload: { wait_time_mins: Math.round(waitTime / 60000), triage_score: patient.triage_score }
          });
          io.emit('alert:raised', { patient_id: patient.id, alert_type: 'sla_breach', wait_time_mins: Math.round(waitTime / 60000) });
        }
      }
    }
  } catch (error) {
    console.error('SLA worker error:', error.message);
  }
}, 30000);

// Listen
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 HT-1 Triage Backend running on port ${PORT}`);
  console.log(`📊 ML Service URL: ${process.env.ML_SERVICE_URL || 'http://localhost:8000'}`);
});
