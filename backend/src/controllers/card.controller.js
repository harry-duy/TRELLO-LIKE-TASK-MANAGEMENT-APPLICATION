const Card = require('../models/card.model');
const Board = require('../models/board.model');
const Workspace = require('../models/workspace.model');
const Activity = require('../models/activity.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const notify = require('../utils/notifyHelper');
const { cloudinary, upload } = require('../config/cloudinary');

const ensureBoardAccess = async (boardId, user) => {
  const board = await Board.findById(boardId).select('workspace');
  if (!board) throw new AppError('Board not found', 404);
  if (user.role === 'admin') return board;
  const workspace = await Workspace.findById(board.workspace).select('owner members');
  if (!workspace) throw new AppError('Workspace not found', 404);
  const isOwner = workspace.owner?.toString() === user._id.toString();
  const isMember = (workspace.members || []).some(
    (member) => member.user?.toString() === user._id.toString()
  );
  if (!isOwner && !isMember) throw new AppError('You do not have access to this board', 403);
  return board;
};

// @desc    Search cards in a board (with pagination)
// @route   GET /api/cards/search
exports.searchCards = asyncHandler(async (req, res, next) => {
  const { boardId, keyword, labels, assignees, dueDateStatus } = req.query;
  const page  = Math.max(parseInt(req.query.page  || '1',  10), 1);
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
  const sort  = req.query.sort === 'oldest' ? { createdAt: 1 } : { updatedAt: -1 };

  if (!boardId) return next(new AppError('boardId is required', 400));
  await ensureBoardAccess(boardId, req.user);

  const filters = {
    keyword: typeof keyword === 'string' ? keyword.trim() : '',
    labels: typeof labels === 'string'
      ? labels.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    assignees: typeof assignees === 'string'
      ? assignees.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    dueDateStatus:
      dueDateStatus === 'overdue' || dueDateStatus === 'due-soon' ? dueDateStatus : undefined,
  };

  const query = { board: boardId, isArchived: false };
  if (filters.keyword) query.$text = { $search: filters.keyword };
  if (filters.labels.length)    query.labels    = { $in: filters.labels };
  if (filters.assignees.length) query.assignees = { $in: filters.assignees };
  if (filters.dueDateStatus) {
    const now = new Date();
    if (filters.dueDateStatus === 'overdue') {
      query.dueDate = { $lt: now };
      query.isCompleted = false;
    } else if (filters.dueDateStatus === 'due-soon') {
      query.dueDate = { $gte: now, $lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) };
      query.isCompleted = false;
    }
  }

  const [cards, total] = await Promise.all([
    Card.find(query)
      .populate('assignees', 'name email avatar')
      .populate('list', 'name')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Card.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: cards,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      filters,
    },
  });
});

// @desc    Create card
// @route   POST /api/cards
exports.createCard = asyncHandler(async (req, res, next) => {
  const { title, listId, boardId } = req.body;
  if (!boardId) return next(new AppError('boardId is required', 400));
  await ensureBoardAccess(boardId, req.user);
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
  await ensureBoardAccess(card.board, req.user);
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
    cardId: id, fromListId: oldListId, toListId: listId, position, movedBy: req.user._id,
  });
  if (card.assignees?.length > 0) {
    await notify(io, {
      actor:      req.user._id,
      recipients: card.assignees.map((a) => a._id || a),
      type:       'card_moved',
      title:      'Card của bạn bị di chuyển',
      message:    `${req.user.name} đã di chuyển card "${card.title}"`,
      link:       `/board/${boardId}`,
      metadata:   { cardId: id, cardTitle: card.title, boardId, fromList: oldListId, toList: listId },
    });
  }
  res.status(200).json({ success: true, data: card });
});

