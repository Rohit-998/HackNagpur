# 🚀 Free Deployment Guide for HT-1 Triage System

This guide will walk you through deploying your entire HT-1 application **completely FREE** using modern cloud platforms.

---

## 📋 Deployment Architecture

```
┌─────────────────────────────────────┐
│   Frontend (Vercel)                 │  ← Free hosting
│   https://ht1-triage.vercel.app     │
└────────────────┬────────────────────┘
                 │ HTTPS
                 ↓
┌─────────────────────────────────────┐
│   Backend (Render.com)              │  ← Free tier
│   https://ht1-backend.onrender.com  │
└─────┬──────────────────┬────────────┘
      │                  │
      │ HTTP             │ SQL
      ↓                  ↓
┌──────────────┐   ┌─────────────────┐
│ ML Service   │   │  Supabase DB    │
│ (Render.com) │   │  (Free tier)    │
└──────────────┘   └─────────────────┘
```

---

## 🎯 Step-by-Step Deployment

### **Prerequisites**

Before you start, make sure you have:
- ✅ GitHub account
- ✅ Your code pushed to a GitHub repository
- ✅ Supabase account with database set up
- ✅ Groq API key (free from groq.com)

---

### **Step 1: Push Code to GitHub**

If you haven't already:

```bash
# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Deployment ready"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/ht1-triage.git
git branch -M main
git push -u origin main
```

---

### **Step 2: Deploy ML Service (Render.com)**

#### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click **New +** → **Web Service**

#### 2.2 Configure ML Service
- **Name**: `ht1-ml-service`
- **Repository**: Select your GitHub repo
- **Root Directory**: `ml`
- **Environment**: `Python 3`
- **Region**: Choose closest to you
- **Branch**: `main`
- **Instance Type**: **Free** ⭐

#### 2.3 Build & Start Commands
```bash
# Build Command
pip install -r requirements.txt && python generate_and_train.py

# Start Command
uvicorn ml_service:app --host 0.0.0.0 --port $PORT
```

#### 2.4 Save the URL
After deployment, note the URL: `https://ht1-ml-service.onrender.com` or `https://ht1-ml-service-abc123.onrender.com`

⚠️ **Important**: Free tier services sleep after 15 min of inactivity. First request may take 30-50 seconds to wake up.

---

### **Step 3: Deploy Backend (Render.com)**

#### 3.1 Create Another Web Service
- Click **New +** → **Web Service**
- **Name**: `ht1-backend`
- **Repository**: Same GitHub repo
- **Root Directory**: `backend`
- **Environment**: `Node`
- **Region**: Same as ML service
- **Branch**: `main`
- **Instance Type**: **Free** ⭐

#### 3.2 Build & Start Commands
```bash
# Build Command
npm install

# Start Command
node server.js
```

#### 3.3 Environment Variables
Click **Environment** → Add these:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here
GROQ_API_KEY=gsk_your_groq_api_key_here
ML_SERVICE_URL=https://ht1-ml-service.onrender.com
PORT=4000
NODE_ENV=production
```

Replace the URLs and keys with your actual values!

#### 3.4 Auto-Deploy
✅ Enable **Auto-Deploy** so it updates when you push to GitHub

#### 3.5 Save Backend URL
Note: `https://ht1-backend.onrender.com` or `https://ht1-backend-xyz789.onrender.com`

---

### **Step 4: Deploy Frontend (Vercel)**

#### 4.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

#### 4.2 Import Project
1. Click **Add New...** → **Project**
2. Import your GitHub repository
3. **Framework Preset**: Next.js ✅ (auto-detected)
4. **Root Directory**: `frontend`
5. **Build Command**: `npm run build` (auto-filled)
6. **Output Directory**: `.next` (auto-filled)

#### 4.3 Environment Variables
Before deploying, add:

```env
NEXT_PUBLIC_API_URL=https://ht1-backend.onrender.com
```

(Use your actual backend URL from Step 3!)

#### 4.4 Deploy
Click **Deploy** 🚀

In 2-3 minutes, you'll get a URL like:
`https://ht1-triage.vercel.app`

---

### **Step 5: Update Frontend CORS Settings**

Your backend needs to allow requests from your Vercel domain.

#### 5.1 Update Backend Code
In `backend/server.js`, find the CORS configuration (around line 14-18) and update:

```javascript
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://ht1-triage.vercel.app", // Add your Vercel URL
      "https://*.vercel.app" // Allow all Vercel preview deployments
    ],
    methods: ["GET", "POST"]
  }
});
```

Also update the Express CORS (around line 22):

```javascript
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://ht1-triage.vercel.app",
    "https://*.vercel.app"
  ]
}));
```

#### 5.2 Push Changes
```bash
git add .
git commit -m "Update CORS for production"
git push
```

Render will auto-deploy the backend! ✅

---

## ✅ Verification Checklist

### Test Each Service

#### 1. ML Service Health Check
```bash
curl https://ht1-ml-service.onrender.com/health
```
Expected: `{"status": "ok", ...}`

#### 2. Backend Health Check
```bash
curl https://ht1-backend.onrender.com/api/health
```
Expected: `{"status": "healthy", "timestamp": "..."}`

