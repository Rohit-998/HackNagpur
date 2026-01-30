# 🚀 Groq AI Integration Guide

## ⚡ Overview
This project uses **Groq** to provide ultra-fast (sub-second) AI analysis of patient symptoms. We use the **Llama 3 70B** model for high-accuracy medical triage reasoning.

## 🛠️ Configuration

### **1. Environment Variables**
Ensure your `backend/.env` file has:
```env
GROQ_API_KEY=gsk_...
```
*(Get keys from [console.groq.com](https://console.groq.com/keys))*

### **2. Dependencies**
The backend uses the official Groq SDK:
```bash
npm install groq-sdk
```

---

## 🔍 How It Works

1. **Input**: Staff enters free-text symptoms (e.g., "crushing chest pain").
2. **Analysis**: 
   - Backend sends prompt to Groq API.
   - Model (`llama-3.3-70b-versatile`) analyzes severity.
   - Returns structure JSON with `urgency_boost` (0-40).
3. **Output**:
   - Triage Score is updated instantly.
   - UI displays "AI Powered" analysis box.

## 🧪 Testing

Run the included test script to verify connectivity:
```powershell
cd backend
node test_groq.js
```

## 🐛 Troubleshooting

- **401 Unauthorized**: Check your `GROQ_API_KEY`.
- **404 Model Not Found**: Ensure you are using `llama-3.3-70b-versatile` in `server.js`.
- **Rate Limit**: Groq has free tier limits, but they are generous for demos.

---

**Status**: ✅ Fully Operational with Groq