// @desc    Update card
// @route   PUT /api/cards/:id
exports.updateCard = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.id);
  if (!card) return next(new AppError('Card not found', 404));
  await ensureBoardAccess(card.board, req.user);

  const oldIsCompleted = card.isCompleted;
  const oldAssignees = card.assignees ? [...card.assignees] : [];

  const ALLOWED_FIELDS = [
    'title', 'description', 'dueDate', 'isCompleted',
    'labels', 'assignees', 'isArchived', 'cover', 'watchers',
  ];
  ALLOWED_FIELDS.forEach((key) => {
    if (req.body[key] !== undefined) card[key] = req.body[key];
  });
  await card.save();

  if (!oldIsCompleted && card.isCompleted) {
    await Activity.log({
      actor: req.user._id, action: 'card_completed',
      target: card._id,  targetType: 'Card', board: card.board,
    });
  }
  if (req.body.assignees) {
    const oldIds = oldAssignees.map((a) => a.toString());
    const newIds = (req.body.assignees || []).map((a) => a.toString());
    const addedIds   = newIds.filter((id) => !oldIds.includes(id));
    const removedIds = oldIds.filter((id) => !newIds.includes(id));
    const io = req.app?.get?.('io');
    if (addedIds.length > 0) {
      await notify(io, {
        actor:      req.user._id,
        recipients: addedIds,
        type:       'member_added_card',
        title:      'Bạn được giao một card',
        message:    `${req.user.name} đã giao card "${card.title}" cho bạn`,
        link:       `/board/${card.board}`,
        metadata:   { cardId: card._id, cardTitle: card.title, boardId: card.board },
      });
    }
    if (removedIds.length > 0) {
      await notify(io, {
        actor:      req.user._id,
        recipients: removedIds,
        type:       'member_removed_card',
        title:      'Bạn bị bỏ khỏi một card',
        message:    `${req.user.name} đã bỏ bạn khỏi card "${card.title}"`,
        link:       `/board/${card.board}`,
        metadata:   { cardId: card._id, cardTitle: card.title, boardId: card.board },
      });
    }
  }
  const hasContentUpdate = req.body.title || req.body.description || req.body.dueDate !== undefined;
  if (hasContentUpdate && card.assignees?.length > 0) {
    const io = req.app?.get?.('io');
    await notify(io, {
      actor:      req.user._id,
      recipients: card.assignees.map((a) => a._id || a),
      type:       'card_updated',
      title:      'Card bạn phụ trách bị cập nhật',
      message:    `${req.user.name} đã cập nhật card "${card.title}"`,
      link:       `/board/${card.board}`,
      metadata:   { cardId: card._id, cardTitle: card.title, boardId: card.board },
    });
  }
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
  await ensureBoardAccess(card.board, req.user);
  res.status(200).json({ success: true, data: card });
});

// @desc    Add comment to card
// @route   POST /api/cards/:id/comments
exports.addComment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { content, boardId } = req.body;
  const card = await Card.findById(id);
  if (!card) return next(new AppError('Card not found', 404));
  await ensureBoardAccess(card.board, req.user);
  await card.addComment(req.user._id, content);
  const io = req.app.get('io');
  io.to(`board:${boardId}`).emit('comment:added', {
    cardId: id, comment: card.comments[card.comments.length - 1],
  });
  if (card.assignees?.length > 0) {
    await notify(io, {
      actor:      req.user._id,
      recipients: card.assignees.map((a) => a._id || a),
      type:       'comment_added',
      title:      'Bình luận mới trên card của bạn',
      message:    `${req.user.name} đã bình luận: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`,
      link:       `/board/${boardId}`,
      metadata:   { cardId: id, cardTitle: card.title, boardId, comment: content.slice(0, 100) },
    });
  }
  res.status(200).json({ success: true, data: card.comments });
});

