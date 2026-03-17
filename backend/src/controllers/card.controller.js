const Card = require('../models/card.model');
const Board = require('../models/board.model');
const Workspace = require('../models/workspace.model');
const Activity = require('../models/activity.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const ensureBoardAccess = async (boardId, user) => {
  const board = await Board.findById(boardId).select('workspace');
  if (!board) {
    throw new AppError('Board not found', 404);
  }

  if (user.role === 'admin') {
    return board;
  }

  const workspace = await Workspace.findById(board.workspace).select('owner members');
  if (!workspace) {
    throw new AppError('Workspace not found', 404);
  }

  const isOwner = workspace.owner?.toString() === user._id.toString();
  const isMember = (workspace.members || []).some(
    (member) => member.user?.toString() === user._id.toString()
  );

  if (!isOwner && !isMember) {
    throw new AppError('You do not have access to this board', 403);
  }

  return board;
};

// @desc    Search cards in a board
// @route   GET /api/cards/search
exports.searchCards = asyncHandler(async (req, res, next) => {
  const { boardId, keyword, labels, assignees, dueDateStatus } = req.query;

  if (!boardId) {
    return next(new AppError('boardId is required', 400));
  }

  await ensureBoardAccess(boardId, req.user);

  const filters = {
    keyword: typeof keyword === 'string' ? keyword.trim() : '',
    labels:
      typeof labels === 'string'
        ? labels
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    assignees:
      typeof assignees === 'string'
        ? assignees
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    dueDateStatus:
      dueDateStatus === 'overdue' || dueDateStatus === 'due-soon'
        ? dueDateStatus
        : undefined,
  };

  const cards = await Card.search(boardId, filters);

  res.status(200).json({
    success: true,
    data: cards,
    meta: {
      count: cards.length,
      filters,
    },
  });
});

// @desc    Create card
// @route   POST /api/cards
exports.createCard = asyncHandler(async (req, res) => {
  const { title, listId, boardId } = req.body;

  const card = await Card.create({
    title,
    list: listId,
    board: boardId,
    createdBy: req.user._id,
  });

  await Activity.log({
    actor: req.user._id,
    action: 'card_created',
    target: card._id,
    targetType: 'Card',
    board: boardId,
  });

  res.status(201).json({ success: true, data: card });
});

// @desc    Move card between lists
// @route   PUT /api/cards/:id/move
exports.moveCard = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { listId, position, boardId } = req.body;

  const card = await Card.findById(id);
  if (!card) return next(new AppError('Card not found', 404));

  const oldListId = card.list;

  await card.moveToList(listId, position);

  await Activity.log({
    actor: req.user._id,
    action: 'card_moved',
    target: card._id,
    targetType: 'Card',
    board: boardId,
    metadata: { fromList: oldListId, toList: listId },
  });

  const io = req.app.get('io');
  io.to(`board:${boardId}`).emit('card:moved', {
    cardId: id,
    fromListId: oldListId,
    toListId: listId,
    position,
    movedBy: req.user._id,
  });

  res.status(200).json({ success: true, data: card });
});

// @desc    Update card
// @route   PUT /api/cards/:id
exports.updateCard = asyncHandler(async (req, res, next) => {
  const card = await Card.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!card) return next(new AppError('Card not found', 404));

  res.status(200).json({ success: true, data: card });
});

// @desc    Get card details
// @route   GET /api/cards/:id
exports.getCardDetails = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.id)
    .populate('list', 'name')
    .populate('assignees', 'name email avatar')
    .populate('comments.user', 'name email avatar');

  if (!card) return next(new AppError('Card not found', 404));

  res.status(200).json({ success: true, data: card });
});

// @desc    Add comment to card
// @route   POST /api/cards/:id/comments
exports.addComment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { content, boardId } = req.body;

  const card = await Card.findById(id);
  if (!card) return next(new AppError('Card not found', 404));

  await card.addComment(req.user._id, content);

  const io = req.app.get('io');
  io.to(`board:${boardId}`).emit('comment:added', {
    cardId: id,
    comment: card.comments[card.comments.length - 1],
  });

  res.status(200).json({ success: true, data: card.comments });
});

// @desc    Add checklist item
// @route   POST /api/cards/:id/checklist
exports.addChecklistItem = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { text } = req.body;

  const card = await Card.findById(id);
  if (!card) return next(new AppError('Card not found', 404));

  await card.addChecklistItem(text);

  res.status(200).json({ success: true, data: card.checklist });
});

// @desc    Toggle checklist item
// @route   PATCH /api/cards/:id/checklist/:itemId
exports.toggleChecklistItem = asyncHandler(async (req, res, next) => {
  const { id, itemId } = req.params;

  const card = await Card.findById(id);
  if (!card) return next(new AppError('Card not found', 404));

  await card.toggleChecklistItem(itemId);

  res.status(200).json({ success: true, data: card.checklist });
});

// @desc    Move checklist item to another card
// @route   POST /api/cards/:id/checklist/:itemId/move
exports.moveChecklistItem = asyncHandler(async (req, res, next) => {
  const { id, itemId } = req.params;
  const { targetCardId } = req.body;

  const sourceCard = await Card.findById(id);
  if (!sourceCard) return next(new AppError('Source card not found', 404));

  await ensureBoardAccess(sourceCard.board, req.user);

  const checklistItem = sourceCard.checklist.id(itemId);
  if (!checklistItem) {
    return next(new AppError('Checklist item not found', 404));
  }

  const targetCard = await Card.findById(targetCardId);
  if (!targetCard) return next(new AppError('Target card not found', 404));

  if (sourceCard._id.toString() === targetCard._id.toString()) {
    return next(new AppError('Cannot move checklist item to the same card', 400));
  }

  if (sourceCard.board.toString() !== targetCard.board.toString()) {
    return next(new AppError('Checklist items can only be moved within the same board', 400));
  }

  const movedItem = await sourceCard.moveChecklistItemToCard(itemId, targetCard);

  await Activity.log({
    actor: req.user._id,
    action: 'checklist_item_moved',
    target: targetCard._id,
    targetType: 'Card',
    board: targetCard.board,
    metadata: {
      fromCard: sourceCard._id,
      toCard: targetCard._id,
      toCardName: targetCard.title,
      itemText: checklistItem.text,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      sourceCardId: sourceCard._id,
      targetCardId: targetCard._id,
      movedItem,
      sourceChecklist: sourceCard.checklist,
      targetChecklist: targetCard.checklist,
    },
  });
});

// @desc    Delete card
// @route   DELETE /api/cards/:id
exports.deleteCard = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const card = await Card.findById(id);

  if (!card) return next(new AppError('Card not found', 404));

  await Card.deleteOne({ _id: id });

  res.status(200).json({ success: true, data: { id } });
});
