# 🔷 Azure Deployment Guide for HT-1 Triage System

**Deploy HT-1 completely FREE using Azure Student/Free Tier + Vercel + Supabase**

---

## 📋 Deployment Architecture (Azure Version)

```
┌─────────────────────────────────────┐
│   Frontend (Vercel)                 │  ← Free hosting
│   https://ht1-triage.vercel.app     │
└────────────────┬────────────────────┘
                 │ HTTPS
                 ↓
┌─────────────────────────────────────┐
│   Backend (Azure App Service)       │  ← Free tier (F1)
│   https://ht1-backend.azurewebsites.net │
└─────┬──────────────────┬────────────┘
      │                  │
      │ HTTP             │ SQL
      ↓                  ↓
┌──────────────────┐   ┌─────────────────┐
│ ML Service       │   │  Supabase DB    │
│ (Azure App)      │   │  (Free tier)    │
│ hackngp.azure... │   └─────────────────┘
└──────────────────┘
```

---

## 💰 Cost Breakdown

| Service | Platform | Free Tier | Cost |
|---------|----------|-----------|------|
| **Frontend** | Vercel | 100GB bandwidth | $0 |
| **Backend** | Azure App Service F1 | 1GB RAM, 60 min/day CPU | $0 |
| **ML Service** | Azure App Service F1 | 1GB RAM, 60 min/day CPU | $0 |
| **Database** | Supabase | 500MB, 2GB bandwidth | $0 |
| **AI** | Groq | 1M tokens/month | $0 |

**Total: $0** with Azure Free Tier or Azure for Students ($100 credit)

---

## 🎯 Prerequisites

- ✅ Azure account (Free tier or Student account with $100 credit)
- ✅ GitHub account with code pushed
- ✅ Supabase database already set up
- ✅ Groq API key

---

## 📦 Step-by-Step Azure Deployment

### **Step 1: Deploy ML Service to Azure**

I can see you've already created `hackngp` app! Let's configure it properly.

#### 1.1 Configure Your ML App

From Azure Portal:
1. Go to your **App Service**: `hackngp`
2. **Configuration** → **General Settings**:
   - **Stack**: Python 3.14 ✅ (already set)
   - **Startup Command**: 
     ```bash
     python -m uvicorn ml_service:app --host 0.0.0.0 --port 8000
     ```

#### 1.2 Set Environment Variables

Go to **Configuration** → **Application settings**:

```
# No specific env vars needed for ML service
```

#### 1.3 Deploy from GitHub

**Deployment Center** → Configure:
- **Source**: GitHub
- **Organization**: Your GitHub username
- **Repository**: HackNagpur
- **Branch**: main
- **Build Provider**: GitHub Actions
- **Root Folder**: `/ml`

Click **Save** - Azure will auto-generate a GitHub Actions workflow!

#### 1.4 Note the URL
Your ML service will be at:
```
https://hackngp.azurewebsites.net
```

---

### **Step 2: Create Backend App Service**

#### 2.1 Create New App Service

Azure Portal → **Create a resource** → **Web App**:
- **Name**: `ht1-backend` (or any unique name)
- **Runtime**: Node 18 LTS
- **Region**: Canada Central (same as ML)
- **Pricing**: **Free F1** (1 GB RAM, 60 CPU minutes)

#### 2.2 Configure Deployment

**Deployment Center**:
- **Source**: GitHub
- **Repository**: HackNagpur
- **Branch**: main
- **Root Folder**: `/backend`
- **Build Provider**: GitHub Actions

#### 2.3 Set Environment Variables

**Configuration** → **Application settings** → **New application setting**:

```
SUPABASE_URL=https://fcsjbmmdnipacbmokeun.supabase.co
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GROQ_API_KEY=gsk_f5s46j5UkdDIe7b3k8hAWGdyb3FY...
ML_SERVICE_URL=https://hackngp.azurewebsites.net
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://ht1-triage.vercel.app
WEBSITES_PORT=8080
```

⚠️ **Important**: Azure uses port 8080 by default, not 4000!

#### 2.4 Update Backend Code for Azure

Update `backend/server.js` to use the port from environment:

The code already has:
```javascript
const PORT = process.env.PORT || 4000;
```

This is perfect! It will use Azure's PORT (8080) automatically.

#### 2.5 Note Backend URL
```
https://ht1-backend.azurewebsites.net
```

---

### **Step 3: Deploy Frontend to Vercel** (Same as before)

#### 3.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub

#### 3.2 Import Project
- **Add New** → **Project**
- Import `HackNagpur` repository
- **Framework**: Next.js (auto-detected)
- **Root Directory**: `frontend`

#### 3.3 Environment Variables

Add in Vercel:
```
NEXT_PUBLIC_API_URL=https://ht1-backend.azurewebsites.net
```

⚠️ Use your actual Azure backend URL!

#### 3.4 Deploy

Click **Deploy** - Done in 2-3 minutes!

You'll get: `https://ht1-triage.vercel.app`

---

## ⚙️ Azure-Specific Configuration

### Update CORS in Backend

Already done! ✅ I've updated `server.js` to allow `*.azurewebsites.net` domains.

### Azure Startup Commands

#### For ML Service (`hackngp`):
```bash
python -m pip install --upgrade pip && \
pip install -r requirements.txt && \
python generate_and_train.py && \
python -m uvicorn ml_service:app --host 0.0.0.0 --port 8000
```

#### For Backend:
```bash
npm install && node server.js
```

---

## 🔧 GitHub Actions Workflow (Auto-Generated)

Azure will create workflows in `.github/workflows/`. Example for ML:

```yaml
name: Deploy ML Service to Azure

on:
  push:
    branches:
      - main
    paths:
      - 'ml/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.14'
      - name: Install dependencies
        run: |
          cd ml
          pip install -r requirements.txt
      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'hackngp'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
```

