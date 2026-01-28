#!/bin/bash

echo "🚀 Trello Clone - Quick Setup Script"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Setup Backend
echo "${BLUE}📦 Setting up Backend...${NC}"
cd backend

if [ ! -f ".env" ]; then
    echo "${YELLOW}⚠️  Creating .env file from .env.example${NC}"
    cp .env.example .env
    echo "📝 Please edit backend/.env with your credentials"
else
    echo "✅ .env file already exists"
fi

echo "📦 Installing backend dependencies..."
npm install

echo "${GREEN}✅ Backend setup complete!${NC}"
echo ""

# Setup Frontend
echo "${BLUE}📦 Setting up Frontend...${NC}"
cd ../frontend

if [ ! -f ".env" ]; then
    echo "${YELLOW}⚠️  Creating .env file from .env.example${NC}"
    cp .env.example .env
else
    echo "✅ .env file already exists"
fi

echo "📦 Installing frontend dependencies..."
npm install

echo "${GREEN}✅ Frontend setup complete!${NC}"
echo ""

cd ..

# Final Instructions
echo "🎉 Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Edit backend/.env with your MongoDB URI and other credentials"
echo "2. Edit frontend/.env with your backend URL"
echo "3. Start MongoDB (if using local)"
echo "4. Open two terminals:"
echo ""
echo "   ${BLUE}Terminal 1 (Backend):${NC}"
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "   ${BLUE}Terminal 2 (Frontend):${NC}"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "5. Open http://localhost:5173 in your browser"
echo ""
echo "📚 Documentation:"
echo "   - Backend: backend/README.md"
echo "   - Frontend: frontend/README.md"
echo "   - Development Guide: docs/DEVELOPMENT.md"
echo ""
echo "${GREEN}Happy coding! 🚀${NC}"