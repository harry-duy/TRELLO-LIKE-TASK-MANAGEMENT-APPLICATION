const Card = require('../models/card.model');
const Board = require('../models/board.model');
const List = require('../models/list.model');
const Workspace = require('../models/workspace.model');
const AIUsage = require('../models/aiUsage.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const {
  extractSearchFilters,
  generateChecklist,
  generateAssistantReply,
} = require('../services/ai.service');

const getAccessibleWorkspaceIds = async (userId) => {
  const workspaces = await Workspace.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
  }).select('_id');

  return workspaces.map((workspace) => workspace._id);
};

const parseCreateBoardIntent = (message) => {
  const text = String(message || '').trim();
  const patterns = [
    /(?:tạo|tao|create)\s+board(?:\s+tên|\s+name)?\s*[:\-]?\s*["']?([^"'|]+?)["']?(?:\s*(?:\||trong|in)\s*workspace\s*["']?([^"']+)["']?)?$/i,
    /board\s*[:\-]\s*([^|]+?)(?:\|\s*workspace\s*[:\-]?\s*(.+))?$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        boardName: (match[1] || '').trim(),
        workspaceName: (match[2] || '').trim() || null,
      };
    }
  }

  return null;
};

const parseCreateCardIntent = (message) => {
  const text = String(message || '').trim();
  const patterns = [
    /(?:tạo|tao|create)\s+card(?:\s+tên|\s+name)?\s*[:\-]?\s*["']?([^"'|]+?)["']?(?:\s*(?:\||trong|in)\s*board\s*["']?([^"'|]+)["']?)?(?:\s*(?:\||list)\s*["']?([^"']+)["']?)?$/i,
    /card\s*[:\-]\s*([^|]+?)(?:\|\s*board\s*[:\-]?\s*([^|]+))?(?:\|\s*list\s*[:\-]?\s*(.+))?$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        cardTitle: (match[1] || '').trim(),
        boardName: (match[2] || '').trim() || null,
        listName: (match[3] || '').trim() || null,
      };
    }
  }

  return null;
};

const trackUsage = async ({ userId, feature, query, result, metadata = {} }) => {
  try {
    await AIUsage.create({
      user: userId,
      feature,
      query,
      status: result.status || 'success',
      latencyMs: result.latencyMs || 0,
      promptTokens: result.usage?.prompt_tokens || 0,
      completionTokens: result.usage?.completion_tokens || 0,
      totalTokens: result.usage?.total_tokens || 0,
      metadata,
    });
  } catch (error) {
    // swallow logging errors
  }
};

exports.searchCardsByNaturalLanguage = asyncHandler(async (req, res, next) => {
  const { boardId, query } = req.body;

  if (!boardId || !query?.trim()) {
    return next(new AppError('boardId and query are required', 400));
  }

  const board = await Board.findById(boardId);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  const parsed = await extractSearchFilters({ query: query.trim() });
  const filters = parsed.filters;

  const mongoQuery = {
    board: boardId,
    isArchived: false,
  };

  if (filters.keyword) {
    const escaped = filters.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    mongoQuery.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
    ];
  }

  if (filters.labels?.length) {
    mongoQuery.labels = { $in: filters.labels };
  }

  if (filters.dueStatus === 'overdue') {
    mongoQuery.dueDate = { $lt: new Date() };
    mongoQuery.isCompleted = false;
  }

  const cards = await Card.find(mongoQuery)
    .select('title description dueDate labels list board isCompleted')
    .populate('list', 'name')
    .sort({ updatedAt: -1 })
    .limit(50);

  await trackUsage({
    userId: req.user._id,
    feature: 'ai_search',
    query: query.trim(),
    result: parsed,
    metadata: {
      boardId,
      matchedCards: cards.length,
      filters,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      filters,
      cards,
      matched: cards.length,
      aiStatus: parsed.status,
    },
  });
});

exports.suggestChecklist = asyncHandler(async (req, res, next) => {
  const { title, description, language } = req.body;

  if (!title?.trim()) {
    return next(new AppError('title is required', 400));
  }

  const result = await generateChecklist({
    title: title.trim(),
    description: description || '',
    language: language || 'vi',
  });

  await trackUsage({
    userId: req.user._id,
    feature: 'auto_checklist',
    query: title.trim(),
    result,
    metadata: {
      suggestionCount: result.checklist?.length || 0,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      checklist: result.checklist,
      aiStatus: result.status,
    },
  });
});