Azure automatically configures this!

---

## 🧪 Testing Your Azure Deployment

### Test ML Service
```bash
curl https://hackngp.azurewebsites.net/health
```

Expected: `{"status": "ok"}`

### Test Backend
```bash
curl https://ht1-backend.azurewebsites.net/api/health
```

Expected: `{"status": "healthy", ...}`

### Test Frontend
Open `https://ht1-triage.vercel.app` in browser.

---

## 🐛 Common Azure Issues & Solutions

### Issue 1: App Service Shows "Your web app is running and waiting for your content"

**Solution**:
1. Check **Deployment Center** → **Logs** for build errors
2. Verify root directory is correct (`/ml` or `/backend`)
3. Check GitHub Actions tab for workflow status

### Issue 2: "Application Error"

**Solution**:
1. **Log Stream** tab → Check real-time logs
2. Verify environment variables are set
3. Check startup command is correct

### Issue 3: Cold Start / Slow Response

**Solution**:
- Free tier apps sleep after 20 min inactivity
- First request takes 30-60 seconds (waking up)
- Enable **Always On** (requires paid tier) or use ping service

### Issue 4: "Module not found"

**Solution**:
1. Check `requirements.txt` / `package.json` exists in root folder
2. Verify build logs in Deployment Center
3. Clear deployment cache and redeploy

### Issue 5: Port Binding Error

**Solution**:
- Always use `process.env.PORT` in Node.js
- Azure assigns ports dynamically (usually 8080)
- Add `WEBSITES_PORT=8080` to app settings

---

## 📊 Azure Portal Navigation

### View Logs
**Your App** → **Log stream** → Real-time logs

### Check Metrics
**Your App** → **Metrics** → CPU, Memory, Requests

### Restart App
**Your App** → **Overview** → **Restart**

### View Environment Variables
**Your App** → **Configuration** → **Application settings**

---

## 🚀 Deployment Checklist

### ML Service (hackngp) ✅
- [ ] Startup command set
- [ ] GitHub deployment configured
- [ ] App running (test /health endpoint)
- [ ] Model trained successfully

### Backend (ht1-backend)
- [ ] App created with Node 18 runtime
- [ ] Environment variables added (7 variables)
- [ ] GitHub deployment configured
- [ ] CORS updated for Azure
- [ ] App running (test /api/health)

### Frontend (Vercel)
- [ ] Repository imported
- [ ] NEXT_PUBLIC_API_URL set to Azure backend
- [ ] Deployed successfully
- [ ] Can access all pages

---

## 💡 Azure-Specific Tips

### 1. Free Tier Limitations
- **60 CPU minutes/day** per app
- Apps sleep after 20 min inactivity
- No custom domains on Free tier

### 2. Upgrade Options
**Basic Tier (B1)** - $13/month per app:
- Always On
- Custom domains
- More compute power

**Standard Tier (S1)** - $70/month:
- Auto-scaling
- Deployment slots
- Better performance

### 3. Monitoring
Enable **Application Insights** (free tier available):
- Request tracking
- Error monitoring
- Performance metrics

### 4. Custom Domains
**Paid tiers only** - Add custom domains:
- `backend.yourdomain.com`
- SSL certificates (free with Azure)

---

## 🔐 Security Best Practices

### 1. Keep Secrets Secure
- Use **Key Vault** for sensitive data (recommended)
- Never commit `.env` to Git
- Rotate API keys regularly

### 2. Enable HTTPS Only
Azure Portal → **TLS/SSL settings** → **HTTPS Only**: ON

### 3. Restrict Access
**Networking** → Configure:
- IP restrictions (whitelist only)
- Access restrictions by service tag

### 4. Enable Managed Identity
For Supabase and other Azure resources:
- Use Managed Identity instead of keys
- More secure, no key management

---

## 📈 Monitoring & Optimization

### View Logs
```bash
# Install Azure CLI
az login

# View logs
az webapp log tail --name hackngp --resource-group DefaultResourceGroup-CID

# Download logs
az webapp log download --name hackngp --resource-group DefaultResourceGroup-CID
```

### Performance Optimization
1. **Enable caching** for static content
2. **Use CDN** for global content delivery
3. **Optimize images** and assets
4. **Enable compression** (gzip)

---

## 🎯 Quick Reference

### Your Deployment URLs

```
ML Service:  https://hackngp.azurewebsites.net
Backend:     https://ht1-backend.azurewebsites.net
Frontend:    https://ht1-triage.vercel.app
Database:    https://fcsjbmmdnipacbmokeun.supabase.co
```

### Important Settings

#### ML Service Startup:
```bash
python -m uvicorn ml_service:app --host 0.0.0.0 --port 8000
```

#### Backend PORT:
```javascript
const PORT = process.env.PORT || 4000; // Auto-uses Azure's port
```

---

## ✅ Deployment Complete!

Your HT-1 system is now running on **Azure + Vercel + Supabase**! 🎉

### Next Steps:
1. ✅ Test all endpoints
2. ✅ Monitor Application Insights
3. ✅ Set up alerts for errors
4. ✅ Share demo URL with judges
5. ✅ Consider upgrading to B1 tier for "Always On"

---

## 🆘 Need Help?

- **Azure Docs**: [docs.microsoft.com/azure/app-service](https://docs.microsoft.com/azure/app-service)
- **Azure Portal**: [portal.azure.com](https://portal.azure.com)
- **GitHub Actions**: Check `.github/workflows` tab

---

**Built with Azure App Service Free Tier** 🔷

*Total Monthly Cost: $0 (Free tier) or ~$26 (Basic tier for 2 always-on apps)*