#### 3. Frontend
Open `https://ht1-triage.vercel.app` in browser
- ✅ Landing page loads
- ✅ Navigate to Check-in
- ✅ Submit a test patient
- ✅ Check Dashboard

---

## ⚙️ Post-Deployment Setup

### 1. Custom Domain (Optional)
Both Vercel and Render allow custom domains on free tier:
- Vercel: **Settings** → **Domains**
- Render: **Settings** → **Custom Domain**

### 2. Environment Variable Updates
If you need to update env vars:
- **Render**: Dashboard → Service → Environment → Edit
- **Vercel**: Dashboard → Project → Settings → Environment Variables

Changes take effect after redeploy.

---

## 🐛 Common Issues & Solutions

### Issue 1: Backend Can't Connect to ML Service
**Symptoms**: Triage scores fallback to rules-based, console shows "ML service error"

**Solution**:
1. Check ML service is awake (visit the health endpoint)
2. Verify `ML_SERVICE_URL` in backend env vars
3. ML free tier sleeps - first request takes time

### Issue 2: Frontend Can't Connect to Backend
**Symptoms**: Network errors, CORS issues

**Solution**:
1. Check backend URL in frontend env: `NEXT_PUBLIC_API_URL`
2. Verify CORS settings in `backend/server.js`
3. Backend must include frontend domain in CORS whitelist

### Issue 3: Database Connection Fails
**Symptoms**: 500 errors, "Supabase error" in logs

**Solution**:
1. Check Supabase credentials in backend env vars
2. Verify database tables exist (run migrations)
3. Check Supabase dashboard for connection limits

### Issue 4: 503 Service Unavailable
**Symptoms**: Render services return 503

**Solution**:
- Free tier services sleep after 15 min inactivity
- First request wakes them (takes 30-50 seconds)
- Consider upgrading to paid tier for 24/7 uptime

### Issue 5: Build Failures
**Symptoms**: Deployment fails during build

**Solution**:
1. Check build logs in Render/Vercel dashboard
2. Ensure `package.json` has all dependencies
3. Verify Node/Python versions
4. Check root directory is set correctly

---

## 💰 Cost Breakdown (FREE!)

| Service | Platform | Free Tier Limits | Cost |
|---------|----------|------------------|------|
| **Frontend** | Vercel | 100GB bandwidth/month | $0 |
| **Backend** | Render.com | 750 hours/month | $0 |
| **ML Service** | Render.com | 750 hours/month | $0 |
| **Database** | Supabase | 500MB DB, 2GB bandwidth | $0 |
| **AI** | Groq | 1M tokens/month | $0 |

**Total Monthly Cost**: **$0** 🎉

---

## 📊 Monitoring & Logs

### Render.com
- Dashboard → Your Service → **Logs** tab
- Real-time logs for debugging

### Vercel
- Dashboard → Project → **Deployments** → Click deployment → **Function Logs**

### Supabase
- Dashboard → **Database** → **Query Performance**
- Monitor database usage

---

## 🚀 Auto-Deployment Setup

### Enable CI/CD

Once configured:
1. **Push to GitHub** → Automatic deployment
2. **Render** auto-deploys backend + ML
3. **Vercel** auto-deploys frontend

```bash
# Make changes locally
git add .
git commit -m "Added new feature"
git push

# Both Render and Vercel automatically deploy! 🎉
```

---

## 🔒 Security Best Practices

### 1. Environment Variables
- ✅ Never commit `.env` files to Git
- ✅ Use platform environment variable systems
- ✅ Rotate API keys periodically

### 2. CORS Configuration
- ✅ Only whitelist your specific domains
- ✅ Don't use `origin: "*"` in production

### 3. Database Security
- ✅ Use Supabase Row Level Security (RLS)
- ✅ Don't expose service role key in frontend
- ✅ Use anon key with RLS policies

---

## 📈 Upgrade Paths (If Needed)

If you exceed free tier limits:

### Vercel Pro ($20/month)
- Unlimited bandwidth
- Advanced analytics
- Team collaboration

### Render ($7/month per service)
- Always-on instances (no sleep)
- More compute resources
- Priority support

### Supabase Pro ($25/month)
- 8GB database
- 50GB bandwidth
- Daily backups

---

## 🎯 Quick Reference

### Important URLs Template

```
Frontend: https://ht1-triage.vercel.app
Backend: https://ht1-backend.onrender.com
ML Service: https://ht1-ml-service.onrender.com
Database: https://your-project.supabase.co
```

### Quick Deploy Commands

```bash
# Push changes
git add .
git commit -m "Update"
git push

# View logs (Render CLI)
render logs -s ht1-backend

# View logs (Vercel CLI)
vercel logs
```

---

## ✅ Deployment Complete!

Your HT-1 Triage System is now live and accessible worldwide! 🌍

### Next Steps:
1. ✅ Test all features end-to-end
2. ✅ Share the URL with your hackathon judges
3. ✅ Monitor logs for any issues
4. ✅ Add custom domain (optional)
5. ✅ Set up monitoring/analytics

---

## 🆘 Need Help?

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)

---

**Deployment Time**: ~30-45 minutes total

**Difficulty**: 🟢 Beginner-friendly

**Cost**: **FREE** ✅

---

*Good luck with your hackathon! 🚀*
