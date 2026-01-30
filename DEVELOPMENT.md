# HT-1 Development Guide

## Project Structure

```
Hack_Nagpur/
├── backend/          # Node.js + Express + Socket.IO backend
├── frontend/         # Next.js frontend application
├── ml/              # Python FastAPI ML service
├── database/        # SQL migrations for Supabase
└── docs/            # Additional documentation
```

## Development Workflow

### 1. Local Development

**Start all services:**

Terminal 1 - ML Service:
```bash
cd ml
uvicorn ml_service:app --port 8000 --reload
```

Terminal 2 - Backend:
```bash
cd backend
npm run dev
```

Terminal 3 - Frontend:
```bash
cd frontend
npm run dev
```

### 2. Making Changes

**Frontend (Next.js)**
- Pages are in `frontend/app/`
- Components are in `frontend/components/`
- Styles are in `frontend/app/globals.css`
- Hot reload is enabled by default

**Backend (Node.js)**
- Main logic is in `backend/server.js`
- Uses nodemon for auto-restart on changes
- WebSocket events defined in the Socket.IO section

**ML Service (Python)**
- Model training: `ml/generate_and_train.py`
- API service: `ml/ml_service.py`
- Use `--reload` flag with uvicorn for hot reload

### 3. Testing

**Generate Demo Data:**
```bash
python demo_generator.py
```

**Manual Testing:**
1. Check-in a patient at `/checkin`
2. View queue at `/dashboard`
3. Adjust weights at `/admin`
4. View audit trail at `/audit/{patientId}`

**Test Critical Alert:**
Create a patient with:
- Age > 75
- Symptoms: chest_pain, shortness_of_breath
- SpO2 < 90
- Should trigger critical alert (score ≥ 85)

## Database Management

**View Tables:**
```sql
SELECT * FROM patients WHERE status = 'waiting';
SELECT * FROM triage_audit ORDER BY computed_at DESC LIMIT 10;
SELECT * FROM alerts WHERE sent = false;
```

**Reset Queue:**
```sql
DELETE FROM triage_audit;
DELETE FROM alerts;
DELETE FROM patients;
```

**Update Weights:**
```sql
UPDATE admin_settings 
SET value = '{"chest_pain": 35, "shortness_of_breath": 30, ...}'::jsonb
WHERE key = 'triage_weights';
```

## Debugging

### Backend Not Connecting to Supabase
- Check `.env` has correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE`
- Verify Supabase project is active
- Check network/firewall settings

### ML Service Not Responding
- Ensure model is trained: `python generate_and_train.py`
- Check `triage_model.pkl` exists in `ml/` directory
- Verify port 8000 is not in use

### Frontend Build Errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version is 18+

### WebSocket Not Connecting
- Verify backend is running on port 4000
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- Look for CORS errors in browser console

## Deployment

### Docker Compose
```bash
docker-compose up --build
```

### Individual Services

**ML Service:**
```bash
cd ml
docker build -t ht1-ml .
docker run -p 8000:8000 ht1-ml
```

**Backend:**
```bash
cd backend
docker build -t ht1-backend .
docker run -p 4000:4000 --env-file ../.env ht1-backend
```

**Frontend:**
```bash
cd frontend
docker build -t ht1-frontend .
docker run -p 3000:3000 ht1-frontend
```

## Performance Optimization

### Backend
- Enable response caching for `/api/queue`
- Use connection pooling for Supabase
- Implement rate limiting for check-in endpoint

### Frontend
- Use React.memo for patient cards
- Implement virtual scrolling for large queues
- Lazy load charts and audit pages

### ML Service
- Cache model in memory (already done)
- Use batch prediction if handling multiple patients
- Consider model quantization for faster inference

## Code Style

**JavaScript/TypeScript:**
- Use functional components
- Prefer arrow functions
- Use async/await over .then()
- Keep components small and focused

**Python:**
- Follow PEP 8
- Use type hints
- Document functions with docstrings

**CSS:**
- Use Tailwind utility classes
- Keep custom CSS minimal
- Follow mobile-first approach

## Common Tasks

### Add a New Symptom
1. Update `SYMPTOM_OPTIONS` in `frontend/app/checkin/page.js`
2. Update training data in `ml/generate_and_train.py`
3. Retrain model
4. Add weight in `database/migrations.sql` default settings

### Change Alert Threshold
1. Update `>= 85` checks in `backend/server.js`
2. Update badge logic in frontend components
3. Document in README

### Add New Metric
1. Add calculation in `/api/queue` endpoint
2. Display in dashboard stats cards
3. Add to chart data if needed

## Troubleshooting

**Issue: Queue not updating in real-time**
- Check Socket.IO connection status in dashboard
- Verify backend emits `queue:update` events
- Check browser console for WebSocket errors

**Issue: Triage scores seem incorrect**
- Review audit trail for patient
- Check current weights in admin panel
- Verify ML service is responding (check method field)

**Issue: Alerts not showing**
- Check alerts table in database
- Verify score is ≥ 85
- Check WebSocket connection

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Socket.IO Docs](https://socket.io/docs/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Supabase Docs](https://supabase.com/docs)
- [scikit-learn Docs](https://scikit-learn.org/)

## Getting Help

1. Check this guide
2. Review README.md
3. Check project plan markdown
4. Search codebase for examples
5. Check browser/server console logs
