const express = require('express');
const router = express.Router();
const listController = require('../controllers/list.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate, listSchemas } = require('../middleware/validation.middleware');

router.use(protect); // Yêu cầu đăng nhập [cite: 100, 103]

router.post('/', validate(listSchemas.create), listController.createList);
router.get('/board/:boardId', listController.getBoardLists);
router.put('/:id', validate(listSchemas.update), listController.updateList);
router.delete('/:id', listController.deleteList);

module.exports = router;
