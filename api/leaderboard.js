let memoryStore = {
  weekly: [],
  squads: {},
  referrals: {},
  lastReset: Date.now(),
};

function checkWeeklyReset() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const lastReset = new Date(memoryStore.lastReset);

  if (dayOfWeek === 1 && lastReset.getUTCDay() !== 1) {
    memoryStore.weekly = [];
    memoryStore.lastReset = Date.now();
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  checkWeeklyReset();

  if (req.method === 'GET') {
    const type = req.query.type || 'weekly';

    if (type === 'squads') {
      const squadScores = {};
      for (const [squadId, squad] of Object.entries(memoryStore.squads)) {
        squadScores[squadId] = {
          name: squad.name,
          members: squad.members.length,
          score: squad.members.reduce((sum, m) => {
            const entry = memoryStore.weekly.find(e => e.userId === m);
            return sum + (entry ? entry.score : 0);
          }, 0),
        };
      }
      const sorted = Object.entries(squadScores)
        .map(([id, s]) => ({ id, ...s }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);

      return res.status(200).json({ entries: sorted, resetAt: memoryStore.lastReset });
    }

    const entries = memoryStore.weekly
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    return res.status(200).json({ entries, resetAt: memoryStore.lastReset });
  }

  if (req.method === 'POST') {
    const { action, userId, name, score, blocksMined, biome, referrerId, squadName, squadId } = req.body;

    if (action === 'score') {
      if (!userId || score === undefined) {
        return res.status(400).json({ error: 'Missing userId or score' });
      }

      const existing = memoryStore.weekly.find(e => e.userId === userId);
      if (existing) {
        if (score > existing.score) {
          existing.score = score;
          existing.name = name || existing.name;
          existing.blocksMined = blocksMined || existing.blocksMined;
          existing.biome = biome || existing.biome;
          existing.updatedAt = Date.now();
        }
      } else {
        memoryStore.weekly.push({
          userId,
          name: name || 'Miner',
          score: score || 0,
          blocksMined: blocksMined || 0,
          biome: biome || 'Overworld',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      if (memoryStore.weekly.length > 200) {
        memoryStore.weekly.sort((a, b) => b.score - a.score);
        memoryStore.weekly = memoryStore.weekly.slice(0, 200);
      }

      return res.status(200).json({ ok: true });
    }

    if (action === 'referral') {
      if (!referrerId || !userId) {
        return res.status(400).json({ error: 'Missing referrerId or userId' });
      }
      memoryStore.referrals[referrerId] = (memoryStore.referrals[referrerId] || 0) + 1;
      return res.status(200).json({ ok: true, count: memoryStore.referrals[referrerId] });
    }

    if (action === 'create_squad') {
      if (!squadName || !userId) {
        return res.status(400).json({ error: 'Missing squadName or userId' });
      }
      const id = 'sq_' + Date.now();
      memoryStore.squads[id] = {
        name: squadName,
        owner: userId,
        members: [userId],
        createdAt: Date.now(),
      };
      return res.status(200).json({ ok: true, squadId: id });
    }

    if (action === 'join_squad') {
      if (!squadId || !userId) {
        return res.status(400).json({ error: 'Missing squadId or userId' });
      }
      const squad = memoryStore.squads[squadId];
      if (!squad) return res.status(404).json({ error: 'Squad not found' });
      if (!squad.members.includes(userId)) {
        squad.members.push(userId);
      }
      return res.status(200).json({ ok: true, squad });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
