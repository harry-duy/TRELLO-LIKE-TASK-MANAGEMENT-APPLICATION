const OpenAI = require('openai');

const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

const client = hasOpenAI
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const safeParseJson = (content, fallback) => {
  try {
    return JSON.parse(content);
  } catch (error) {
    return fallback;
  }
};

const parseChecklistFromText = (content) => {
  const lines = String(content)
    .split('\n')
    .map((line) => line.replace(/^[-*\d).\s]+/, '').trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  return lines.slice(0, 8);
};

const buildFallbackChecklist = ({ title = '', description = '' }) => {
  const text = `${title} ${description}`.toLowerCase();

  const fallback = [
    'Xác định phạm vi công việc và tiêu chí hoàn thành',
    'Thiết kế/chuẩn bị tài nguyên cần thiết',
    'Triển khai chức năng chính',
    'Kiểm tra và xử lý lỗi',
    'Cập nhật tài liệu và bàn giao',
  ];

  if (text.includes('đăng ký') || text.includes('register')) {
    return [
      'Thiết kế giao diện form đăng ký',
      'Thêm validate email và mật khẩu',
      'Kết nối API đăng ký',
      'Xử lý lỗi và thông báo thành công',
      'Test luồng đăng ký end-to-end',
    ];
  }

  if (text.includes('login') || text.includes('đăng nhập')) {
    return [
      'Thiết kế giao diện form đăng nhập',
      'Thêm validate email và mật khẩu',
      'Kết nối API đăng nhập và nhận Token',
      'Lưu Token an toàn (Cookie/Storage)',
      'Xử lý lỗi sai tài khoản hoặc mật khẩu',
    ];
  }

  if (text.includes('api')) {
    return [
      'Thiết kế request/response schema',
      'Implement endpoint và business logic',
      'Thêm validate dữ liệu đầu vào',
      'Xử lý lỗi và phân quyền',
      'Viết test cho endpoint',
    ];
  }

  return fallback;
};

const fallbackSearchFilters = (query = '') => {
  const text = query.toLowerCase();
  const filters = {
    labels: [],
    dueStatus: null,
    keyword: query.trim(),
  };

  if (text.includes('backend')) filters.labels.push('backend');
  if (text.includes('frontend')) filters.labels.push('frontend');
  if (text.includes('bug') || text.includes('lỗi')) filters.labels.push('bug');

  if (text.includes('trễ') || text.includes('quá hạn') || text.includes('overdue')) {
    filters.dueStatus = 'overdue';
  }

  return filters;
};

exports.generateChecklist = async ({ title, description }) => {
  if (!hasOpenAI) {
    return {
      status: 'fallback',
      checklist: buildFallbackChecklist({ title, description }),
      usage: null,
    };
  }

  const start = Date.now();

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert technical project manager. Based on standard real-world best practices (like searching Google for best practices), return only a JSON array of 4-8 concise, actionable checklist items in Vietnamese. Make them very reasonable and logical for the card title (e.g. if the title is "login", suggest UI layout, input validation, calling Auth API, token handling, error handling).',
        },
        {
          role: 'user',
          content: `Task title: ${title}\nTask description: ${description || ''}`,
        },
      ],
    });

    const content = completion.choices?.[0]?.message?.content || '[]';
    const parsed = safeParseJson(content, parseChecklistFromText(content));
    const checklist = Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
      : buildFallbackChecklist({ title, description });

    return {
      status: 'success',
      checklist: checklist.length > 0 ? checklist : buildFallbackChecklist({ title, description }),
      latencyMs: Date.now() - start,
      usage: completion.usage || null,
    };
  } catch (error) {
    return {
      status: 'fallback',
      checklist: buildFallbackChecklist({ title, description }),
      latencyMs: Date.now() - start,
      usage: null,
      error: error.message,
    };
  }
};

