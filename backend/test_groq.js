require('dotenv').config();
const { Groq } = require('groq-sdk');

async function testGroq() {
  console.log("----------------------------------------");
  console.log("🧪 TESTING GROQ API CONNECTION");
  console.log("----------------------------------------");

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.error("❌ ERROR: GROQ_API_KEY is missing from .env file");
    return;
  }

  // Hide key for security but show first few chars to verify logic
  console.log(`🔑 API Key detected: ${key.substring(0, 8)}...`);

  try {
    console.log("📡 Initializing Groq client...");
    const groq = new Groq({ apiKey: key });

    const prompt = `You are a medical triage assistant. Analyze: "Patient has severe chest pain". Respond in JSON.`;
    
    console.log("🚀 Sending request to Groq (llama3-70b-8192)...");
    const startTime = Date.now();

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ SUCCESS! Response received in ${duration}ms`);
    console.log("----------------------------------------");
    console.log("📄 RAW RESPONSE:");
    console.log(chatCompletion.choices[0].message.content);
    console.log("----------------------------------------");

  } catch (error) {
    console.error("❌ FATAL ERROR:");
    console.error(error.message);
    if (error.status === 401) console.error("   Reason: Invalid API Key");
    if (error.status === 404) console.error("   Reason: Model not found");
  }
}

testGroq();
