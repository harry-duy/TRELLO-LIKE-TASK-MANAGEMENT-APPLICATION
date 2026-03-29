const Card = require('../models/card.model');
const Board = require('../models/board.model');
const Workspace = require('../models/workspace.model');
const Activity = require('../models/activity.model');
const User = require('../models/user.model');
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

const getBoardWorkspaceId = async (boardId) => {
  const board = await Board.findById(boardId).select('workspace');
  if (!board) return null;
  return board.workspace || null;
};

const toIdStrings = (items = []) =>
  items.map((item) => item?.toString?.() || String(item)).filter(Boolean);

const normalizeDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
exports.createCard = asyncHandler(async (req, res) => {
  const { title, listId, boardId } = req.body;
  const workspaceId = await getBoardWorkspaceId(boardId);
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
    workspace: workspaceId,
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
  const workspaceId = await getBoardWorkspaceId(card.board);
  const oldListId = card.list;
  await card.moveToList(listId, position);
  await Activity.log({
    actor: req.user._id,
    action: 'card_moved',
    target: card._id,
    targetType: 'Card',
    board: boardId,
    workspace: workspaceId,
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

  const oldIsCompleted = card.isCompleted;
  const oldAssignees = card.assignees ? [...card.assignees] : [];
  const oldLabels = [...(card.labels || [])];
  const oldDueDate = card.dueDate;
  const workspaceId = await getBoardWorkspaceId(card.board);

  Object.keys(req.body).forEach((key) => {
    card[key] = req.body[key];
  });
  await card.save();

  const io = req.app?.get?.('io');
  const activityTasks = [];

  if (!oldIsCompleted && card.isCompleted) {
    activityTasks.push(Activity.log({
      actor: req.user._id, action: 'card_completed',
      target: card._id,  targetType: 'Card', board: card.board, workspace: workspaceId,
    }));
  }
  if (req.body.assignees) {
    const oldIds = oldAssignees.map((a) => a.toString());
    const newIds = (req.body.assignees || []).map((a) => a.toString());
    const addedIds   = newIds.filter((id) => !oldIds.includes(id));
    const removedIds = oldIds.filter((id) => !newIds.includes(id));
    const changedAssigneeIds = [...addedIds, ...removedIds];
    const changedUsers = changedAssigneeIds.length
      ? await User.find({ _id: { $in: changedAssigneeIds } }).select('name')
      : [];
    const nameById = new Map(changedUsers.map((user) => [user._id.toString(), user.name]));

    addedIds.forEach((assigneeId) => {
      activityTasks.push(Activity.log({
        actor: req.user._id,
        action: 'member_assigned',
        target: card._id,
        targetType: 'Card',
        board: card.board,
        workspace: workspaceId,
        metadata: {
          assigneeId,
          assigneeName: nameById.get(assigneeId) || assigneeId,
        },
      }));
    });

    removedIds.forEach((assigneeId) => {
      activityTasks.push(Activity.log({
        actor: req.user._id,
        action: 'member_unassigned',
        target: card._id,
        targetType: 'Card',
        board: card.board,
        workspace: workspaceId,
        metadata: {
          assigneeId,
          assigneeName: nameById.get(assigneeId) || assigneeId,
        },
      }));
    });

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
  if (req.body.labels) {
    const addedLabels = card.labels.filter((label) => !oldLabels.includes(label));
    const removedLabels = oldLabels.filter((label) => !card.labels.includes(label));

    addedLabels.forEach((label) => {
      activityTasks.push(Activity.log({
        actor: req.user._id,
        action: 'label_added',
        target: card._id,
        targetType: 'Card',
        board: card.board,
        workspace: workspaceId,
        metadata: { label },
      }));
    });

    removedLabels.forEach((label) => {
      activityTasks.push(Activity.log({
        actor: req.user._id,
        action: 'label_removed',
        target: card._id,
        targetType: 'Card',
        board: card.board,
        workspace: workspaceId,
        metadata: { label },
      }));
    });
  }

  if (req.body.dueDate !== undefined && normalizeDateValue(oldDueDate) !== normalizeDateValue(card.dueDate)) {
    activityTasks.push(Activity.log({
      actor: req.user._id,
      action: 'due_date_changed',
      target: card._id,
      targetType: 'Card',
      board: card.board,
      workspace: workspaceId,
      metadata: {
        previousDueDate: normalizeDateValue(oldDueDate),
        nextDueDate: normalizeDateValue(card.dueDate),
      },
    }));
  }

  const changedFields = Object.keys(req.body).filter((key) => !['isCompleted', 'assignees', 'labels', 'dueDate'].includes(key));
  if (changedFields.length > 0) {
    activityTasks.push(Activity.log({
      actor: req.user._id,
      action: 'card_updated',
      target: card._id,
      targetType: 'Card',
      board: card.board,
      workspace: workspaceId,
      metadata: { fields: changedFields },
    }));
  }

  const hasContentUpdate = req.body.title || req.body.description || req.body.dueDate !== undefined;
  if (hasContentUpdate && card.assignees?.length > 0) {
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

  await Promise.all(activityTasks);

  io?.to(`board:${card.board}`).emit('card:updated', {
    cardId: card._id,
    updates: req.body,
    updatedBy: req.user._id,
  });

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
  const workspaceId = await getBoardWorkspaceId(card.board);
  await card.addComment(req.user._id, content);
  await Activity.log({
    actor: req.user._id,
    action: 'comment_added',
    target: card._id,
    targetType: 'Card',
    board: card.board,
    workspace: workspaceId,
    metadata: {
      commentPreview: content.slice(0, 120),
    },
  });
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

// @desc    Add checklist item
// @route   POST /api/cards/:id/checklist
exports.addChecklistItem = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.id);
  if (!card) return next(new AppError('Card not found', 404));
  await card.addChecklistItem(req.body.text);
  res.status(200).json({ success: true, data: card.checklist });
});

// @desc    Toggle checklist item
// @route   PATCH /api/cards/:id/checklist/:itemId
exports.toggleChecklistItem = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.id);
  if (!card) return next(new AppError('Card not found', 404));
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

// @desc    Delete card
// @route   DELETE /api/cards/:id
exports.deleteCard = asyncHandler(async (req, res, next) => {
  const card = await Card.findById(req.params.id);
  if (!card) return next(new AppError('Card not found', 404));
  const workspaceId = await getBoardWorkspaceId(card.board);
  await Activity.log({
    actor: req.user._id,
    action: 'card_deleted',
    target: card._id,
    targetType: 'Card',
    board: card.board,
    workspace: workspaceId,
    metadata: {
      cardTitle: card.title,
      assignees: toIdStrings(card.assignees),
    },
  });
  await Card.deleteOne({ _id: req.params.id });
  res.status(200).json({ success: true, data: { id: req.params.id } });
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
      workspace:  await getBoardWorkspaceId(card.board),
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
