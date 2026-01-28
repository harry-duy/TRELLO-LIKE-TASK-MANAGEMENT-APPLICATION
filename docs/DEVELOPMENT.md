# 📖 Development Guide - Trello Clone Project

## 👥 Team Organization (3 People)

### Person 1: Backend Developer
**Responsibilities:**
- Design and implement REST API
- Database schema design
- Authentication & Authorization
- Socket.io real-time features
- Testing backend APIs
- API documentation

**Weekly Tasks:**
- Week 1-2: Auth system, database setup, basic CRUD
- Week 3-4: Core features (boards, lists, cards)
- Week 5-6: Real-time features, testing, deployment

### Person 2: Frontend Developer
**Responsibilities:**
- UI/UX implementation
- Component development
- State management
- Socket.io client integration
- Responsive design
- Frontend testing

**Weekly Tasks:**
- Week 1-2: Auth pages, layout, routing
- Week 3-4: Board/List/Card components, drag-drop
- Week 5-6: Real-time features, admin dashboard, polish

### Person 3: Full-stack/DevOps
**Responsibilities:**
- Help both backend and frontend
- API integration
- Socket.io connection
- Database setup
- Deployment
- Documentation

**Weekly Tasks:**
- Week 1-2: Project setup, Git workflow, database
- Week 3-4: Help with complex features, integration
- Week 5-6: Testing, deployment, documentation

## 🔄 Git Workflow

### Branch Strategy
```
main
  └── develop
        ├── feature/backend-auth
        ├── feature/frontend-board
        ├── feature/socket-realtime
        └── bugfix/card-drag-drop
```

### Commit Convention
```bash
# Format: <type>(<scope>): <subject>

# Types:
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Formatting
refactor: Code restructuring
test:     Adding tests
chore:    Maintenance

# Examples:
git commit -m "feat(auth): implement JWT authentication"
git commit -m "fix(card): resolve drag drop position bug"
git commit -m "docs(api): update API documentation"
```

### Daily Workflow
```bash
# 1. Pull latest changes
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes and commit
git add .
git commit -m "feat: your feature description"

# 4. Push to remote
git push origin feature/your-feature-name

# 5. Create Pull Request on GitHub
# 6. Wait for code review
# 7. Merge to develop
```

## 📋 Development Checklist

### Backend Tasks

#### Phase 1: Foundation (Week 1-2)
- [ ] Setup project structure
- [ ] Configure MongoDB connection
- [ ] Implement User model
- [ ] Create authentication endpoints
  - [ ] POST /api/auth/register
  - [ ] POST /api/auth/login
  - [ ] POST /api/auth/logout
  - [ ] GET /api/auth/me
- [ ] Implement JWT + Refresh Token
- [ ] Setup error handling middleware
- [ ] Configure CORS
- [ ] Setup logging (Winston)

#### Phase 2: Core Features (Week 3-4)
- [ ] Create Workspace model & endpoints
  - [ ] POST /api/workspaces
  - [ ] GET /api/workspaces
  - [ ] PUT /api/workspaces/:id
  - [ ] POST /api/workspaces/:id/members
- [ ] Create Board model & endpoints
  - [ ] POST /api/boards
  - [ ] GET /api/boards
  - [ ] PUT /api/boards/:id
- [ ] Create List model & endpoints
  - [ ] POST /api/lists
  - [ ] GET /api/lists
  - [ ] PUT /api/lists/:id
  - [ ] PUT /api/lists/:id/position
- [ ] Create Card model & endpoints
  - [ ] POST /api/cards
  - [ ] GET /api/cards
  - [ ] PUT /api/cards/:id
  - [ ] PUT /api/cards/:id/move
  - [ ] POST /api/cards/:id/comments
  - [ ] POST /api/cards/:id/checklist
- [ ] Implement search & filtering
- [ ] Setup Cloudinary file upload

#### Phase 3: Advanced Features (Week 5-6)
- [ ] Setup Socket.io
- [ ] Implement real-time events
  - [ ] card:move
  - [ ] card:update
  - [ ] comment:add
- [ ] Create Activity model & logging
- [ ] Write 10+ test cases
- [ ] Admin dashboard analytics endpoints
- [ ] Deploy to Render/Railway

### Frontend Tasks

#### Phase 1: Foundation (Week 1-2)
- [ ] Setup Vite project
- [ ] Configure TailwindCSS
- [ ] Setup routing (React Router)
- [ ] Create auth pages
  - [ ] Login page
  - [ ] Register page
  - [ ] Forgot password page
- [ ] Implement auth store (Zustand)
- [ ] Configure Axios with interceptors
- [ ] Create protected routes
- [ ] Build layout components
  - [ ] Header
  - [ ] Sidebar
  - [ ] DashboardLayout

#### Phase 2: Core Features (Week 3-4)
- [ ] Create Dashboard page
- [ ] Create Workspace components
  - [ ] WorkspaceCard
  - [ ] CreateWorkspaceModal
- [ ] Create Board components
  - [ ] BoardCard
  - [ ] BoardHeader
  - [ ] BoardBackground
- [ ] Create List components
  - [ ] ListColumn
  - [ ] CreateListForm
