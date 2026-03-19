const express = require('express');
const router = express.Router();
const cardController = require('../controllers/card.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate, cardSchemas } = require('../middleware/validation.middleware');

router.use(protect);

router.get('/search', cardController.searchCards);
router.post('/', validate(cardSchemas.create), cardController.createCard);
router.put('/:id/move', validate(cardSchemas.move), cardController.moveCard);
router.get('/:id', cardController.getCardDetails);
router.put('/:id', cardController.updateCard);
router.post('/:id/comments', cardController.addComment);
router.delete('/:id', cardController.deleteCard);
router.post('/:id/checklist', validate(cardSchemas.addChecklistItem), cardController.addChecklistItem);
router.patch('/:id/checklist/:itemId', cardController.toggleChecklistItem);
router.post(
  '/:id/checklist/:itemId/move',
  validate(cardSchemas.moveChecklistItem),
  cardController.moveChecklistItem
);

module.exports = router;
