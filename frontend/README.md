# 🎨 Frontend - Trello Clone

React frontend application for Trello-like Task Management built with Vite, React 18, TailwindCSS, and Socket.io.

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Guide](#development-guide)
- [Components](#components)
- [State Management](#state-management)
- [Deployment](#deployment)

## ✨ Features

- ✅ **Authentication**
  - Login/Register/Logout
  - JWT token management
  - Protected routes
  
- ✅ **Board Management**
  - Create/Edit/Delete boards
  - List management
  - Drag & drop cards
  
- ✅ **Real-time Collaboration**
  - Live card updates
  - Real-time comments
  - User presence
  
- ✅ **Card Features**
  - Assignees
  - Due dates
  - Labels
  - Checklist
  - Comments
  - Attachments
  
- ✅ **Additional Features**
  - Search & filtering
  - Admin dashboard
  - Responsive design
  - Dark mode ready

## 🛠️ Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Drag & Drop**: @dnd-kit
- **Real-time**: Socket.io Client
- **HTTP Client**: Axios
- **UI Components**: Custom + Lucide Icons
- **Notifications**: React Hot Toast
- **Charts**: Recharts

## 📁 Project Structure

```
frontend/
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   │   ├── common/      # Reusable components (Button, Input, etc.)
│   │   ├── layout/      # Layout components (Header, Sidebar)
│   │   ├── auth/        # Auth components
│   │   ├── board/       # Board components
│   │   ├── card/        # Card components
│   │   └── workspace/   # Workspace components
│   ├── pages/           # Page components
│   │   ├── auth/        # Auth pages
│   │   ├── DashboardPage.jsx
│   │   ├── BoardPage.jsx
│   │   └── WorkspacePage.jsx
│   ├── hooks/           # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useBoard.js
│   │   └── useSocket.js
│   ├── store/           # Zustand stores
│   │   ├── authStore.js
│   │   ├── boardStore.js
│   │   └── uiStore.js
│   ├── services/        # API services
│   │   ├── authService.js
│   │   ├── boardService.js
│   │   └── cardService.js
│   ├── config/          # Configuration
│   │   ├── api.js       # Axios configuration
│   │   └── socket.js    # Socket.io configuration
│   ├── utils/           # Utility functions
│   │   ├── date.js
│   │   ├── validation.js
│   │   └── helpers.js
│   ├── assets/          # Images, fonts
│   ├── App.jsx          # Main App component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── .env.example         # Environment variables template
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
├── postcss.config.js    # PostCSS configuration
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Backend API running

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with backend URL
```

3. **Start development server**
```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

## 🔐 Environment Variables

Create `.env` file in frontend root:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME=Trello Clone
VITE_APP_VERSION=1.0.0
```

## 🎨 Development Guide

### Creating New Components

```jsx
// src/components/common/Button.jsx
const Button = ({ children, variant = 'primary', ...props }) => {
  const variants = {
    primary: 'btn btn-primary',
    secondary: 'btn btn-secondary',
    danger: 'btn btn-danger',
  };

  return (
    <button className={variants[variant]} {...props}>
      {children}
    </button>
  );
};

export default Button;
```

### Using Zustand Store

```jsx
// Create store
import { create } from 'zustand';

export const useBoardStore = create((set) => ({
  boards: [],
  currentBoard: null,
  
  setBoards: (boards) => set({ boards }),
  setCurrentBoard: (board) => set({ currentBoard: board }),
  
  addBoard: (board) => set((state) => ({
    boards: [...state.boards, board]
  })),
}));

// Use in component
import { useBoardStore } from '@store/boardStore';

const BoardList = () => {
  const { boards, addBoard } = useBoardStore();
  
  return (
    <div>
      {boards.map(board => (
        <BoardCard key={board.id} board={board} />
      ))}
    </div>
  );
};
```

### Using React Query

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import boardService from '@services/boardService';

const BoardPage = () => {
  const queryClient = useQueryClient();
  
  // Fetch boards
  const { data: boards, isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: boardService.getAll,
  });
  
  // Create board mutation
  const createMutation = useMutation({
    mutationFn: boardService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['boards']);
    },
  });
  
  const handleCreate = (data) => {
    createMutation.mutate(data);
  };
  
  if (isLoading) return <div>Loading...</div>;
  
  return <BoardList boards={boards} onCreate={handleCreate} />;
};
```

### Using Socket.io

```jsx
import { useEffect } from 'react';
import { joinBoard, leaveBoard, onCardMoved } from '@config/socket';

const BoardPage = ({ boardId }) => {
  useEffect(() => {
    // Join board room
    joinBoard(boardId);
    
    // Listen for card moves
    const unsubscribe = onCardMoved((data) => {
      console.log('Card moved:', data);
      // Update UI
    });
    
    // Cleanup
    return () => {
      leaveBoard(boardId);
      unsubscribe?.();
    };
  }, [boardId]);
  
  return <div>Board Content</div>;
};
```

### Drag & Drop with @dnd-kit

```jsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableCard = ({ card }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="card"
    >
      {card.title}
    </div>
  );
};

