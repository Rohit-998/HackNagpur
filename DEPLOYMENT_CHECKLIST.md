# 🚀 Quick Deployment Checklist

Use this checklist to deploy HT-1 in under 30 minutes!

---

## ✅ Pre-Deployment Checklist

### 1. Code Ready
- [ ] All code committed to Git
- [ ] Repository pushed to GitHub
- [ ] `.env` files are in `.gitignore` (never commit secrets!)

### 2. Accounts Created
- [ ] GitHub account
- [ ] Supabase account
- [ ] Render.com account
- [ ] Vercel account
- [ ] Groq API key obtained

### 3. Database Ready
- [ ] Supabase project created
- [ ] Database migrations run (tables created)
- [ ] Database URL copied
- [ ] API keys copied (anon + service role)

---

## 📋 Deployment Steps

### Step 1: ML Service (Render.com) - 10 min

- [ ] Go to [render.com](https://render.com)
- [ ] New Web Service → Connect GitHub repo
- [ ] Configure:
  - [ ] Name: `ht1-ml-service`
  - [ ] Root Directory: `ml`
  - [ ] Environment: Python 3
  - [ ] Build: `pip install -r requirements.txt && python generate_and_train.py`
  - [ ] Start: `uvicorn ml_service:app --host 0.0.0.0 --port $PORT`
  - [ ] Instance: **Free**
- [ ] Deploy and wait (~5 min)
- [ ] Copy URL: `___________________________`

### Step 2: Backend (Render.com) - 10 min

- [ ] New Web Service → Connect GitHub repo
- [ ] Configure:
  - [ ] Name: `ht1-backend`
  - [ ] Root Directory: `backend`
  - [ ] Environment: Node
  - [ ] Build: `npm install`
  - [ ] Start: `node server.js`
  - [ ] Instance: **Free**
- [ ] Add Environment Variables:
  ```
  SUPABASE_URL=_________________
  SUPABASE_SERVICE_ROLE=_________________
  SUPABASE_ANON_KEY=_________________
  GROQ_API_KEY=_________________
  ML_SERVICE_URL=_________________ (from Step 1)
  FRONTEND_URL=_________________ (will fill after Step 3)
  NODE_ENV=production
  ```
- [ ] Deploy and wait (~5 min)
- [ ] Copy URL: `___________________________`

### Step 3: Frontend (Vercel) - 10 min

- [ ] Go to [vercel.com](https://vercel.com)
- [ ] New Project → Import GitHub repo
- [ ] Configure:
  - [ ] Framework: Next.js (auto-detected)
  - [ ] Root Directory: `frontend`
  - [ ] No changes to build settings
- [ ] Add Environment Variables:
  ```
  NEXT_PUBLIC_API_URL=_________________ (from Step 2)
  ```
- [ ] Deploy and wait (~3 min)
- [ ] Copy URL: `___________________________`

### Step 4: Update Backend with Frontend URL

- [ ] Go back to Render.com → Backend service
- [ ] Settings → Environment
- [ ] Update `FRONTEND_URL` with Vercel URL
- [ ] Save (triggers auto-redeploy)

---

## 🧪 Testing

### Test Each Service

#### ML Service
```bash
curl https://YOUR-ML-URL.onrender.com/health
```
- [ ] Returns: `{"status": "ok"}`

#### Backend
```bash
curl https://YOUR-BACKEND-URL.onrender.com/api/health
```
- [ ] Returns: `{"status": "healthy", "timestamp": "..."}`

#### Frontend
- [ ] Open Vercel URL in browser
- [ ] Landing page loads ✅
- [ ] Check-in page works ✅
- [ ] Submit test patient ✅
- [ ] Dashboard shows patient ✅
- [ ] Admin panel loads ✅

---

## 🐛 Quick Troubleshooting

### If ML Service Fails
1. Check build logs in Render
2. Verify `requirements.txt` exists
3. Check Python version compatibility

### If Backend Fails
1. Check environment variables are set
2. Verify Supabase credentials
3. Check ML_SERVICE_URL is correct
4. Review logs for errors

### If Frontend Fails
1. Check `NEXT_PUBLIC_API_URL` is set
2. Verify backend URL is accessible
3. Check browser console for errors
4. Verify CORS is configured correctly

### If CORS Errors
1. Backend must include frontend URL in CORS
2. Check `backend/server.js` CORS config
3. Redeploy backend after changes

---

## 📝 Your Deployment URLs

Fill these in as you deploy:

```
ML Service: https://________________________________
Backend: https://________________________________
Frontend: https://________________________________
Database: https://________________________________
```

---

## 🎯 Post-Deployment

- [ ] Test complete user flow
- [ ] Create demo patient data
- [ ] Share URL with team/judges
- [ ] Monitor logs for errors
- [ ] Set up custom domain (optional)

---

## ⏱️ Time Estimate

- ML Service: 10 minutes
- Backend: 10 minutes
- Frontend: 10 minutes
- Testing: 5 minutes

**Total: ~35 minutes** ⏱️

---

## 💰 Total Cost

**$0 (FREE)** 🎉

---

## 📞 Support Links

- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)

---

✅ **Deployment Complete!** Your app is live! 🚀
