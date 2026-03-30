const express = require('express');
const router = express.Router();
const cardController = require('../controllers/card.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate, cardSchemas } = require('../middleware/validation.middleware');

router.use(protect);

router.get('/search',           cardController.searchCards);
router.get('/archived',         cardController.getArchivedCards);
router.post('/',                validate(cardSchemas.create), cardController.createCard);
router.put('/:id/move',         validate(cardSchemas.move),   cardController.moveCard);
router.put('/:id/restore',      cardController.restoreCard);
router.post('/:id/duplicate',   cardController.duplicateCard);
router.post('/:id/watch',       cardController.toggleWatcher);
router.get('/:id/activity',     cardController.getCardActivity);
router.get('/:id',              cardController.getCardDetails);
router.put('/:id',              cardController.updateCard);
router.delete('/:id',           cardController.deleteCard);

// Comments
router.post('/:id/comments',                        cardController.addComment);
router.put('/:id/comments/:commentId',              cardController.updateComment);
router.delete('/:id/comments/:commentId',           cardController.deleteComment);

// Checklist
router.post('/:id/checklist',         validate(cardSchemas.addChecklistItem), cardController.addChecklistItem);
router.patch('/:id/checklist/:itemId',                                         cardController.toggleChecklistItem);
router.post('/:id/checklist/:itemId/move', validate(cardSchemas.moveChecklistItem), cardController.moveChecklistItem);

// ── Attachments (NEW) ──────────────────────────────────────────────────
// upload.single('file') được xử lý bên trong addAttachment (middleware array)
router.post('/:id/attachments',               cardController.addAttachment);
router.delete('/:id/attachments/:attachmentId', cardController.deleteAttachment);

module.exports = router;
