const { groq } = require('../config/clients');

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
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const choice = chatCompletion.choices[0];
    const jsonText = choice.message?.content || '{}';
    
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

module.exports = { analyzeCustomSymptoms };
