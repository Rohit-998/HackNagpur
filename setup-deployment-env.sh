#!/bin/bash
# Environment Variable Setup Helper
# This script helps you collect all required environment variables for deployment

echo "🚀 HT-1 Deployment Environment Setup Helper"
echo "=============================================="
echo ""

# Create a deployment env file
ENV_FILE="deployment.env"
echo "# HT-1 Deployment Environment Variables" > $ENV_FILE
echo "# Generated on $(date)" >> $ENV_FILE
echo "" >> $ENV_FILE

echo "Let's collect your environment variables step by step..."
echo ""

# Supabase
echo "📊 SUPABASE CONFIGURATION"
echo "------------------------"
read -p "Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
read -p "Supabase Service Role Key: " SUPABASE_SERVICE_ROLE
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY

echo "" >> $ENV_FILE
echo "# Supabase Database" >> $ENV_FILE
echo "SUPABASE_URL=$SUPABASE_URL" >> $ENV_FILE
echo "SUPABASE_SERVICE_ROLE=$SUPABASE_SERVICE_ROLE" >> $ENV_FILE
echo "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" >> $ENV_FILE

# Groq
echo ""
echo "🤖 AI CONFIGURATION"
echo "-------------------"
read -p "Groq API Key (gsk_xxx): " GROQ_API_KEY

echo "" >> $ENV_FILE
echo "# AI Services" >> $ENV_FILE
echo "GROQ_API_KEY=$GROQ_API_KEY" >> $ENV_FILE

# ML Service URL
echo ""
echo "🔬 ML SERVICE"
echo "-------------"
read -p "ML Service URL (from Render, e.g., https://ht1-ml.onrender.com): " ML_SERVICE_URL

echo "" >> $ENV_FILE
echo "# ML Service" >> $ENV_FILE
echo "ML_SERVICE_URL=$ML_SERVICE_URL" >> $ENV_FILE

# Backend URL
echo ""
echo "🔧 BACKEND SERVICE"
echo "------------------"
read -p "Backend URL (from Render, e.g., https://ht1-backend.onrender.com): " BACKEND_URL

echo "" >> $ENV_FILE
echo "# Backend API" >> $ENV_FILE
echo "BACKEND_URL=$BACKEND_URL" >> $ENV_FILE

# Frontend URL
echo ""
echo "🎨 FRONTEND SERVICE"
echo "-------------------"
read -p "Frontend URL (from Vercel, e.g., https://ht1.vercel.app): " FRONTEND_URL

echo "" >> $ENV_FILE
echo "# Frontend" >> $ENV_FILE
echo "FRONTEND_URL=$FRONTEND_URL" >> $ENV_FILE
echo "NEXT_PUBLIC_API_URL=$BACKEND_URL" >> $ENV_FILE

# Additional
echo "" >> $ENV_FILE
echo "# Additional" >> $ENV_FILE
echo "NODE_ENV=production" >> $ENV_FILE
echo "PORT=4000" >> $ENV_FILE

echo ""
echo "✅ Environment variables saved to: $ENV_FILE"
echo ""

# Print summary
echo "📋 DEPLOYMENT SUMMARY"
echo "====================="
echo ""
echo "Copy these to your deployment platforms:"
echo ""

echo "🔬 ML SERVICE (Render.com):"
echo "  No additional env vars needed"
echo ""

echo "🔧 BACKEND (Render.com):"
echo "  SUPABASE_URL=$SUPABASE_URL"
echo "  SUPABASE_SERVICE_ROLE=$SUPABASE_SERVICE_ROLE"
echo "  SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
echo "  GROQ_API_KEY=$GROQ_API_KEY"
echo "  ML_SERVICE_URL=$ML_SERVICE_URL"
echo "  FRONTEND_URL=$FRONTEND_URL"
echo "  NODE_ENV=production"
echo ""

echo "🎨 FRONTEND (Vercel):"
echo "  NEXT_PUBLIC_API_URL=$BACKEND_URL"
echo ""

echo "✨ Deployment URLs:"
echo "  Frontend: $FRONTEND_URL"
echo "  Backend: $BACKEND_URL"
echo "  ML Service: $ML_SERVICE_URL"
echo "  Database: $SUPABASE_URL"
echo ""

echo "🎉 Setup complete! Check $ENV_FILE for all variables."
echo ""
echo "⚠️  IMPORTANT: Keep this file secure! It contains sensitive API keys."
echo "    Add $ENV_FILE to .gitignore if you haven't already."
