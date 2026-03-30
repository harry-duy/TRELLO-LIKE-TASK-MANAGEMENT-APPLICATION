// backend/src/routes/workspace.routes.js
const express = require('express');
const router  = express.Router();
const {
  protect,
  isWorkspaceMember,
} = require('../middleware/auth.middleware');
const workspaceController = require('../controllers/workspace.controller');

// ── Không cần đăng nhập là thành viên để tạo ──────────────────────────────
router.post('/', protect, workspaceController.createWorkspace);
router.get('/',  protect, workspaceController.getMyWorkspaces);

// ── Phải là thành viên workspace mới xem được ──────────────────────────────
router.get(
  '/:workspaceId',
  protect, isWorkspaceMember,
  workspaceController.getWorkspace
);

// ── Cập nhật workspace (owner hoặc workspace-admin) ────────────────────────
router.put(
  '/:workspaceId',
  protect, isWorkspaceMember,
  workspaceController.updateWorkspace
);

// ── Xoá workspace (chỉ owner) ──────────────────────────────────────────────
router.delete(
  '/:workspaceId',
  protect, isWorkspaceMember,
  workspaceController.deleteWorkspace
);

// ── Quản lý member ─────────────────────────────────────────────────────────
router.post(
  '/:workspaceId/members',
  protect, isWorkspaceMember,
  workspaceController.addMember
);

router.delete(
  '/:workspaceId/members/:userId',
  protect, isWorkspaceMember,
  workspaceController.removeMember
);

router.patch(
  '/:workspaceId/members/:userId/role',
  protect, isWorkspaceMember,
  workspaceController.updateMemberRole
);

router.patch(
  '/:workspaceId/transfer-ownership',
  protect, isWorkspaceMember,
  workspaceController.transferOwnership
);

module.exports = router;