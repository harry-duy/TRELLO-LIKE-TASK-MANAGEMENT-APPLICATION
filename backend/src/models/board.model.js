const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Board name is required'],
      trim: true,
      maxlength: [100, 'Board name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      trim: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Board must belong to a workspace'],
    },
    background: {
      type: String,
      default: '#0079bf',
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
boardSchema.index({ workspace: 1 });
boardSchema.index({ createdBy: 1 });
boardSchema.index({ name: 'text', description: 'text' });

// Virtual populate lists
boardSchema.virtual('lists', {
  ref: 'List',
  localField: '_id',
  foreignField: 'board',
  options: { sort: { position: 1 } },
});

// Cascade delete lists
boardSchema.pre('remove', async function (next) {
  await this.model('List').deleteMany({ board: this._id });
  next();
});

// Instance methods
boardSchema.methods.isStarredBy = function (userId) {
  return this.starredBy.some(
    (id) => id.toString() === userId.toString()
  );
};

boardSchema.methods.toggleStar = function (userId) {
  const index = this.starredBy.findIndex(
    (id) => id.toString() === userId.toString()
  );
  
  if (index > -1) {
    this.starredBy.splice(index, 1);
  } else {
    this.starredBy.push(userId);
  }
  
  return this.save();
};

// Static methods
boardSchema.statics.findByWorkspace = function (workspaceId, options = {}) {
  const query = this.find({ workspace: workspaceId, isClosed: false });
  
  if (options.populate) {
    query.populate('createdBy', 'name email avatar');
  }
  
  if (options.withLists) {
    query.populate({
      path: 'lists',
      options: { sort: { position: 1 } },
    });
  }
  
  return query.sort({ createdAt: -1 });
};

const Board = mongoose.model('Board', boardSchema);

module.exports = Board;