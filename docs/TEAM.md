# 👥 Hướng dẫn làm việc nhóm (3 người)

## Phân công vai trò

| Vai trò | Công việc chính | Thư mục/File chính |
|--------|------------------|--------------------|
| **Person 1 – Backend** | API, DB, Auth, Socket.io, Testing backend | `backend/` |
| **Person 2 – Frontend** | UI, Pages, Components, State, Testing frontend | `frontend/` |
| **Person 3 – Full-stack / DevOps** | Tích hợp API–UI, CI/CD, Deploy, Docs, Bug fix chéo | `backend/`, `frontend/`, `docs/` |

## Quy trình làm việc

### 1. Clone & cài đặt (lần đầu)

```bash
git clone <repo-url>
cd TRELLO-LIKE-TASK-MANAGEMENT-APPLICATION

# Cài dependency toàn project (root + backend + frontend)
npm install
npm run install:all

# Cấu hình env
# Backend: copy backend/.env.example → backend/.env
# Frontend: copy frontend/.env.example → frontend/.env
```

### 2. Chạy project từ thư mục gốc

```bash
# Chạy cả Backend + Frontend
npm run dev
```

- **Backend:** Trước khi chạy sẽ tự giải phóng port 5001 (nếu bị chiếm). Nếu vẫn không được, backend sẽ thử lần lượt port 5002..5010. Nếu backend chạy trên port khác 5001, cần đặt trong `frontend/.env`: `VITE_API_URL=http://localhost:<port>/api` và `VITE_SOCKET_URL=http://localhost:<port>`.
- **Frontend:** Chạy tại http://localhost:5173.

Chạy riêng:

```bash
npm run dev:backend   # Chỉ backend (mặc định port 5001)
npm run dev:frontend  # Chỉ frontend (port 5173)
```

### 3. Branch & commit

- **main**: code production.
- **develop**: nhánh dev chung.
- **feature/xxx**: tính năng (tạo từ `develop`).
- **bugfix/xxx**: sửa lỗi.

Quy ước commit (Conventional Commits):

```
feat: Thêm đăng nhập JWT
fix: Sửa lỗi kéo thả card
docs: Cập nhật API auth
test: Thêm test cho board API
```

### 4. Phân module theo người (gợi ý)

- **Backend (Person 1)**: `backend/src/` — routes, controllers, models, middleware, socket.
- **Frontend (Person 2)**: `frontend/src/` — pages, components, store, services, hooks.
- **Person 3**: Nối API với UI, cập nhật `docs/`, cấu hình deploy, review code chéo.

## Lệnh hữu ích (chạy tại thư mục gốc)

| Lệnh | Mô tả |
|------|--------|
| `npm run install:all` | Cài dependency backend + frontend |
| `npm run dev` | Chạy đồng thời backend + frontend |
| `npm run dev:backend` | Chỉ backend |
| `npm run dev:frontend` | Chỉ frontend |
| `npm run build` | Build frontend |
| `npm run test` | Chạy test backend |
| `npm run lint` | Lint backend + frontend |

## Gặp lỗi thường gặp

- **`npm run dev` báo thiếu package.json**: Đảm bảo đang ở đúng thư mục gốc `TRELLO-LIKE-TASK-MANAGEMENT-APPLICATION` (có file `package.json` ở đây).
- **Backend không kết nối DB**: Kiểm tra `backend/.env` có `MONGODB_URI` và MongoDB đã chạy.
- **Frontend gọi API lỗi**: Kiểm tra `frontend/.env` có `VITE_API_URL=http://localhost:5001/api` và backend đang chạy.