exports.chatAssistant = asyncHandler(async (req, res, next) => {
  const { message, boardId, language } = req.body;
  const lang = language === 'en' ? 'en' : 'vi';
  const isEn = lang === 'en';

  if (!message?.trim()) {
    return next(new AppError('message is required', 400));
  }

  let boardContext = null;
  const normalizedMessage = message.trim().toLowerCase();

  if (boardId) {
    const board = await Board.findById(boardId).select('name workspace');
    if (!board) {
      return next(new AppError('Board not found', 404));
    }

    const workspace = await Workspace.findById(board.workspace).select('owner members');
    if (!workspace) {
      return next(new AppError('Workspace not found', 404));
    }

    const isOwner = workspace.owner?.toString() === req.user._id.toString();
    const isMember = (workspace.members || []).some(
      (member) => member.user?.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember && req.user.role !== 'admin') {
      return next(new AppError('Not authorized to access this board context', 403));
    }

    const relatedCards = await Card.find({
      board: boardId,
      isArchived: false,
    })
      .populate('list', 'name')
      .select('title list')
      .sort({ updatedAt: -1 })
      .limit(8);

    boardContext = {
      id: boardId,
      name: board.name,
      cards: relatedCards.map((card) => ({
        id: card._id,
        title: card.title,
        listName: card.list?.name || null,
      })),
    };
  } else {
    const workspaceIds = await getAccessibleWorkspaceIds(req.user._id);
    const createBoardIntent = parseCreateBoardIntent(normalizedMessage);
    const createCardIntent = parseCreateCardIntent(normalizedMessage);

    if (createBoardIntent?.boardName) {
      const workspaceQuery = {
        _id: { $in: workspaceIds },
      };

      if (createBoardIntent.workspaceName) {
        workspaceQuery.name = {
          $regex: `^${createBoardIntent.workspaceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          $options: 'i',
        };
      }

      const targetWorkspace = await Workspace.findOne(workspaceQuery).sort({ updatedAt: -1 });

      if (!targetWorkspace) {
        const result = {
          status: 'fallback',
          answer: createBoardIntent.workspaceName
            ? (isEn
                ? `I could not find workspace "${createBoardIntent.workspaceName}" within your accessible workspaces.`
                : `Mình không tìm thấy workspace "${createBoardIntent.workspaceName}" trong phạm vi bạn truy cập được.`)
            : (isEn
                ? 'You do not have a suitable workspace to create a board. Please create a workspace first.'
                : 'Bạn chưa có workspace phù hợp để tạo board. Hãy tạo workspace trước nhé.'),
        };

        await trackUsage({
          userId: req.user._id,
          feature: 'assistant_chat',
          query: message.trim(),
          result,
          metadata: { intent: 'create_board_failed' },
        });

        return res.status(200).json({ success: true, data: { answer: result.answer, aiStatus: result.status, boardContext: null } });
      }

      const newBoard = await Board.create({
        name: createBoardIntent.boardName,
        workspace: targetWorkspace._id,
        createdBy: req.user._id,
      });

      const todoList = await List.create({
        name: 'To Do',
        board: newBoard._id,
      });

      const result = {
        status: 'success',
        answer: isEn
          ? `Board "${newBoard.name}" created in workspace "${targetWorkspace.name}". I also created a "${todoList.name}" list. Go to /board/${newBoard._id} to get started.`
          : `Đã tạo board "${newBoard.name}" trong workspace "${targetWorkspace.name}". Mình cũng tạo sẵn list "${todoList.name}". Bạn vào /board/${newBoard._id} để bắt đầu.`,
      };

      await trackUsage({
        userId: req.user._id,
        feature: 'assistant_chat',
        query: message.trim(),
        result,
        metadata: {
          intent: 'create_board',
          boardId: newBoard._id,
          workspaceId: targetWorkspace._id,
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          answer: result.answer,
          aiStatus: result.status,
          boardContext: {
            id: newBoard._id,
            name: newBoard.name,
            cards: [],
          },
        },
      });
    }

    if (createCardIntent?.cardTitle) {
      const targetBoardQuery = {
        workspace: { $in: workspaceIds },
        isClosed: false,
      };

      if (createCardIntent.boardName) {
        targetBoardQuery.name = {
          $regex: `^${createCardIntent.boardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          $options: 'i',
        };
      }

      const targetBoard = boardId
        ? await Board.findOne({ _id: boardId, workspace: { $in: workspaceIds } })
        : await Board.findOne(targetBoardQuery).sort({ updatedAt: -1 });

      if (!targetBoard) {
        const result = {
          status: 'fallback',
          answer: isEn
            ? 'I could not find a suitable board to create the card. Open a board first or specify the board name in your command.'
            : 'Mình không tìm được board phù hợp để tạo card. Bạn mở board trước hoặc chỉ rõ tên board trong lệnh.',
        };

        await trackUsage({
          userId: req.user._id,
          feature: 'assistant_chat',
          query: message.trim(),
          result,
          metadata: { intent: 'create_card_failed' },
        });

        return res.status(200).json({ success: true, data: { answer: result.answer, aiStatus: result.status, boardContext: null } });
      }

      let targetList = null;

      if (createCardIntent.listName) {
        targetList = await List.findOne({
          board: targetBoard._id,
          isArchived: false,
          name: {
            $regex: `^${createCardIntent.listName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            $options: 'i',
          },
        });
      }

      if (!targetList) {
        targetList = await List.findOne({ board: targetBoard._id, isArchived: false }).sort({ position: 1 });
      }

      if (!targetList) {
        targetList = await List.create({ name: 'To Do', board: targetBoard._id });
      }

      const newCard = await Card.create({
        title: createCardIntent.cardTitle,
        list: targetList._id,
        board: targetBoard._id,
        createdBy: req.user._id,
      });

      const result = {
        status: 'success',
        answer: isEn
          ? `Card "${newCard.title}" created in board "${targetBoard.name}" (list "${targetList.name}").`
          : `Đã tạo card "${newCard.title}" trong board "${targetBoard.name}" (list "${targetList.name}").`,
      };

      await trackUsage({
        userId: req.user._id,
        feature: 'assistant_chat',
        query: message.trim(),
        result,
        metadata: {
          intent: 'create_card',
          boardId: targetBoard._id,
          listId: targetList._id,
          cardId: newCard._id,
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          answer: result.answer,
          aiStatus: result.status,
          boardContext: {
            id: targetBoard._id,
            name: targetBoard.name,
            cards: [
              {
                id: newCard._id,
                title: newCard.title,
                listName: targetList.name,
              },
            ],
          },
        },
      });
    }

    const asksForBoards = /(check board|list board|danh sách board|board nào|xem board|tom tat board|tóm tắt board)/i.test(normalizedMessage);
    const asksForPriorities = /(ưu tiên|priority|quá hạn|overdue|việc gấp|urgent)/i.test(normalizedMessage);

    if (asksForBoards) {
      const boards = await Board.find({
        workspace: { $in: workspaceIds },
        isClosed: false,
      })
        .select('_id name updatedAt')
        .sort({ updatedAt: -1 })
        .limit(8);

      const boardLines = boards.length
        ? boards
            .map((boardItem, index) => `${index + 1}. ${boardItem.name} (/board/${boardItem._id})`)
            .join('\n')
        : (isEn ? 'No open boards found.' : 'Hiện chưa có board nào đang mở.');

      const result = {
        status: 'success',
        answer: isEn
          ? `Here are the boards you can access:\n${boardLines}\n\nOpen a board and send “summarize this board” for a detailed analysis.`
          : `Đây là các board bạn có thể truy cập:\n${boardLines}\n\nBạn mở 1 board rồi nhắn “tóm tắt board này” để mình phân tích chi tiết.`,
      };

      await trackUsage({
        userId: req.user._id,
        feature: 'assistant_chat',
        query: message.trim(),
        result,
        metadata: {
          boardId: null,
          withContext: false,
          intent: 'list_boards',
          returnedBoards: boards.length,
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          answer: result.answer,
          aiStatus: result.status,
          boardContext: null,
        },
      });
    }

    if (asksForPriorities) {
      const overdueCards = await Card.find({
        board: { $in: await Board.find({ workspace: { $in: workspaceIds } }).distinct('_id') },
        isArchived: false,
        isCompleted: false,
        dueDate: { $lt: new Date() },
      })
        .populate('board', 'name')
        .populate('list', 'name')
        .select('title dueDate board list')
        .sort({ dueDate: 1 })
        .limit(8);

      const priorityLines = overdueCards.length
        ? overdueCards
            .map(
              (cardItem, index) =>
                `${index + 1}. ${cardItem.title} | Board: ${cardItem.board?.name || 'N/A'} | List: ${cardItem.list?.name || 'N/A'} | Due: ${new Date(cardItem.dueDate).toLocaleDateString()}`
            )
            .join('\n')
        : (isEn ? 'No overdue cards within your accessible scope.' : 'Không có card quá hạn trong phạm vi bạn có thể truy cập.');

      const result = {
        status: 'success',
        answer: isEn
          ? `Priority list (overdue cards):\n${priorityLines}`
          : `Danh sách ưu tiên (card quá hạn):\n${priorityLines}`,
      };

      await trackUsage({
        userId: req.user._id,
        feature: 'assistant_chat',
        query: message.trim(),
        result,
        metadata: {
          boardId: null,
          withContext: false,
          intent: 'overdue_priorities',
          returnedCards: overdueCards.length,
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          answer: result.answer,
          aiStatus: result.status,
          boardContext: null,
        },
      });
    }

    const recentCards = await Card.find({
      board: { $in: await Board.find({ workspace: { $in: workspaceIds } }).distinct('_id') },
      isArchived: false,
    })
      .populate('board', 'name')
      .populate('list', 'name')
      .select('title board list')
      .sort({ updatedAt: -1 })
      .limit(8);

    boardContext = {
      id: null,
      name: isEn ? 'Your boards' : 'Các board của bạn',
      cards: recentCards.map((cardItem) => ({
        id: cardItem._id,
        title: `[${cardItem.board?.name || 'Board'}] ${cardItem.title}`,
        listName: cardItem.list?.name || null,
      })),
    };
  }

  const result = await generateAssistantReply({
    message: message.trim(),
    boardContext,
    language: lang,
  });

  await trackUsage({
    userId: req.user._id,
    feature: 'assistant_chat',
    query: message.trim(),
    result,
    metadata: {
      boardId: boardId || null,
      withContext: Boolean(boardContext),
    },
  });

  res.status(200).json({
    success: true,
    data: {
      answer: result.answer,
      aiStatus: result.status,
      boardContext,
    },
  });
});
