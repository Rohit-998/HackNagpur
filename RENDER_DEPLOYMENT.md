# 🚀 Render Deployment Guide for HT-1 Triage Optimizer

## ✅ Why Render?
- ✅ **Simple**: Auto-deploys from GitHub
- ✅ **Free tier**: Generous free tier for all services
- ✅ **Fast**: Automatic builds and deployments
- ✅ **No config files**: Works out of the box

---

## 📋 Services to Deploy

You need to deploy **2 services** on Render:

1. **ML Service** (Python/FastAPI) - `/ml` directory
2. **Backend Service** (Node.js/Express) - `/backend` directory

---

## 🎯 Step-by-Step Deployment

### **1. Create Render Account**

1. Go to: https://render.com
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (easiest!)
4. Authorize Render to access your repositories

---

### **2. Deploy ML Service** (Python)

#### **Create Web Service:**

1. Click **"New +"** → **"Web Service"**
2. Connect your **HackNagpur** repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `ht1-ml-service` (or any name) |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Root Directory** | `ml` ⚠️ **Important!** |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt && python generate_and_train.py` |
| **Start Command** | `uvicorn ml_service:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

4. Click **"Create Web Service"**
5. Wait 3-5 minutes for build and deployment
6. You'll get a URL like: `https://ht1-ml-service.onrender.com`

---

### **3. Deploy Backend Service** (Node.js)

#### **Create Web Service:**

1. Click **"New +"** → **"Web Service"**  
2. Connect your **HackNagpur** repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `ht1-backend` (or any name) |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Root Directory** | `backend` ⚠️ **Important!** |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | `Free` |

4. **Add Environment Variables** (before creating):
   - Click **"Advanced"** → **"Add Environment Variable"**
   - Add these:

```
SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_ROLE=<your_supabase_service_role_key>
SUPABASE_ANON_KEY=<your_supabase_anon_key>
GROQ_API_KEY=<your_groq_api_key>
ML_SERVICE_URL=https://ht1-ml-service.onrender.com  (from step 2)
NODE_ENV=production
```

5. Click **"Create Web Service"**
6. Wait 2-3 minutes for deployment
7. You'll get a URL like: `https://ht1-backend.onrender.com`

---

## 🔄 **4. Enable Keep-Alive Workflow**

The workflow is already created! Just add secrets to GitHub:

1. Go to: `https://github.com/Rohit-998/HackNagpur/settings/secrets/actions`
2. Click **"New repository secret"**
3. Add these secrets:

| Name | Value |
|------|-------|
| `ML_SERVICE_URL` | `https://ht1-ml-service.onrender.com` |
| `BACKEND_URL` | `https://ht1-backend.onrender.com` |

The workflow will automatically ping your services every 10 minutes to keep them alive!

---

## 🌐 **5. Deploy Frontend to Vercel**

1. Go to: https://vercel.com
2. Sign in with GitHub
3. Click **"New Project"**
4. Import **HackNagpur** repository
5. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | `Next.js` |
| **Root Directory** | `frontend` |
| **Build Command** | (auto-detected) |
| **Output Directory** | (auto-detected) |

6. **Add Environment Variable**:
   ```
   NEXT_PUBLIC_API_URL=https://ht1-backend.onrender.com
   ```

7. Click **"Deploy"**
8. Wait 2-3 minutes
9. You'll get a URL like: `https://ht1-triage.vercel.app`

---

## ✅ **6. Update Backend with Frontend URL**

1. Go back to Render → `ht1-backend` service
2. Go to **Environment** tab
3. Add environment variable:
   ```
   FRONTEND_URL=https://ht1-triage.vercel.app
   ```
4. Click **"Save Changes"**

---

## 🧪 **7. Test Everything**

### **Test ML Service:**
```
https://ht1-ml-service.onrender.com/health
```
Should return:
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

### **Test Backend:**
```
https://ht1-backend.onrender.com/health
```
Should return:
```json
{
  "status": "ok"
}
```

### **Test Frontend:**
```
https://ht1-triage.vercel.app
```
Should load the application!

---

## 📊 **Deployment Summary**

| Service | Platform | URL | Status |
|---------|----------|-----|--------|
| **ML Service** | Render | `https://ht1-ml-service.onrender.com` | ⏳ Deploy |
| **Backend** | Render | `https://ht1-backend.onrender.com` | ⏳ Deploy |
| **Frontend** | Vercel | `https://ht1-triage.vercel.app` | ⏳ Deploy |
| **Database** | Supabase | (existing) | ✅ Running |

---

## ⚡ **Important Notes**

### **Render Free Tier Limits:**
- Spins down after 15 minutes of inactivity
- Keep-alive workflow prevents this! ✅
- 750 hours/month free (enough for ~ 1 month continuous uptime)

### **First Request After Sleep:**
- May take 30-60 seconds (cold start)
- Subsequent requests are fast
- Keep-alive prevents most cold starts!

---

## 🐛 **Troubleshooting**

### **ML Service won't start:**
- Check build logs in Render dashboard
- Ensure `Root Directory` is set to `ml`
- Verify `generate_and_train.py` ran successfully

### **Backend can't connect to ML:**
- Check `ML_SERVICE_URL` environment variable
- Test ML service health endpoint
- Check CORS settings

### **Frontend can't connect to Backend:**
- Check `NEXT_PUBLIC_API_URL` in Vercel
- Verify backend CORS includes Vercel URL
- Test backend health endpoint

---

## 🎉 **That's It!**

Your entire stack is deployed:
- ✅ Frontend on Vercel (CDN, instant deploys)
- ✅ Backend on Render (Node.js, auto-scaling)
- ✅ ML Service on Render (Python, trained model)
- ✅ Database on Supabase (PostgreSQL)
- ✅ Keep-alive workflow (prevents sleep)

**Total cost: $0** (using free tiers!)

---

## 📞 **Need Help?**

Check Render docs: https://render.com/docs  
Check Vercel docs: https://vercel.com/docs
