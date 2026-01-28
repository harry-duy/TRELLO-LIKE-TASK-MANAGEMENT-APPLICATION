# 🎯 Backend API - Trello Clone

Backend API for Trello-like Task Management Application built with Node.js, Express, MongoDB, and Socket.io.

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Deployment](#deployment)

## ✨ Features

- ✅ **Authentication & Authorization**
  - JWT + Refresh Token implementation
  - Role-Based Access Control (RBAC)
  - Password reset functionality
  
- ✅ **Core Functionality**
  - Workspace management
  - Board/List/Card CRUD operations
  - Drag & drop support
  - Activity logging system
  
- ✅ **Real-time Features**
  - Socket.io integration
  - Live card updates
  - Real-time comments
  - User presence indicators
  
- ✅ **Additional Features**
  - File upload (Cloudinary)
  - Search & filtering
  - Pagination & sorting
  - Request validation (Zod)
  - Error handling
  - Logging (Winston)

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Real-time**: Socket.io
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **File Upload**: Cloudinary + Multer
- **Logging**: Winston
- **Testing**: Jest + Supertest
- **Security**: Helmet, CORS, express-mongo-sanitize

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js
│   │   └── cloudinary.js
│   ├── controllers/      # Route controllers
│   │   ├── auth.controller.js
│   │   ├── workspace.controller.js
│   │   ├── board.controller.js
│   │   ├── list.controller.js
│   │   ├── card.controller.js
│   │   └── activity.controller.js
│   ├── middleware/       # Custom middleware
│   │   ├── auth.middleware.js
│   │   ├── errorHandler.js
│   │   └── validation.middleware.js
│   ├── models/          # Mongoose models
│   │   ├── user.model.js
│   │   ├── workspace.model.js
│   │   ├── board.model.js
│   │   ├── list.model.js
│   │   ├── card.model.js
│   │   └── activity.model.js
│   ├── routes/          # API routes
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── workspace.routes.js
│   │   ├── board.routes.js
│   │   ├── list.routes.js
│   │   ├── card.routes.js
│   │   └── activity.routes.js
│   ├── services/        # Business logic
│   ├── socket/          # Socket.io handlers
│   │   └── index.js
│   ├── utils/           # Utility functions
│   │   └── logger.js
│   └── server.js        # Entry point
├── tests/               # Test files
├── logs/                # Log files
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- Cloudinary account (for file upload)

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Start MongoDB**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas connection string in .env
```

4. **Run development server**
```bash
npm run dev
```

The server will start at `http://localhost:5000`

### Available Scripts

```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

## 🔐 Environment Variables

Create a `.env` file in the backend root directory:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/trello-clone
# For Atlas: mongodb+srv://username:password@cluster.mongodb.net/trello-clone

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@trello-clone.com
```

### Getting Cloudinary Credentials

1. Sign up at [https://cloudinary.com](https://cloudinary.com)
2. Go to Dashboard
3. Copy Cloud Name, API Key, and API Secret

### Getting MongoDB Atlas URI

1. Create account at [https://mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a cluster (free tier available)
3. Create database user
4. Whitelist your IP (or use 0.0.0.0/0 for all IPs)
5. Get connection string from "Connect" button

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123",
  "confirmPassword": "Password123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "Password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

### Workspace Endpoints

#### Create Workspace
```http
POST /api/workspaces
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "My Workspace",
  "description": "Team workspace",
  "visibility": "private"
}
```

#### Get User Workspaces
```http
GET /api/workspaces
Authorization: Bearer <access_token>
```

### Board Endpoints

#### Create Board
```http
POST /api/boards
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Project Board",
  "description": "Main project board",
  "workspaceId": "workspace_id_here",
  "background": "#0079bf"
}
```

### Card Endpoints

#### Search Cards
```http
GET /api/cards/search?boardId=<board_id>&keyword=bug&labels=urgent
Authorization: Bearer <access_token>
```

### Real-time Events (Socket.io)

#### Connect
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

#### Join Board
```javascript
socket.emit('join:board', boardId);
```

#### Listen for Card Updates
```javascript
socket.on('card:moved', (data) => {
  console.log('Card moved:', data);
});

socket.on('comment:added', (data) => {
  console.log('New comment:', data);
});
```

## 🗄️ Database Schema

### Collections

1. **users**
   - Basic user information
   - Authentication credentials
   - Profile data

2. **workspaces**
   - Workspace details
   - Owner and members
   - Visibility settings

3. **boards**
   - Board information
   - Associated workspace
   - Background settings

4. **lists**
   - List name and position
   - Associated board
   - Archive status

5. **cards**
   - Card details
   - Assignees, labels, due dates
   - Checklist items
   - Comments and attachments

6. **activities**
   - Activity logs
   - Actor, action, target
   - Timestamp and metadata

### Relationships

```
Workspace (1) ──> (N) Boards
Board (1) ──> (N) Lists
List (1) ──> (N) Cards
Card (N) ──> (N) Users (assignees)
Activity (N) ──> (1) User (actor)
```

## 🧪 Testing

### Setup Test Database

Tests use MongoDB Memory Server (in-memory database).

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test auth.test.js

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

### Example Test

```javascript
// tests/auth.test.js
const request = require('supertest');
const { app } = require('../src/server');

describe('Authentication', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('test@example.com');
  });
});
```

### Test Cases to Implement

1. **Authentication** (5 tests)
   - Register user
   - Login user
   - Get current user
   - Refresh token
   - Logout user

2. **Workspace** (3 tests)
   - Create workspace
   - Add member
   - Remove member

3. **Board & Cards** (5 tests)
   - Create board
   - Create card
   - Move card
   - Add comment
   - Search cards

4. **Authorization** (2 tests)
   - Access denied without token
   - Access denied with wrong role

## 🚀 Deployment

### Render.com (Recommended)

1. **Create account at [Render.com](https://render.com)**

2. **Create new Web Service**
   - Connect GitHub repository
   - Select branch
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Set Environment Variables**
   - Add all variables from `.env`
   - Use MongoDB Atlas for production database

4. **Deploy**
   - Render will automatically deploy on git push

### Railway.app

1. **Create account at [Railway.app](https://railway.app)**

2. **Create new project**
   - Import from GitHub
   - Railway auto-detects Node.js

3. **Add MongoDB**
   - Add MongoDB plugin
   - Copy connection string

4. **Set Environment Variables**
   - Add all variables from settings

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_atlas_connection_string
JWT_SECRET=super-secret-production-key
JWT_REFRESH_SECRET=super-secret-refresh-production-key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=https://your-frontend-url.vercel.app
```

## 🔒 Security Best Practices

1. **Never commit `.env` file**
2. **Use strong JWT secrets in production**
3. **Enable HTTPS in production**
4. **Implement rate limiting**
5. **Validate all inputs**
6. **Sanitize MongoDB queries**
7. **Use helmet for security headers**
8. **Keep dependencies updated**

## 📝 Development Workflow

### Before Starting Development

1. Pull latest code from `develop` branch
2. Create feature branch: `git checkout -b feature/your-feature`
3. Install dependencies: `npm install`
4. Setup `.env` file

### While Developing

1. Write code
2. Test locally
3. Write tests for new features
4. Run linter: `npm run lint`
5. Format code: `npm run format`

### Before Committing

1. Run tests: `npm test`
2. Check for errors
3. Commit with meaningful message
4. Push to feature branch
5. Create Pull Request

## 🐛 Troubleshooting

### MongoDB Connection Error
- Check if MongoDB is running
- Verify connection string in `.env`
- Check network connectivity
- Whitelist IP in MongoDB Atlas

### JWT Token Error
- Verify JWT_SECRET is set
- Check token expiration
- Ensure token format: `Bearer <token>`

### Socket.io Connection Error
- Check CORS settings
- Verify frontend URL in `.env`
- Check authentication token

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or use different port in .env
PORT=5001
```

## 📞 Support

If you encounter issues:
1. Check this README
2. Check error logs in `logs/` folder
3. Search existing issues on GitHub
4. Contact team members
5. Create new issue with details

## 📄 License

MIT License - Free to use for educational purposes

---

**Built with ❤️ by Duy-đẹp-zai**