- [ ] Create Card components
  - [ ] CardItem
  - [ ] CardModal
  - [ ] CardDetail
- [ ] Implement drag & drop (@dnd-kit)
  - [ ] Drag cards within list
  - [ ] Drag cards between lists
  - [ ] Drag lists order (bonus)
- [ ] Build Card detail features
  - [ ] Assignees picker
  - [ ] Labels manager
  - [ ] Due date picker
  - [ ] Checklist
  - [ ] Comments section
- [ ] Implement search & filtering

#### Phase 3: Advanced Features (Week 5-6)
- [ ] Setup Socket.io client
- [ ] Implement real-time updates
  - [ ] Listen for card moves
  - [ ] Listen for card updates
  - [ ] Listen for new comments
  - [ ] User presence indicators
- [ ] Create Admin Dashboard
  - [ ] Analytics charts (Recharts)
  - [ ] Member management
  - [ ] Workspace settings
- [ ] Polish UI/UX
  - [ ] Loading states
  - [ ] Error boundaries
  - [ ] Toast notifications
  - [ ] Responsive design
- [ ] Deploy to Vercel

## 🧪 Testing Strategy

### Backend Testing (Jest + Supertest)

```javascript
// tests/auth.test.js
describe('Authentication', () => {
  test('should register new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.data.user.email).toBe('test@example.com');
  });
  
  test('should login user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123'
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });
});
```

### Minimum Test Cases Required
1. User registration
2. User login
3. Get current user (protected)
4. Create workspace
5. Create board
6. Create card
7. Move card
8. Add comment
9. Unauthorized access (no token)
10. Forbidden access (wrong role)

## 🚀 Deployment Guide

### Backend Deployment (Render.com)

1. **Prepare for deployment**
```bash
# Ensure all environment variables are documented
# Test production build locally
NODE_ENV=production npm start
```

2. **Create Render account**
- Go to https://render.com
- Sign up with GitHub

3. **Create Web Service**
- New → Web Service
- Connect repository
- Configure:
  - Name: trello-clone-backend
  - Environment: Node
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Plan: Free

4. **Add environment variables**
```
NODE_ENV=production
MONGODB_URI=your_atlas_connection
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=https://your-frontend.vercel.app
```

5. **Deploy**
- Click "Create Web Service"
- Wait for build & deployment

### Frontend Deployment (Vercel)

1. **Prepare for deployment**
```bash
# Test production build
npm run build
npm run preview
```

2. **Deploy to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or use Vercel dashboard
# Import from GitHub
# Set environment variables
# Deploy
```

3. **Configure environment**
```
VITE_API_URL=https://your-backend.render.com/api
VITE_SOCKET_URL=https://your-backend.render.com
```

## 📝 Documentation Requirements

### 1. Project Report (Word/PDF)
**Structure:**
- Introduction (1 page)
- Features List (1-2 pages)
- System Architecture (1-2 pages)
- Screenshots (3-5 pages)
  - Login/Register
  - Dashboard
  - Board with Lists & Cards
  - Card Detail Modal
  - Admin Dashboard
- Technology Stack (1 page)
- Challenges & Solutions (1 page)
- Conclusion & Future Work (1 page)

### 2. API Documentation (Postman/Swagger)
- Export Postman collection
- Include example requests/responses
- Document all endpoints
- Include authentication headers

### 3. Database Design
- ERD diagram
- Collection descriptions
- Relationships explanation
- Sample documents

### 4. Testing Report
- List of test cases
- Test results
- Coverage screenshots
- Bug reports (if any)

### 5. Deployment Links
- Backend URL: https://your-backend.render.com
- Frontend URL: https://your-frontend.vercel.app
- GitHub Repository: https://github.com/your-team/trello-clone

## 🐛 Common Issues & Solutions

### Issue: MongoDB Connection Error
**Solution:**
```bash
# Check MongoDB URI format
# For Atlas: mongodb+srv://username:password@cluster.mongodb.net/dbname

# Whitelist IP in MongoDB Atlas
# Network Access → Add IP Address → 0.0.0.0/0 (allow all)
```

### Issue: CORS Error
**Solution:**
```javascript
// backend/src/server.js
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
```

### Issue: Socket.io Not Connecting
**Solution:**
```javascript
// Check authentication token is being sent
const socket = io(SOCKET_URL, {
  auth: { token: yourToken }
});

// Check CORS settings for Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});
```

### Issue: Drag & Drop Not Working
**Solution:**
```bash
# Ensure @dnd-kit packages are installed
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Check DndContext is wrapping sortable items
```

## 📞 Communication

### Daily Standup (15 minutes)
- What did you do yesterday?
- What will you do today?
- Any blockers?

### Weekly Review (1 hour)
- Demo completed features
- Code review
- Plan next week
- Update project board

### Tools
- **Communication**: Discord/Slack
- **Code**: GitHub
- **Project Management**: Trello/Notion
- **Meetings**: Google Meet/Zoom

## 🎯 Final Checklist

### Before Submission
- [ ] All features working
- [ ] Tests passing
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Documentation complete
- [ ] Code commented
- [ ] README files updated
- [ ] Environment variables documented
- [ ] Demo video recorded (optional)
- [ ] Project report written

---

**Good luck with your project! 🚀**