# 📋 Trello-like Task Management Application

Ứng dụng quản lý công việc theo mô hình Kanban với tính năng real-time collaboration.

## 👥 Team Members
- **Person 1**: Backend Developer
- **Person 2**: Frontend Developer  
- **Person 3**: Full-stack/DevOps

## 🛠️ Technology Stack

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.io (Real-time)
- JWT + Refresh Token
- Zod (Validation)
- Cloudinary (File Upload)
- Jest + Supertest (Testing)

### Frontend
- React 18 + Vite
- TailwindCSS
- @dnd-kit (Drag & Drop)
- Zustand (State Management)
- Socket.io-client
- React Hook Form + Zod
- Recharts (Analytics)

## 📁 Project Structure

```
trello-clone/
├── backend/           # Backend API (Person 1)
├── frontend/          # Frontend React App (Person 2)
├── docs/             # Documentation
└── README.md
```

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd TRELLO-LIKE-TASK-MANAGEMENT-APPLICATION
```

### 2. Cài đặt (một lần)
```bash
npm install
npm run install:all
```

### 3. Cấu hình môi trường
- **Backend:** copy `backend/.env.example` → `backend/.env`, chỉnh MongoDB, JWT, Cloudinary (nếu cần).
- **Frontend:** copy `frontend/.env.example` → `frontend/.env`, giữ `VITE_API_URL=http://localhost:5001/api` nếu chạy local.

### 4. Chạy project (từ thư mục gốc)
```bash
npm run dev
```
Sẽ chạy đồng thời Backend (port 5001) và Frontend (port 5173).

Chạy riêng từng phần:
```bash
npm run dev:backend   # Chỉ backend
npm run dev:frontend  # Chỉ frontend
```

## 📚 Documentation

- [**Hướng dẫn làm việc nhóm (3 người)**](./docs/TEAM.md)
- [Backend Setup Guide](./backend/README.md)
- [Frontend Setup Guide](./frontend/README.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Project Summary](./docs/PROJECT-SUMMARY.md)

## 🎯 Features Checklist

### Core Features (Must Have)
- [x] Authentication (JWT + Refresh Token)
- [x] User Registration & Login
- [x] Workspace Management
- [ ] Board/List/Card CRUD
- [x] Drag & Drop (Cards between lists)
- [ ] Card Details (Assignees, Due Date, Labels, Checklist)
- [ ] Comments on Cards
- [ ] Real-time Updates (Socket.io)
- [ ] Activity Logging
- [ ] RBAC (User/Admin)
- [ ] Search & Filtering
- [ ] Admin Dashboard
- [ ] Testing (5-10 test cases)

### Admin Features (Implemented)
- [x] Phase 1 - User Management (list users, update role, activate/deactivate, delete with safety guards)
- [x] Phase 1 - Admin bootstrap script (`npm run bootstrap:admin`)
- [x] Phase 2 - Workspace & Board Super Access
- [x] Phase 2 - Close/Reopen Board + Workspace Member Management
- [x] Phase 3 - System Analytics (overview, trends) + System Activity Feed
- [x] Phase 4 - System Resources (Cloudinary status/usage, upload policy)
- [x] Phase 4 - System Logs Viewer (combined/error/exceptions/rejections)

### Enhancement Features (Should Have)
- [ ] File Upload (Avatars, Attachments)
- [ ] Advanced Analytics
- [ ] Email Notifications
- [ ] Deployment

### Bonus Features (Nice to Have)
- [ ] Drag Lists Order
- [ ] User Productivity Trends
- [ ] Dark Mode
- [ ] Mobile Responsive

## 📋 Development Workflow

### Branch Strategy
- `main` - Production ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches

### Commit Convention
```
feat: Add user authentication
fix: Fix drag and drop bug
docs: Update API documentation
test: Add card creation tests
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
npm run test:coverage
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚀 Deployment

### Backend (Render)
1. Push code to GitHub
2. Connect Render to repository
3. Set environment variables
4. Deploy

### Frontend (Vercel)
1. Push code to GitHub
2. Import project to Vercel
3. Set environment variables
4. Deploy

## 📝 Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5001
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

## 🤝 Contributing

1. Create feature branch from `develop`
2. Make changes
3. Write tests
4. Submit Pull Request
5. Wait for code review

## 📄 License

MIT License - feel free to use this project for learning purposes.

## 🆘 Support

If you encounter any issues:
1. Check documentation
2. Search existing issues
3. Create new issue with details
4. Contact team members

---

**Happy Coding! 🚀**