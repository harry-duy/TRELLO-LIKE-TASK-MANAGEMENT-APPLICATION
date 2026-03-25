# Testing Report — Trello-like Task Management Application

## Môi trường test

| Thành phần | Phiên bản |
|---|---|
| Node.js | ≥ 18 |
| Jest | ^29.7.0 |
| Supertest | ^6.3.3 |
| MongoDB | In-memory (mongodb-memory-server) |

## Chạy test

```bash
cd backend
npm test
# hoặc với coverage:
npm run test:coverage
```

---

## Danh sách test cases

### Test 1 — Register user (đăng ký tài khoản mới)

**Input:** POST /api/auth/register — `{ name, email, password, confirmPassword }`  
**Expected:** 201, `data.user.email` đúng, `data.accessToken` có giá trị, cookie `refreshToken` được set  
**Kết quả:** ✅ PASS

---

### Test 2 — Refresh token (làm mới access token qua cookie)

**Input:** POST /api/auth/refresh-token (cookie `refreshToken` tự động gửi kèm)  
**Expected:** 200, `data.accessToken` mới được trả về  
**Kết quả:** ✅ PASS

---

### Test 3 — Create workspace (tạo workspace khi đã đăng nhập)

**Input:** POST /api/workspaces — `{ name: 'Engineering Workspace' }` + Bearer token  
**Expected:** 201, `data.name` đúng, `data.owner` có giá trị  
**Kết quả:** ✅ PASS

---

### Test 4 — Board CRUD (tạo, xem danh sách, cập nhật, xoá board)

Bao gồm 4 bước tuần tự trong 1 test:  
1. POST /api/boards → 201, lấy `boardId`  
2. GET /api/boards → 200, `data` có 1 phần tử, `_id` khớp  
3. PUT /api/boards/:id → 200, `name` và `background` được cập nhật  
4. DELETE /api/boards/:id → 200, `data.id` khớp với `boardId`  

**Kết quả:** ✅ PASS

---

### Test 5 — Card search (tìm card theo keyword)

Tạo workspace → board → list → card với title "Fix refresh token bug", sau đó tìm với `keyword=refresh`  
**Expected:** 200, `data` có 1 kết quả, `title` khớp  
**Kết quả:** ✅ PASS

---

### Test 6 — Move checklist item (chuyển item giữa 2 card)

Tạo 2 cards, thêm checklist vào card 1, chuyển sang card 2  
**Expected:** 200, `sourceChecklist.length === 0`, `targetChecklist.length === 1`  
**Kết quả:** ✅ PASS

---

### Test 7 — Unauthorized: không có token → 401

**Input:** GET /api/auth/me (không có Authorization header)  
**Expected:** 401, `success: false`  
**Kết quả:** ✅ PASS

---

### Test 8 — Unauthorized: token sai → 401

**Input:** GET /api/auth/me + `Authorization: Bearer invalid.token.here`  
**Expected:** 401, `success: false`  
**Kết quả:** ✅ PASS

---

### Test 9 — Forbidden: user thường truy cập admin analytics → 403

**Input:** GET /api/admin/analytics/overview + token của user thường (role: 'user')  
**Expected:** 403, `success: false`  
**Kết quả:** ✅ PASS

---

### Test 10 — Forbidden: user thường xem danh sách users → 403

**Input:** GET /api/users + token của user thường  
**Expected:** 403, `success: false`  
**Kết quả:** ✅ PASS

---

## Kết quả tổng hợp

```
PASS  tests/api.integration.test.js
  API integration
    ✓ register returns access token and refresh cookie
    ✓ refresh token returns a new access token using cookie auth
    ✓ authenticated user can create a workspace
    ✓ authenticated user can create, list, update, and delete a board
    ✓ card search endpoint returns matching cards
    ✓ authenticated user can move a checklist item from one card to another
    ✓ accessing protected route without token returns 401
    ✓ accessing protected route with invalid token returns 401
    ✓ regular user accessing admin route returns 403
    ✓ regular user cannot list all users (admin only) returns 403

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

## Coverage (estimate)

| File | Statements | Branches |
|---|---|---|
| auth.controller.js | ~85% | ~78% |
| board.controller.js | ~80% | ~72% |
| card.controller.js | ~75% | ~68% |
| workspace.controller.js | ~70% | ~65% |

> Coverage chính xác chạy lệnh: `npm run test:coverage` để xem báo cáo HTML trong `backend/coverage/`
