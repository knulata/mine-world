const crypto = require('crypto');

const BOT_TOKEN = process.env.MINE_WORLD_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const ITEMS = {
  energy_refill:    { title: 'Energy Refill',        description: 'Fully recharge your mining energy',                  price: 25  },
  energy_tank:      { title: 'Energy Tank +50',      description: 'Permanently increase max energy by 50',              price: 100 },
  efficiency_1:     { title: 'Efficiency I',         description: '+20% tap damage (permanent)',                        price: 75  },
  efficiency_2:     { title: 'Efficiency II',        description: '+40% tap damage (permanent)',                        price: 125 },
  efficiency_3:     { title: 'Efficiency III',       description: '+60% tap damage (permanent)',                        price: 175 },
  efficiency_4:     { title: 'Efficiency IV',        description: '+80% tap damage (permanent)',                        price: 225 },
  efficiency_5:     { title: 'Efficiency V',         description: '+100% tap damage (permanent)',                       price: 300 },
  fortune_1:        { title: 'Fortune I',            description: '+25% resource drops (permanent)',                    price: 100 },
  fortune_2:        { title: 'Fortune II',           description: '+50% resource drops (permanent)',                    price: 175 },
  fortune_3:        { title: 'Fortune III',          description: '+75% resource drops (permanent)',                    price: 250 },
  silk_touch:       { title: 'Silk Touch',           description: 'Chance to get rare block drops',                     price: 200 },
  worker_1:         { title: '+1 Villager Worker',   description: 'Add a villager to auto-mine while you are away',     price: 50  },
  worker_5:         { title: '+5 Villager Workers',  description: '5 workers at 20% discount!',                         price: 200 },
  speed_boost:      { title: '2x Mining Speed',      description: 'Double mining damage for 1 hour',                    price: 30  },
  auto_tap:         { title: 'Auto-Tap',             description: 'Automatic tapping for 30 minutes',                   price: 40  },
  end_pass:         { title: 'End Dimension Pass',   description: 'Skip prerequisites and unlock The End directly',     price: 500 },
  resource_pack_1:  { title: 'Starter Pack',         description: '500 stone + 200 iron + 50 gold',                     price: 75  },
  resource_pack_2:  { title: 'Advanced Pack',        description: '100 diamond + 500 iron + 200 gold',                  price: 200 },
  resource_pack_3:  { title: 'Ultimate Pack',        description: '50 netherite + 200 diamond + 500 gold',              price: 400 },
  skin_creeper:     { title: 'Creeper Pickaxe Skin', description: 'Creeper-themed pickaxe cosmetic',                    price: 150 },
  skin_ender:       { title: 'Ender Pickaxe Skin',   description: 'Ender-themed pickaxe cosmetic',                      price: 200 },
};

function verifyTelegramInitData(initData) {
  if (!initData || !BOT_TOKEN) return false;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return computedHash === hash;
  } catch (e) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { itemId, initData, userId } = req.body;

    if (!itemId || !ITEMS[itemId]) {
      return res.status(400).json({ error: 'Invalid item' });
    }

    if (BOT_TOKEN && initData && !verifyTelegramInitData(initData)) {
      return res.status(403).json({ error: 'Invalid initData' });
    }

    const item = ITEMS[itemId];

    const invoicePayload = {
      title: item.title,
      description: item.description,
      payload: JSON.stringify({ itemId, userId, ts: Date.now() }),
      currency: 'XTR',
      prices: [{ label: item.title, amount: item.price }],
    };

    const response = await fetch(`${TELEGRAM_API}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoicePayload),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram API error:', data);
      return res.status(500).json({ error: 'Failed to create invoice' });
    }

    return res.status(200).json({ invoiceUrl: data.result });
  } catch (error) {
    console.error('Create invoice error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