exports.extractSearchFilters = async ({ query }) => {
  if (!hasOpenAI) {
    return { status: 'fallback', filters: fallbackSearchFilters(query), usage: null };
  }

  const start = Date.now();

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'Extract Trello card search filters from user query. Return strict JSON object: {"labels": string[], "dueStatus": "overdue"|null, "keyword": string}.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
    });

    const content = completion.choices?.[0]?.message?.content || '{}';
    const parsed = safeParseJson(content, fallbackSearchFilters(query));

    const filters = {
      labels: Array.isArray(parsed.labels)
        ? parsed.labels.map((item) => String(item).toLowerCase().trim()).filter(Boolean)
        : [],
      dueStatus: parsed.dueStatus === 'overdue' ? 'overdue' : null,
      keyword: typeof parsed.keyword === 'string' && parsed.keyword.trim() ? parsed.keyword.trim() : query.trim(),
    };

    return {
      status: 'success',
      filters,
      latencyMs: Date.now() - start,
      usage: completion.usage || null,
    };
  } catch (error) {
    return {
      status: 'fallback',
      filters: fallbackSearchFilters(query),
      latencyMs: Date.now() - start,
      usage: null,
      error: error.message,
    };
  }
};

exports.generateAssistantReply = async ({ message, boardContext }) => {
  const normalizedMessage = String(message || '').trim().toLowerCase();

  const buildFallbackAssistantAnswer = () => {
    const isGreeting = /^(hi|hello|hey|chào|chao|xin chào|yo)\b/i.test(normalizedMessage);

    if (isGreeting) {
      return boardContext
        ? `Chào bạn 👋 Mình đang có ngữ cảnh board ${boardContext.name}. Bạn có thể hỏi: “card nào quá hạn?”, “tóm tắt board”, hoặc “việc nào ưu tiên hôm nay?”.`
        : 'Chào bạn 👋 Mình có thể hỗ trợ tìm card, gợi ý checklist, tóm tắt tiến độ và đề xuất ưu tiên công việc. Bạn muốn bắt đầu từ board nào?';
    }

    if (boardContext) {
      return `Mình đang có ngữ cảnh board ${boardContext.name}. Bạn có thể hỏi cụ thể hơn, ví dụ: “tóm tắt việc đang làm”, “card nào cần xử lý gấp”, hoặc “gợi ý plan 3 bước cho task X”.`;
    }

    return 'Mình chưa có ngữ cảnh board. Bạn mở một board để mình hỗ trợ chính xác hơn, hoặc gửi mục tiêu cụ thể (ví dụ: “lập kế hoạch cho task login API”).';
  };

  if (!normalizedMessage) {
    return {
      status: 'fallback',
      answer: buildFallbackAssistantAnswer(),
      usage: null,
    };
  }

  const contextText = boardContext
    ? `Board: ${boardContext.name}\nCards: ${boardContext.cards
        .map((card) => `- ${card.title}${card.listName ? ` (list: ${card.listName})` : ''}`)
        .join('\n')}`
    : 'No board context provided.';

  if (!hasOpenAI) {
    return {
      status: 'fallback',
      answer: buildFallbackAssistantAnswer(),
      usage: null,
    };
  }

  const start = Date.now();

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You are an AI assistant for a Trello-like task management app. Reply concisely in Vietnamese with practical next steps.',
        },
        {
          role: 'user',
          content: `User message: ${message}\n\nContext:\n${contextText}`,
        },
      ],
    });

    const content = completion.choices?.[0]?.message?.content || '';

    return {
      status: 'success',
      answer: content.trim() || 'Mình chưa có đủ thông tin để trả lời, bạn mô tả cụ thể hơn nhé.',
      latencyMs: Date.now() - start,
      usage: completion.usage || null,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[AI assistant fallback]', error.message);
    }

    return {
      status: 'fallback',
      answer: buildFallbackAssistantAnswer(),
      latencyMs: Date.now() - start,
      usage: null,
      error: error.message,
    };
  }
};
