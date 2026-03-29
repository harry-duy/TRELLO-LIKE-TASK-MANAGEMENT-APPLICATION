require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const connectDB = require('../src/config/database');
const Board = require('../src/models/board.model');
const Workspace = require('../src/models/workspace.model');

async function run() {
  await connectDB();

  const boards = await Board.find({}).select('_id workspace createdBy members name');
  let updated = 0;

  for (const board of boards) {
    const workspace = await Workspace.findById(board.workspace).select('owner members');
    if (!workspace) continue;

    const existing = new Map(
      (board.members || []).map((m) => [m.user.toString(), m.role])
    );

    const ensureMember = (userId, role) => {
      const key = userId.toString();
      if (!existing.has(key)) existing.set(key, role);
    };

    ensureMember(workspace.owner, 'admin');
    ensureMember(board.createdBy, 'admin');

    for (const member of workspace.members || []) {
      if (member.role === 'admin' || member.role === 'staff') {
        ensureMember(member.user, member.role);
      }
    }

    // Backfill old boards so current normal users do not lose visibility.
    // If a legacy board has no explicit members yet, inherit workspace members as board members.
    if (!board.members || board.members.length === 0) {
      for (const member of workspace.members || []) {
        ensureMember(member.user, member.role === 'staff' ? 'staff' : 'member');
      }
    }

    const nextMembers = Array.from(existing.entries()).map(([user, role]) => ({ user, role }));
    const changed = JSON.stringify((board.members || []).map((m) => ({ user: m.user.toString(), role: m.role })).sort((a, b) => a.user.localeCompare(b.user)))
      !== JSON.stringify(nextMembers.map((m) => ({ user: m.user.toString(), role: m.role })).sort((a, b) => a.user.localeCompare(b.user)));

    if (changed) {
      board.members = nextMembers;
      await board.save();
      updated += 1;
      console.log(`Updated board: ${board.name} (${board._id})`);
    }
  }

  console.log(`Done. Updated ${updated} board(s).`);
  process.exit(0);
}

run().catch((error) => {
  console.error('sync-board-members failed:', error);
  process.exit(1);
});