const CardList = ({ cards }) => {
  const handleDragEnd = (event) => {
    const { active, over } = event;
    // Handle card reordering
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={cards.map(c => c.id)}>
        {cards.map(card => (
          <SortableCard key={card.id} card={card} />
        ))}
      </SortableContext>
    </DndContext>
  );
};
```

### Form Validation with React Hook Form + Zod

```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const LoginForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('email')}
        className="input"
        placeholder="Email"
      />
      {errors.email && (
        <p className="text-red-500 text-sm">{errors.email.message}</p>
      )}
      
      <input
        type="password"
        {...register('password')}
        className="input"
        placeholder="Password"
      />
      {errors.password && (
        <p className="text-red-500 text-sm">{errors.password.message}</p>
      )}
      
      <button type="submit" className="btn btn-primary">
        Login
      </button>
    </form>
  );
};
```

## 📦 Components

### Common Components
- Button
- Input
- Modal
- Dropdown
- Avatar
- Badge
- Card
- Spinner

### Layout Components
- Header
- Sidebar
- DashboardLayout
- AuthLayout

### Feature Components
- BoardCard
- BoardList
- CardModal
- CommentList
- ChecklistItem
- MemberPicker
- LabelPicker

## 🎭 State Management

### Zustand Stores

1. **authStore**
   - User authentication
   - Token management
   - User profile

2. **boardStore**
   - Board data
   - Current board
   - Board operations

3. **uiStore**
   - Modal states
   - Sidebar state
   - Theme settings

## 🚀 Deployment

### Vercel (Recommended)

1. **Push code to GitHub**

2. **Import project to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import from GitHub

3. **Configure Build**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Set Environment Variables**
   ```
   VITE_API_URL=https://your-backend-url.com/api
   VITE_SOCKET_URL=https://your-backend-url.com
   ```

5. **Deploy**
   - Click "Deploy"
   - Vercel will auto-deploy on git push

### Netlify

1. **Create `netlify.toml`**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. **Deploy via Netlify CLI or dashboard**

### Build for Production

```bash
# Build
npm run build

# Preview production build
npm run preview

# Build output will be in dist/ folder
```

## 🐛 Troubleshooting

### Module not found error
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Vite port already in use
```bash
# Change port in vite.config.js
server: {
  port: 3000, // Change to different port
}
```

### API connection error
- Check `.env` file has correct API URL
- Verify backend is running
- Check CORS settings in backend

### Socket.io not connecting
- Verify VITE_SOCKET_URL in `.env`
- Check JWT token is valid
- Ensure backend Socket.io is running

## 📚 Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TailwindCSS Documentation](https://tailwindcss.com)
- [React Router Documentation](https://reactrouter.com)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [TanStack Query Documentation](https://tanstack.com/query)
- [@dnd-kit Documentation](https://docs.dndkit.com)

## 📝 Best Practices

1. **Component Structure**
   - Keep components small and focused
   - Use composition over inheritance
   - Extract reusable logic to custom hooks

2. **State Management**
   - Use Zustand for global state
   - Use React Query for server state
   - Keep local state when possible

3. **Performance**
   - Use React.memo for expensive components
   - Implement virtual scrolling for long lists
   - Lazy load routes and components

4. **Code Quality**
   - Follow ESLint rules
   - Use TypeScript types (if using TS)
   - Write meaningful component names

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Create Pull Request

---

**Built with ❤️ by Duy-đẹp-zai**