// @desc    Update comment
// @route   PUT /api/cards/:id/comments/:commentId
exports.updateComment = asyncHandler(async (req, res, next) => {
  const { content } = req.body;
  if (!content?.trim()) return next(new AppError('Content is required', 400));

  const card = await Card.findById(req.params.id);
  if (!card) return next(new AppError('Card not found', 404));
  await ensureBoardAccess(card.board, req.user);

  const comment = card.comments.id(req.params.commentId);
  if (!comment) return next(new AppError('Comment not found', 404));
  if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('You can only edit your own comments', 403));
  }

  comment.content   = content.trim();
  comment.updatedAt = new Date();
  await card.save();

  const updated = await Card.findById(req.params.id).populate('comments.user', 'name email avatar');
  res.status(200).json({ success: true, data: updated.comments });
});

// @desc    Delete comment
// @route   DELETE /api/cards/:id/comments/:commentId
exports.deleteComment = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.id);
  if (!card) return next(new AppError('Card not found', 404));
  await ensureBoardAccess(card.board, req.user);

  const comment = card.comments.id(req.params.commentId);
  if (!comment) return next(new AppError('Comment not found', 404));
  if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('You can only delete your own comments', 403));
  }

  card.comments.pull({ _id: req.params.commentId });
  await card.save();

  res.status(200).json({ success: true, data: { id: req.params.commentId } });
});

// @desc    Add checklist item
// @route   POST /api/cards/:id/checklist
exports.addChecklistItem = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.id);
  if (!card) return next(new AppError('Card not found', 404));
  await ensureBoardAccess(card.board, req.user);
  await card.addChecklistItem(req.body.text);
  res.status(200).json({ success: true, data: card.checklist });
});

// @desc    Toggle checklist item
// @route   PATCH /api/cards/:id/checklist/:itemId
exports.toggleChecklistItem = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.id);
  if (!card) return next(new AppError('Card not found', 404));
  await ensureBoardAccess(card.board, req.user);
  await card.toggleChecklistItem(req.params.itemId);
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
  if (!checklistItem) return next(new AppError('Checklist item not found', 404));
  const targetCard = await Card.findById(targetCardId);
  if (!targetCard) return next(new AppError('Target card not found', 404));
  if (sourceCard._id.toString() === targetCard._id.toString())
    return next(new AppError('Cannot move checklist item to the same card', 400));
  if (sourceCard.board.toString() !== targetCard.board.toString())
    return next(new AppError('Checklist items can only be moved within the same board', 400));
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

// @desc    Get archived cards for a board
// @route   GET /api/cards/archived
exports.getArchivedCards = asyncHandler(async (req, res, next) => {
  const { boardId } = req.query;
  if (!boardId) return next(new AppError('boardId is required', 400));
  await ensureBoardAccess(boardId, req.user);

  const cards = await Card.find({ board: boardId, isArchived: true })
    .populate('list', 'name')
    .populate('assignees', 'name email avatar')
    .sort({ updatedAt: -1 });

  res.status(200).json({ success: true, data: cards });
});

// @desc    Restore archived card to its original list
// @route   PUT /api/cards/:id/restore
exports.restoreCard = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.id);
  if (!card) return next(new AppError('Card not found', 404));
  await ensureBoardAccess(card.board, req.user);
  if (!card.isArchived) return next(new AppError('Card is not archived', 400));

  card.isArchived = false;
  await card.save();

  await Activity.log({
    actor: req.user._id,
    action: 'card_restored',
    target: card._id,
    targetType: 'Card',
    board: card.board,
  });

  res.status(200).json({ success: true, data: card });
});

// @desc    Delete card (must be archived first)
// @route   DELETE /api/cards/:id
exports.deleteCard = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.id);
  if (!card) return next(new AppError('Card not found', 404));
  await ensureBoardAccess(card.board, req.user);
  if (!card.isArchived) return next(new AppError('Card must be archived before it can be deleted', 400));
  await Card.deleteOne({ _id: req.params.id });
  res.status(200).json({ success: true, data: { id: req.params.id } });
});

