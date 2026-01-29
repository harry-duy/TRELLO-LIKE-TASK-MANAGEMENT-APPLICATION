const mongoose = require('mongoose');

const listSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'List name is required'],
      trim: true,
      maxlength: [100, 'List name cannot exceed 100 characters'],
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: [true, 'List must belong to a board'],
    },
    position: {
      type: Number,
      required: true,
      default: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
listSchema.index({ board: 1, position: 1 });
listSchema.index({ board: 1, isArchived: 1 });

// Virtual populate cards
listSchema.virtual('cards', {
  ref: 'Card',
  localField: '_id',
  foreignField: 'list',
  options: { sort: { position: 1 } },
});

// Pre-save: Set position
listSchema.pre('save', async function (next) {
  if (this.isNew && this.position === 0) {
    const count = await this.constructor.countDocuments({
      board: this.board,
      isArchived: false,
    });
    this.position = count;
  }
  next();
});

// Cascade delete cards
listSchema.pre('remove', async function (next) {
  await this.model('Card').deleteMany({ list: this._id });
  next();
});

// Static methods
listSchema.statics.reorderLists = async function (boardId, listOrders) {
  const bulkOps = listOrders.map((item, index) => ({
    updateOne: {
      filter: { _id: item.listId, board: boardId },
      update: { $set: { position: index } },
    },
  }));

  return this.bulkWrite(bulkOps);
};

listSchema.statics.findByBoard = function (boardId, options = {}) {
  const query = this.find({
    board: boardId,
    isArchived: options.includeArchived ? undefined : false,
  });
  
  if (options.withCards) {
    query.populate({
      path: 'cards',
      match: { isArchived: false },
      options: { sort: { position: 1 } },
    });
  }
  
  return query.sort({ position: 1 });
};

// Instance methods
listSchema.methods.getCardCount = async function () {
  return await this.model('Card').countDocuments({
    list: this._id,
    isArchived: false,
  });
};

listSchema.methods.archive = function () {
  this.isArchived = true;
  return this.save();
};

listSchema.methods.restore = function () {
  this.isArchived = false;
  return this.save();
};

const List = mongoose.model('List', listSchema);

module.exports = List;