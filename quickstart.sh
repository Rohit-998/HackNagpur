#!/bin/bash

# Quick Start Script for HT-1 Triage System
# This script helps you get started quickly

echo "🏥 HT-1 Patient Queue & Triage Optimizer"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "✓ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your Supabase credentials!"
    echo "   1. Go to https://supabase.com and create a project"
    echo "   2. Copy your URL and keys to .env"
    echo "   3. Run the SQL migrations from database/migrations.sql"
    echo ""
    read -p "Press Enter when ready to continue..."
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# ML Service
echo "1/3 Installing ML service dependencies..."
cd ml
pip install -r requirements.txt
python generate_and_train.py
cd ..

# Backend
echo ""
echo "2/3 Installing backend dependencies..."
cd backend
npm install
cd ..

# Frontend
echo ""
echo "3/3 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "✓ All dependencies installed!"
echo ""
echo "🚀 Ready to start!"
echo ""
echo "Run these commands in separate terminals:"
echo ""
echo "  Terminal 1 (ML Service):"
echo "    cd ml && uvicorn ml_service:app --port 8000 --reload"
echo ""
echo "  Terminal 2 (Backend):"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 3 (Frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:3000"
echo ""
