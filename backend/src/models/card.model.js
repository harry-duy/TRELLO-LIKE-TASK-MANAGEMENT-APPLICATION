const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Card title is required'],
      trim: true,
      maxlength: [200, 'Card title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      trim: true,
    },
    list: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'List',
      required: [true, 'Card must belong to a list'],
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: [true, 'Card must belong to a board'],
    },
    position: {
      type: Number,
      required: true,
      default: 0,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    labels: [
      {
        type: String,
        trim: true,
      },
    ],
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    checklist: [
      {
        text: {
          type: String,
          required: true,
          maxlength: 200,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    attachments: [
      {
        name: String,
        url: String,
        type: String, // image, pdf, etc.
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        content: {
          type: String,
          required: true,
          maxlength: 1000,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
cardSchema.index({ list: 1, position: 1 });
cardSchema.index({ board: 1 });
cardSchema.index({ assignees: 1 });
cardSchema.index({ dueDate: 1 });
cardSchema.index({ labels: 1 });
cardSchema.index({ title: 'text', description: 'text' });
cardSchema.index({ isArchived: 1, list: 1 });

// Virtual: Check if card is overdue
cardSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate || this.isCompleted) return false;
  return new Date() > this.dueDate;
});

// Virtual: Checklist progress
cardSchema.virtual('checklistProgress').get(function () {
  if (!this.checklist || this.checklist.length === 0) {
    return { total: 0, completed: 0, percentage: 0 };
  }
  
  const total = this.checklist.length;
  const completed = this.checklist.filter((item) => item.completed).length;
  const percentage = Math.round((completed / total) * 100);
  
  return { total, completed, percentage };
});

// Pre-save middleware: Set position if not provided
cardSchema.pre('save', async function (next) {
  if (this.isNew && this.position === 0) {
    const count = await this.constructor.countDocuments({
      list: this.list,
      isArchived: false,
    });
    this.position = count;
  }
  
  // Update completedAt when card is marked as completed
  if (this.isModified('isCompleted')) {
    this.completedAt = this.isCompleted ? new Date() : null;
  }
  
  next();
});

// Instance method: Add comment
cardSchema.methods.addComment = function (userId, content) {
  this.comments.push({
    user: userId,
    content,
  });
  return this.save();
};

// Instance method: Update comment
cardSchema.methods.updateComment = function (commentId, content) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');
  
  comment.content = content;
  comment.updatedAt = new Date();
  return this.save();
};

// Instance method: Delete comment
cardSchema.methods.deleteComment = function (commentId) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');
  
  comment.remove();
  return this.save();
};

// Instance method: Add checklist item
cardSchema.methods.addChecklistItem = function (text) {
  this.checklist.push({ text, completed: false });
  return this.save();
};

// Instance method: Toggle checklist item
cardSchema.methods.toggleChecklistItem = function (itemId) {
  const item = this.checklist.id(itemId);
  if (!item) throw new Error('Checklist item not found');
  
  item.completed = !item.completed;
  item.completedAt = item.completed ? new Date() : null;
  return this.save();
};

// Instance method: Add attachment
cardSchema.methods.addAttachment = function (attachment) {
  this.attachments.push(attachment);
  return this.save();
};

// Instance method: Remove attachment
cardSchema.methods.removeAttachment = function (attachmentId) {
  const attachment = this.attachments.id(attachmentId);
  if (!attachment) throw new Error('Attachment not found');
  
  attachment.remove();
  return this.save();
};

// Instance method: Move to list
cardSchema.methods.moveToList = async function (newListId, newPosition) {
  const oldListId = this.list;
  this.list = newListId;
  this.position = newPosition;
  
  await this.save();
  
  // Reorder cards in old list
  await this.constructor.reorderCards(oldListId);
  // Reorder cards in new list
  await this.constructor.reorderCards(newListId);
  
  return this;
};

// Static method: Reorder cards in a list
cardSchema.statics.reorderCards = async function (listId) {
  const cards = await this.find({ list: listId, isArchived: false })
    .sort({ position: 1 });
  
  const bulkOps = cards.map((card, index) => ({
    updateOne: {
      filter: { _id: card._id },
      update: { $set: { position: index } },
    },
  }));
  
  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }
};

// Static method: Search cards
cardSchema.statics.search = function (boardId, filters = {}) {
  const query = { board: boardId, isArchived: false };
  
  if (filters.keyword) {
    query.$text = { $search: filters.keyword };
  }
  
  if (filters.labels && filters.labels.length > 0) {
    query.labels = { $in: filters.labels };
  }
  
  if (filters.assignees && filters.assignees.length > 0) {
    query.assignees = { $in: filters.assignees };
  }
  
  if (filters.dueDateStatus) {
    const now = new Date();
    if (filters.dueDateStatus === 'overdue') {
      query.dueDate = { $lt: now };
      query.isCompleted = false;
    } else if (filters.dueDateStatus === 'due-soon') {
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      query.dueDate = { $gte: now, $lte: threeDaysFromNow };
      query.isCompleted = false;
    }
  }
  
  return this.find(query)
    .populate('assignees', 'name email avatar')
    .populate('list', 'name')
    .sort({ position: 1 });
};

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;