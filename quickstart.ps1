# Quick Start Script for HT-1 Triage System (Windows)

Write-Host "🏥 HT-1 Patient Queue & Triage Optimizer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-Not (Test-Path .env)) {
    Write-Host "⚠️  No .env file found. Creating from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✓ Created .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Edit .env and add your Supabase credentials!" -ForegroundColor Yellow
    Write-Host "   1. Go to https://supabase.com and create a project" -ForegroundColor Yellow
    Write-Host "   2. Copy your URL and keys to .env" -ForegroundColor Yellow
    Write-Host "   3. Run the SQL migrations from database/migrations.sql" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter when ready to continue"
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
Write-Host ""

# ML Service
Write-Host "1/3 Installing ML service dependencies..." -ForegroundColor Cyan
Set-Location ml
pip install -r requirements.txt
python generate_and_train.py
Set-Location ..

# Backend
Write-Host ""
Write-Host "2/3 Installing backend dependencies..." -ForegroundColor Cyan
Set-Location backend
npm install
Set-Location ..

# Frontend
Write-Host ""
Write-Host "3/3 Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location frontend
npm install
Set-Location ..

Write-Host ""
Write-Host "✓ All dependencies installed!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Ready to start!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run these commands in separate PowerShell windows:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Terminal 1 (ML Service):" -ForegroundColor White
Write-Host "    cd ml; uvicorn ml_service:app --port 8000 --reload" -ForegroundColor Gray
Write-Host ""
Write-Host "  Terminal 2 (Backend):" -ForegroundColor White
Write-Host "    cd backend; npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  Terminal 3 (Frontend):" -ForegroundColor White
Write-Host "    cd frontend; npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Then open http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