// @desc    Duplicate a card
// @route   POST /api/cards/:id/duplicate
exports.duplicateCard = asyncHandler(async (req, res, next) => {
  const source = await Card.findById(req.params.id);
  if (!source) return next(new AppError('Card not found', 404));
  await ensureBoardAccess(source.board, req.user);

  const count = await Card.countDocuments({ list: source.list, isArchived: false });
  const newCard = await Card.create({
    title:       `${source.title} (copy)`,
    description: source.description,
    list:        source.list,
    board:       source.board,
    position:    count,
    labels:      source.labels,
    dueDate:     source.dueDate,
    checklist:   source.checklist.map(item => ({
      text:      item.text,
      completed: false,
    })),
    createdBy: req.user._id,
  });

  await Activity.log({
    actor: req.user._id, action: 'card_created',
    target: newCard._id, targetType: 'Card', board: source.board,
  });

  res.status(201).json({ success: true, data: newCard });
});

// @desc    Toggle watch/unwatch a card
// @route   POST /api/cards/:id/watch
exports.toggleWatcher = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.id);
  if (!card) return next(new AppError('Card not found', 404));
  await ensureBoardAccess(card.board, req.user);

  const userId = req.user._id.toString();
  const idx = (card.watchers || []).findIndex(w => w.toString() === userId);
  let isWatching;
  if (idx > -1) {
    card.watchers.splice(idx, 1);
    isWatching = false;
  } else {
    card.watchers.push(req.user._id);
    isWatching = true;
  }
  await card.save();

  res.status(200).json({ success: true, isWatching, data: card.watchers });
});

// @desc    Get activity log for a card
// @route   GET /api/cards/:id/activity
exports.getCardActivity = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.id).select('board');
  if (!card) return next(new AppError('Card not found', 404));
  await ensureBoardAccess(card.board, req.user);

  const activities = await Activity.find({ target: req.params.id, targetType: 'Card' })
    .populate('actor', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({ success: true, data: activities });
});

// ─────────────────────────────────────────────────────────────
// FILE ATTACHMENT
// ─────────────────────────────────────────────────────────────

// @desc    Upload attachment to card
// @route   POST /api/cards/:id/attachments
// @access  Private
exports.addAttachment = [
  upload.single('file'),
  asyncHandler(async (req, res, next) => {
    const card = await Card.findById(req.params.id);
    if (!card) return next(new AppError('Card not found', 404));
    await ensureBoardAccess(card.board, req.user);
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const attachment = {
      name:       req.file.originalname || req.file.public_id,
      url:        req.file.secure_url || req.file.path,
      type:       req.file.mimetype,
      publicId:   req.file.public_id,
      uploadedBy: req.user._id,
    };

    await card.addAttachment(attachment);

    await Activity.log({
      actor:      req.user._id,
      action:     'attachment_added',
      target:     card._id,
      targetType: 'Card',
      board:      card.board,
      metadata:   { fileName: attachment.name, fileType: attachment.type },
    });

    res.status(201).json({ success: true, data: card.attachments });
  }),
];

// @desc    Delete attachment from card
// @route   DELETE /api/cards/:id/attachments/:attachmentId
// @access  Private
exports.deleteAttachment = asyncHandler(async (req, res, next) => {
  const { id, attachmentId } = req.params;
  const card = await Card.findById(id);
  if (!card) return next(new AppError('Card not found', 404));
  await ensureBoardAccess(card.board, req.user);

  const attachment = card.attachments.id(attachmentId);
  if (!attachment) return next(new AppError('Attachment not found', 404));

  // Xoá file khỏi Cloudinary nếu có publicId
  if (attachment.publicId) {
    try {
      await cloudinary.uploader.destroy(attachment.publicId);
    } catch (err) {
      console.error('Cloudinary delete error:', err.message);
    }
  }

  await card.removeAttachment(attachmentId);

  res.status(200).json({ success: true, data: card.attachments });
});
