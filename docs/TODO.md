# Project TODO

Cap nhat: 2026-03-14

## P0 - Critical API and Integration Fixes

- [x] Fix frontend refresh-token flow to read `data.accessToken` correctly and clear auth state safely on refresh failure
- [x] Complete board API contract used by frontend: `GET /api/boards`, `PUT /api/boards/:id`, `DELETE /api/boards/:id`
- [x] Add missing `GET /api/cards/search` endpoint so card search no longer points to a dead route
- [x] Fix workspace analytics runtime error by importing `mongoose` in activity analytics controller
- [x] Persist refresh token reliably during email/password auth and OAuth callback flows

## P1 - Quality Gate

- [x] Add ESLint configuration for backend and frontend, then make `npm run lint` pass cleanly
- [x] Add minimum backend test cases for auth, workspace, board, and card flow
- [ ] Review environment examples and startup docs so they match real ports, routes, and features

## P2 - Contract and Documentation Cleanup

- [ ] Sync `README.md`, `backend/README.md`, `frontend/README.md`, and coverage docs with the real implementation status
- [ ] Remove or refactor dead services/endpoints that are no longer part of the active product flow
- [ ] Document which features are production-ready, partial, and demo-only

## P3 - Feature Completion

- [ ] Finish board delete/update UI flows where needed
- [ ] Complete search/filter UX beyond the current API coverage
- [ ] Expand realtime coverage beyond card move and comment updates
- [ ] Finish attachment, assignee, label, and advanced card collaboration flows
- [ ] Add deployment checklist and smoke-test checklist for final handoff
