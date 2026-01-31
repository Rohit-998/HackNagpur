# PowerShell Environment Variable Setup Helper
# This script helps you collect all required environment variables for deployment

Write-Host "🚀 HT-1 Deployment Environment Setup Helper" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Create a deployment env file
$EnvFile = "deployment.env"
"# HT-1 Deployment Environment Variables" | Out-File -FilePath $EnvFile -Encoding UTF8
"# Generated on $(Get-Date)" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"" | Out-File -FilePath $EnvFile -Append -Encoding UTF8

Write-Host "Let's collect your environment variables step by step..." -ForegroundColor Yellow
Write-Host ""

# Supabase
Write-Host "📊 SUPABASE CONFIGURATION" -ForegroundColor Green
Write-Host "------------------------" -ForegroundColor Green
$SUPABASE_URL = Read-Host "Supabase URL (https://xxx.supabase.co)"
$SUPABASE_SERVICE_ROLE = Read-Host "Supabase Service Role Key"
$SUPABASE_ANON_KEY = Read-Host "Supabase Anon Key"

"" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"# Supabase Database" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"SUPABASE_URL=$SUPABASE_URL" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"SUPABASE_SERVICE_ROLE=$SUPABASE_SERVICE_ROLE" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" | Out-File -FilePath $EnvFile -Append -Encoding UTF8

# Groq
Write-Host ""
Write-Host "🤖 AI CONFIGURATION" -ForegroundColor Green
Write-Host "-------------------" -ForegroundColor Green
$GROQ_API_KEY = Read-Host "Groq API Key (gsk_xxx)"

"" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"# AI Services" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"GROQ_API_KEY=$GROQ_API_KEY" | Out-File -FilePath $EnvFile -Append -Encoding UTF8

# ML Service URL
Write-Host ""
Write-Host "🔬 ML SERVICE" -ForegroundColor Green
Write-Host "-------------" -ForegroundColor Green
$ML_SERVICE_URL = Read-Host "ML Service URL (from Render, e.g., https://ht1-ml.onrender.com)"

"" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"# ML Service" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"ML_SERVICE_URL=$ML_SERVICE_URL" | Out-File -FilePath $EnvFile -Append -Encoding UTF8

# Backend URL
Write-Host ""
Write-Host "🔧 BACKEND SERVICE" -ForegroundColor Green
Write-Host "------------------" -ForegroundColor Green
$BACKEND_URL = Read-Host "Backend URL (from Render, e.g., https://ht1-backend.onrender.com)"

"" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"# Backend API" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"BACKEND_URL=$BACKEND_URL" | Out-File -FilePath $EnvFile -Append -Encoding UTF8

# Frontend URL
Write-Host ""
Write-Host "🎨 FRONTEND SERVICE" -ForegroundColor Green
Write-Host "-------------------" -ForegroundColor Green
$FRONTEND_URL = Read-Host "Frontend URL (from Vercel, e.g., https://ht1.vercel.app)"

"" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"# Frontend" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"FRONTEND_URL=$FRONTEND_URL" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"NEXT_PUBLIC_API_URL=$BACKEND_URL" | Out-File -FilePath $EnvFile -Append -Encoding UTF8

# Additional
"" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"# Additional" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"NODE_ENV=production" | Out-File -FilePath $EnvFile -Append -Encoding UTF8
"PORT=4000" | Out-File -FilePath $EnvFile -Append -Encoding UTF8

Write-Host ""
Write-Host "✅ Environment variables saved to: $EnvFile" -ForegroundColor Green
Write-Host ""

# Print summary
Write-Host "📋 DEPLOYMENT SUMMARY" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Copy these to your deployment platforms:" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔬 ML SERVICE (Render.com):" -ForegroundColor Magenta
Write-Host "  No additional env vars needed"
Write-Host ""

Write-Host "🔧 BACKEND (Render.com):" -ForegroundColor Magenta
Write-Host "  SUPABASE_URL=$SUPABASE_URL"
Write-Host "  SUPABASE_SERVICE_ROLE=$SUPABASE_SERVICE_ROLE"
Write-Host "  SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
Write-Host "  GROQ_API_KEY=$GROQ_API_KEY"
Write-Host "  ML_SERVICE_URL=$ML_SERVICE_URL"
Write-Host "  FRONTEND_URL=$FRONTEND_URL"
Write-Host "  NODE_ENV=production"
Write-Host ""

Write-Host "🎨 FRONTEND (Vercel):" -ForegroundColor Magenta
Write-Host "  NEXT_PUBLIC_API_URL=$BACKEND_URL"
Write-Host ""

Write-Host "✨ Deployment URLs:" -ForegroundColor Cyan
Write-Host "  Frontend: $FRONTEND_URL"
Write-Host "  Backend: $BACKEND_URL"
Write-Host "  ML Service: $ML_SERVICE_URL"
Write-Host "  Database: $SUPABASE_URL"
Write-Host ""

Write-Host "🎉 Setup complete! Check $EnvFile for all variables." -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: Keep this file secure! It contains sensitive API keys." -ForegroundColor Red
Write-Host "    Add $EnvFile to .gitignore if you haven't already." -ForegroundColor Red
