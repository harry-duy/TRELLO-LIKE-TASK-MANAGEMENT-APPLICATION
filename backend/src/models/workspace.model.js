const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [100, 'Workspace name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Workspace must have an owner'],
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['admin', 'member'],
          default: 'member',
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    visibility: {
      type: String,
      enum: ['private', 'public'],
      default: 'private',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });
workspaceSchema.index({ name: 'text', description: 'text' });

// Virtual populate boards
workspaceSchema.virtual('boards', {
  ref: 'Board',
  localField: '_id',
  foreignField: 'workspace',
});

// Pre-save: Add owner to members
workspaceSchema.pre('save', function (next) {
  if (this.isNew) {
    const ownerExists = this.members.some(
      (member) => member.user.toString() === this.owner.toString()
    );
    if (!ownerExists) {
      this.members.push({
        user: this.owner,
        role: 'admin',
      });
    }
  }
  next();
});

// Instance methods
workspaceSchema.methods.isMember = function (userId) {
  return this.members.some(
    (member) => member.user.toString() === userId.toString()
  );
};

workspaceSchema.methods.isAdmin = function (userId) {
  if (this.owner.toString() === userId.toString()) return true;
  
  const member = this.members.find(
    (member) => member.user.toString() === userId.toString()
  );
  return member && member.role === 'admin';
};

workspaceSchema.methods.getMemberRole = function (userId) {
  if (this.owner.toString() === userId.toString()) return 'owner';
  
  const member = this.members.find(
    (member) => member.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

// Static method
workspaceSchema.statics.findByUser = function (userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.user': userId },
    ],
    isActive: true,
  }).populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar');
};

const Workspace = mongoose.model('Workspace', workspaceSchema);

module.exports = Workspace;