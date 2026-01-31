const axios = require('axios');
const { supabase } = require('../config/clients');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

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

async function getTriageWeights() {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'triage_weights')
    .single();

  if (error || !data) {
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

async function computeTriage(patient) {
  const weights = await getTriageWeights();
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

function checkCriticalVitals(vitals, age) {
  const alerts = [];
  
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

function detectDeterioration(vitalsHistory) {
  if (!vitalsHistory || vitalsHistory.length < 2) return null;
  
  const latest = vitalsHistory[vitalsHistory.length - 1];
  const previous = vitalsHistory[vitalsHistory.length - 2];
  const alerts = [];
  
  const timeDiff = new Date(latest.timestamp) - new Date(previous.timestamp);
  const minutesDiff = Math.round(timeDiff / 60000);
  
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
  
  if (latest.vitals.sbp && previous.vitals.sbp) {
    const sbpChange = latest.vitals.sbp - previous.vitals.sbp;
    
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

module.exports = { computeTriage, checkCriticalVitals, detectDeterioration, getTriageWeights };
