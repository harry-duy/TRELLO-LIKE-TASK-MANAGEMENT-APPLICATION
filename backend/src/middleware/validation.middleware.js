const { z } = require('zod');
const { AppError } = require('./errorHandler');

// Validate request with Zod schema
const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return next(
          new AppError(
            `Validation Error: ${errors.map((e) => e.message).join(', ')}`,
            400
          )
        );
      }
      next(error);
    }
  };
};

// Common validation schemas
const commonSchemas = {
  // MongoDB ObjectId validation
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),

  // Email validation
  email: z.string().email('Invalid email address'),

  // Password validation
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
  }),

  // Sorting
  sort: z.enum(['asc', 'desc', 'ascending', 'descending']).optional(),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};

// Auth validation schemas
const authSchemas = {
  register: z.object({
    body: z.object({
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: commonSchemas.email,
      password: commonSchemas.password,
      confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
  }),

  login: z.object({
    body: z.object({
      email: commonSchemas.email,
      password: z.string().min(1, 'Password is required'),
    }),
  }),

  forgotPassword: z.object({
    body: z.object({
      email: commonSchemas.email,
    }),
  }),

  resetPassword: z.object({
    body: z.object({
      password: commonSchemas.password,
      confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
    params: z.object({
      token: z.string(),
    }),
  }),
};

// Workspace validation schemas
const workspaceSchemas = {
  create: z.object({
    body: z.object({
      name: z.string().min(1, 'Workspace name is required').max(100),
      description: z.string().max(500).optional(),
      visibility: z.enum(['private', 'public']).default('private'),
    }),
  }),

  update: z.object({
    body: z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      visibility: z.enum(['private', 'public']).optional(),
    }),
    params: z.object({
      id: commonSchemas.objectId,
    }),
  }),

  addMember: z.object({
    body: z.object({
      userId: commonSchemas.objectId,
      role: z.enum(['admin', 'member']).default('member'),
    }),
    params: z.object({
      id: commonSchemas.objectId,
    }),
  }),
};

// Board validation schemas
const boardSchemas = {
  create: z.object({
    body: z.object({
      name: z.string().min(1, 'Board name is required').max(100),
      description: z.string().max(500).optional(),
      workspaceId: commonSchemas.objectId,
      background: z.string().optional(),
    }),
  }),

  update: z.object({
    body: z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      background: z.string().optional(),
      isClosed: z.boolean().optional(),
    }),
    params: z.object({
      id: commonSchemas.objectId,
    }),
  }),
};

// List validation schemas
const listSchemas = {
  create: z.object({
    body: z.object({
      name: z.string().min(1, 'List name is required').max(100),
      boardId: commonSchemas.objectId,
      position: z.number().int().nonnegative().optional(),
    }),
  }),

  update: z.object({
    body: z.object({
      name: z.string().min(1).max(100).optional(),
      position: z.number().int().nonnegative().optional(),
    }),
    params: z.object({
      id: commonSchemas.objectId,
    }),
  }),
};

// Card validation schemas
const cardSchemas = {
  create: z.object({
    body: z.object({
      title: z.string().min(1, 'Card title is required').max(200),
      description: z.string().max(2000).optional(),
      listId: commonSchemas.objectId,
      position: z.number().int().nonnegative().optional(),
      dueDate: z.string().datetime().optional(),
      labels: z.array(z.string()).optional(),
      assignees: z.array(commonSchemas.objectId).optional(),
    }),
  }),

  update: z.object({
    body: z.object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      dueDate: z.string().datetime().nullable().optional(),
      labels: z.array(z.string()).optional(),
      assignees: z.array(commonSchemas.objectId).optional(),
      position: z.number().int().nonnegative().optional(),
    }),
    params: z.object({
      id: commonSchemas.objectId,
    }),
  }),

  move: z.object({
    body: z.object({
      listId: commonSchemas.objectId,
      position: z.number().int().nonnegative(),
    }),
    params: z.object({
      id: commonSchemas.objectId,
    }),
  }),

  addComment: z.object({
    body: z.object({
      content: z.string().min(1, 'Comment cannot be empty').max(1000),
    }),
    params: z.object({
      id: commonSchemas.objectId,
    }),
  }),

  addChecklist: z.object({
    body: z.object({
      items: z.array(z.object({
        text: z.string().min(1).max(200),
        completed: z.boolean().default(false),
      })).min(1, 'At least one checklist item is required'),
    }),
    params: z.object({
      id: commonSchemas.objectId,
    }),
  }),
};

module.exports = {
  validate,
  commonSchemas,
  authSchemas,
  workspaceSchemas,
  boardSchemas,
  listSchemas,
  cardSchemas,
};