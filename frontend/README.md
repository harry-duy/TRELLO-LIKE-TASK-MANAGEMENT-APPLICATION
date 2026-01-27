# Trello-like Task Management Application

## 📋 Project Structure
```
TRELLO-LIKE-TASK-MANAGEMENT-APPLICATION/
├── backend/          # Node.js + Express + MongoDB
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js
│   ├── .env
│   └── package.json
└── frontend/         # React + Vite + TailwindCSS
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/
    │   ├── hooks/
    │   └── App.jsx
    ├── .env
    └── package.json
```

## 🚀 Installation

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.io
- JWT Authentication
- Joi Validation

**Frontend:**
- React 18 + Vite
- TailwindCSS
- Socket.io Client
- @dnd-kit (Drag & Drop)
- React Query
- Zustand

## 📝 Features

- ✅ Drag & Drop Kanban Board
- ✅ Real-time collaboration
- ✅ User authentication & RBAC
- ✅ Activity logging
- ✅ Admin dashboard
- ✅ File upload
- ✅ Testing with Jest

## 👥 Team Members

[Add your team members here]

# Test backend
cd backend
npm run dev
# Mở browser: http://localhost:5000/api/health

# Test frontend (terminal mới)
cd frontend
npm run dev
# Mở browser: http://localhost:5173