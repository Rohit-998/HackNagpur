require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Modular Imports
const { supabase } = require('./config/clients');
const { computeTriage, checkCriticalVitals, detectDeterioration, getTriageWeights } = require('./services/mlService');
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

// Fetch active alerts
app.get('/api/alerts/active', async (req, res) => {
  try {
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*, patient:patients!inner(id, full_name, status)')
      .eq('patient.status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

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

// Check-in endpoint
app.post('/api/checkin', async (req, res) => {
  try {
    const { full_name, age, sex, symptoms, vitals, comorbid, custom_symptoms } = req.body;

    // AI Analysis
    let aiAnalysis = null;
    let urgencyBoost = 0;
    
    if (custom_symptoms && custom_symptoms.trim().length > 0) {
      aiAnalysis = await analyzeCustomSymptoms(custom_symptoms);
      urgencyBoost = aiAnalysis.urgency_boost;
    }

    // Compute triage
    const patientData = { age, symptoms, vitals, meta: { comorbid } };
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
    const { page = 1, limit = 10, status = 'waiting' } = req.query;
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;

    // 1. Fetch Summary for Stats
    const { data: allMatching, error: statsError } = await supabase
      .from('patients')
      .select('triage_score, arrival_ts')
      .eq('status', status);
      
    if (statsError) throw statsError;

    const now = new Date();
    const waitTimes = allMatching.map(p => (now - new Date(p.arrival_ts)) / 1000);
    const avg_wait_secs = waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0;
    const critical_count = allMatching.filter(p => p.triage_score >= 85).length;
    const total_count = allMatching.length;

    // 2. Fetch Paginated Rows
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .eq('status', status)
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
    const { search, page = 1, limit = 10 } = req.query;
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

    const { data: patients, error } = await supabase
      .from('patients')
      .select('triage_score, symptoms, arrival_ts, status')
      .gte('arrival_ts', yesterday.toISOString());

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
