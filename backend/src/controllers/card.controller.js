const Card = require('../models/card.model');
const Activity = require('../models/activity.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Tạo thẻ mới
// @route   POST /api/cards
exports.createCard = asyncHandler(async (req, res, next) => {
  const { title, listId, boardId } = req.body;

  const card = await Card.create({
    title,
    list: listId,
    board: boardId,
    createdBy: req.user._id
  });

  // Ghi log hoạt động [cite: 144]
  await Activity.log({
    actor: req.user._id,
    action: 'card_created',
    target: card._id,
    targetType: 'Card',
    board: boardId
  });

  res.status(201).json({ success: true, data: card });
});

// @desc    Di chuyển thẻ (Drag & Drop)
// @route   PUT /api/cards/:id/move
exports.moveCard = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { listId, position, boardId } = req.body;

  const card = await Card.findById(id);
  if (!card) return next(new AppError('Không tìm thấy thẻ', 404));

  const oldListId = card.list;

  // Sử dụng method moveToList đã định nghĩa trong Card Model [cite: 150]
  await card.moveToList(listId, position);

  // Ghi log di chuyển
  await Activity.log({
    actor: req.user._id,
    action: 'card_moved',
    target: card._id,
    targetType: 'Card',
    board: boardId,
    metadata: { fromList: oldListId, toList: listId }
  });

  // Phát tín hiệu Real-time qua Socket.io 
  const io = req.app.get('io');
  io.to(`board:${boardId}`).emit('card:moved', {
    cardId: id,
    fromListId: oldListId,
    toListId: listId,
    position,
    movedBy: req.user._id
  });

  res.status(200).json({ success: true, data: card });
});

// @desc    Cập nhật thông tin thẻ
// @route   PUT /api/cards/:id
exports.updateCard = asyncHandler(async (req, res, next) => {
  const card = await Card.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!card) return next(new AppError('Không tìm thấy thẻ', 404));

  res.status(200).json({ success: true, data: card });
});

// 1. Lấy chi tiết thẻ (kèm theo các thông tin đã populate)
exports.getCardDetails = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.id)
    .populate('assignees', 'name email avatar')
    .populate('comments.user', 'name email avatar');

  if (!card) return next(new AppError('Không tìm thấy thẻ', 404));

  res.status(200).json({ success: true, data: card });
});

// 2. Thêm bình luận vào thẻ
exports.addComment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { content, boardId } = req.body;

  const card = await Card.findById(id);
  if (!card) return next(new AppError('Không tìm thấy thẻ', 404));

  // Sử dụng method addComment đã có trong Card Model [cite: 88]
  await card.addComment(req.user._id, content);

  // Phát tín hiệu Socket cho các user khác đang ở trong board [cite: 63]
  const io = req.app.get('io');
  io.to(`board:${boardId}`).emit('comment:added', {
    cardId: id,
    comment: card.comments[card.comments.length - 1]
  });

  res.status(200).json({ success: true, data: card.comments });
});