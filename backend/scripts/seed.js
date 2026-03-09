const path = require('path');

const dotenvPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });

const connectDB = require('../src/config/database');
const User = require('../src/models/user.model');
const Workspace = require('../src/models/workspace.model');
const Board = require('../src/models/board.model');
const List = require('../src/models/list.model');
const Card = require('../src/models/card.model');

const seedData = async () => {
  await connectDB();

  const seedUserEmail = 'seed@example.com';
  const seedPassword = 'Password123!';

  let user = await User.findOne({ email: seedUserEmail });
  if (!user) {
    user = await User.create({
      name: 'Seed User',
      email: seedUserEmail,
      password: seedPassword,
      role: 'user',
    });
  }

  let workspace = await Workspace.findOne({
    name: 'Sample Workspace',
    owner: user._id,
  });

  if (!workspace) {
    workspace = await Workspace.create({
      name: 'Sample Workspace',
      description: 'Workspace for demo data',
      owner: user._id,
    });
  }

  let board = await Board.findOne({
    name: 'Sample Board',
    workspace: workspace._id,
  });

  if (!board) {
    board = await Board.create({
      name: 'Sample Board',
      description: 'Board for demo data',
      workspace: workspace._id,
      createdBy: user._id,
      background: '#0f766e',
    });
  }

  let lists = await List.find({ board: board._id }).sort({ position: 1 });

  if (lists.length === 0) {
    lists = await List.insertMany([
      { name: 'To Do', board: board._id, position: 0 },
      { name: 'Doing', board: board._id, position: 1 },
      { name: 'Done', board: board._id, position: 2 },
    ]);
  }

  for (const list of lists) {
    const cardCount = await Card.countDocuments({ list: list._id });
    if (cardCount > 0) continue;

    await Card.insertMany([
      {
        title: `${list.name}: First task`,
        description: 'Demo card created by seed script.',
        list: list._id,
        board: board._id,
        createdBy: user._id,
        position: 0,
        labels: ['demo'],
      },
      {
        title: `${list.name}: Second task`,
        description: 'Feel free to edit or delete this card.',
        list: list._id,
        board: board._id,
        createdBy: user._id,
        position: 1,
        labels: ['demo'],
      },
    ]);
  }

  console.log('Seed complete.');
  console.log('Seed user:', seedUserEmail, '/', seedPassword);
  console.log('Workspace:', workspace._id.toString());
  console.log('Board:', board._id.toString());
};

seedData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
