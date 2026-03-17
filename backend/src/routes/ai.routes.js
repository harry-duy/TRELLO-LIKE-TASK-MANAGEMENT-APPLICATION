const express = require('express');
const router = express.Router();

const aiController = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/search', aiController.searchCardsByNaturalLanguage);
router.post('/checklist-suggestions', aiController.suggestChecklist);
router.post('/assistant', aiController.chatAssistant);

module.exports = router;
