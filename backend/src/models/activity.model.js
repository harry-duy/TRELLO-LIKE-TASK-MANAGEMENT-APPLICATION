const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Activity must have an actor'],
    },
    action: {
      type: String,
      required: [true, 'Activity must have an action'],
      enum: [
        // Card actions
        'card_created',
        'card_updated',
        'card_deleted',
        'card_moved',
        'card_archived',
        'card_restored',
        'card_completed',
        
        // Comment actions
        'comment_added',
        'comment_updated',
        'comment_deleted',
        
        // Assignment actions
        'member_assigned',
        'member_unassigned',
        
        // Checklist actions
        'checklist_item_added',
        'checklist_item_completed',
        'checklist_item_uncompleted',
        
        // List actions
        'list_created',
        'list_updated',
        'list_deleted',
        'list_archived',
        
        // Board actions
        'board_created',
        'board_updated',
        'board_deleted',
        
        // Workspace actions
        'workspace_created',
        'workspace_updated',
        'workspace_member_added',
        'workspace_member_removed',
        
        // Other
        'due_date_changed',
        'label_added',
        'label_removed',
        'attachment_added',
        'attachment_removed',
      ],
    },
    targetType: {
      type: String,
      required: true,
      enum: ['Card', 'List', 'Board', 'Workspace', 'Comment'],
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'targetType',
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
activitySchema.index({ board: 1, createdAt: -1 });
activitySchema.index({ workspace: 1, createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });
activitySchema.index({ target: 1, targetType: 1 });

// Static method: Create activity log
activitySchema.statics.log = async function (activityData) {
  try {
    const activity = await this.create(activityData);
    return activity;
  } catch (error) {
    console.error('Error creating activity log:', error);
    // Don't throw error - logging failure shouldn't break the main operation
    return null;
  }
};

// Static method: Get board activities
activitySchema.statics.getBoardActivities = function (boardId, options = {}) {
  const limit = options.limit || 50;
  const page = options.page || 1;
  const skip = (page - 1) * limit;
  
  return this.find({ board: boardId })
    .populate('actor', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method: Get workspace activities
activitySchema.statics.getWorkspaceActivities = function (workspaceId, options = {}) {
  const limit = options.limit || 50;
  const page = options.page || 1;
  const skip = (page - 1) * limit;
  
  return this.find({ workspace: workspaceId })
    .populate('actor', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method: Get card activities
activitySchema.statics.getCardActivities = function (cardId) {
  return this.find({ target: cardId, targetType: 'Card' })
    .populate('actor', 'name email avatar')
    .sort({ createdAt: -1 });
};

// Static method: Get user activities
activitySchema.statics.getUserActivities = function (userId, options = {}) {
  const limit = options.limit || 50;
  const page = options.page || 1;
  const skip = (page - 1) * limit;
  
  return this.find({ actor: userId })
    .populate('actor', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Instance method: Format activity message
activitySchema.methods.formatMessage = function () {
  const actionMessages = {
    card_created: 'created card',
    card_updated: 'updated card',
    card_deleted: 'deleted card',
    card_moved: `moved card from ${this.metadata.fromList} to ${this.metadata.toList}`,
    card_archived: 'archived card',
    card_restored: 'restored card',
    card_completed: 'completed card',
    comment_added: 'added a comment',
    comment_updated: 'updated a comment',
    comment_deleted: 'deleted a comment',
    member_assigned: `assigned ${this.metadata.assigneeName} to card`,
    member_unassigned: `unassigned ${this.metadata.assigneeName} from card`,
    checklist_item_added: 'added a checklist item',
    checklist_item_completed: 'completed a checklist item',
    checklist_item_uncompleted: 'uncompleted a checklist item',
    list_created: 'created list',
    list_updated: 'updated list',
    list_deleted: 'deleted list',
    list_archived: 'archived list',
    board_created: 'created board',
    board_updated: 'updated board',
    board_deleted: 'deleted board',
    workspace_created: 'created workspace',
    workspace_updated: 'updated workspace',
    workspace_member_added: `added ${this.metadata.memberName} to workspace`,
    workspace_member_removed: `removed ${this.metadata.memberName} from workspace`,
    due_date_changed: 'changed due date',
    label_added: `added label "${this.metadata.label}"`,
    label_removed: `removed label "${this.metadata.label}"`,
    attachment_added: 'added an attachment',
    attachment_removed: 'removed an attachment',
  };
  
  return actionMessages[this.action] || this.action;
};

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;