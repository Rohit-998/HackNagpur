# 🔷 Azure Deployment Quick Checklist

Deploy HT-1 to Azure in under 45 minutes!

---

## ✅ Pre-Deployment

### Azure Account
- [ ] Azure account created (Free tier or Student with $100 credit)
- [ ] Can access [portal.azure.com](https://portal.azure.com)

### Code & Services
- [ ] Code pushed to GitHub ✅
- [ ] Supabase database running ✅  
- [ ] Groq API key obtained ✅

---

## 🔬 Step 1: ML Service (`hackngp`) - 15 min

You already have this app! Just configure it:

- [ ] Open [portal.azure.com](https://portal.azure.com)
- [ ] Navigate to `hackngp` App Service
- [ ] **Configuration** → **General Settings**:
  - [ ] Runtime: Python 3.14 ✅
  - [ ] Startup Command: 
    ```
    python -m pip install -r requirements.txt && python generate_and_train.py && python -m uvicorn ml_service:app --host 0.0.0.0 --port 8000
    ```
- [ ] **Deployment Center**:
  - [ ] Source: GitHub
  - [ ] Repo: HackNagpur
  - [ ] Branch: main
  - [ ] Root: `/ml`
  - [ ] Save
- [ ] Wait for deployment (~5 min)
- [ ] Test: `curl https://hackngp.azurewebsites.net/health`
- [ ] Copy URL: `________________________________`

---

## 🔧 Step 2: Backend App Service - 15 min

- [ ] Azure Portal → **Create resource** → **Web App**
- [ ] Configure:
  - [ ] Name: `ht1-backend` (or unique name)
  - [ ] Runtime: Node 18 LTS
  - [ ] Region: Canada Central
  - [ ] Pricing: **Free F1**
  - [ ] Create
- [ ] **Deployment Center**:
  - [ ] Source: GitHub
  - [ ] Repo: HackNagpur
  - [ ] Branch: main
  - [ ] Root: `/backend`
  - [ ] Save
- [ ] **Configuration** → **Application Settings** → Add:
  ```
  SUPABASE_URL=https://fcsjbmmdnipacbmokeun.supabase.co
  SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  GROQ_API_KEY=gsk_f5s46j5UkdDIe7b3k8hAWGdyb3FY...
  ML_SERVICE_URL=https://hackngp.azurewebsites.net
  NODE_ENV=production
  PORT=8080
  FRONTEND_URL=(will fill after Step 3)
  WEBSITES_PORT=8080
  ```
- [ ] Save
- [ ] Wait for deployment
- [ ] Test: `curl https://YOUR-BACKEND.azurewebsites.net/api/health`
- [ ] Copy URL: `________________________________`

---

## 🎨 Step 3: Frontend (Vercel) - 10 min

- [ ] Go to [vercel.com](https://vercel.com)
- [ ] **New Project** → Import `HackNagpur`
- [ ] Configure:
  - [ ] Framework: Next.js ✅
  - [ ] Root: `frontend`
- [ ] **Environment Variables**:
  ```
  NEXT_PUBLIC_API_URL=https://YOUR-BACKEND.azurewebsites.net
  ```
- [ ] Deploy
- [ ] Wait (~3 min)
- [ ] Copy URL: `________________________________`

---

## 🔄 Step 4: Update Backend with Frontend URL

- [ ] Azure Portal → Backend App Service
- [ ] **Configuration** → **Application Settings**
- [ ] Update `FRONTEND_URL` with Vercel URL
- [ ] Save (auto-redeploys)

---

## 🧪 Testing

### ML Service
```bash
curl https://hackngp.azurewebsites.net/health
```
- [ ] Returns: `{"status": "ok"}`

### Backend
```bash
curl https://YOUR-BACKEND.azurewebsites.net/api/health
```
- [ ] Returns: `{"status": "healthy", ...}`

### Frontend
- [ ] Open Vercel URL in browser
- [ ] Landing page loads
- [ ] Check-in page works
- [ ] Submit test patient
- [ ] Dashboard shows patient
- [ ] Admin panel loads

---

## 📝 Your Azure URLs

```
ML Service:  https://hackngp.azurewebsites.net
Backend:     https://________________________________
Frontend:    https://________________________________
Database:    https://fcsjbmmdnipacbmokeun.supabase.co
```

---

## 🐛 Quick Troubleshooting

### App shows "Your web app is running and waiting"
1. Check Deployment Center → Logs
2. Verify root directory is correct
3. Check GitHub Actions succeeded

### "Application Error"
1. Log Stream → Check errors
2. Verify environment variables
3. Check startup command

### Slow first load
- Free tier sleeps after 20 min
- First request takes 30-60s (normal!)

---

## ⏱️ Time Estimate

- ML Service: 15 min
- Backend: 15 min  
- Frontend: 10 min
- Testing: 5 min

**Total: ~45 minutes** ⏱️

---

## 💰 Cost

**Free Tier**: $0
**Azure for Students**: $0 (uses $100 credit)
**Basic Tier** (if you want Always On): $13/month per app

---

## ✅ Deployment Complete!

Your HT-1 is live on Azure + Vercel! 🎉

Check **AZURE_DEPLOYMENT_GUIDE.md** for detailed instructions and troubleshooting.

---

🔷 **Built with Azure App Service**
