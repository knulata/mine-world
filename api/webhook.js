const BOT_TOKEN = process.env.MINE_WORLD_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const update = req.body;

    // Handle successful payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const payload = JSON.parse(payment.invoice_payload || '{}');
      const userId = payload.userId;
      const itemId = payload.itemId;

      console.log(`Payment received: user=${userId}, item=${itemId}, amount=${payment.total_amount} XTR`);

      const chatId = update.message.chat.id;
      const messages = {
        energy_refill:   'Energy fully recharged! Get back to mining!',
        energy_tank:     'Energy Tank upgraded! +50 max energy permanently.',
        efficiency_1:    'Efficiency I enchantment applied! +20% tap damage.',
        efficiency_2:    'Efficiency II enchantment applied! +40% tap damage.',
        efficiency_3:    'Efficiency III enchantment applied! +60% tap damage.',
        efficiency_4:    'Efficiency IV enchantment applied! +80% tap damage.',
        efficiency_5:    'Efficiency V enchantment applied! +100% tap damage.',
        fortune_1:       'Fortune I enchantment applied! +25% resource drops.',
        fortune_2:       'Fortune II enchantment applied! +50% resource drops.',
        fortune_3:       'Fortune III enchantment applied! +75% resource drops.',
        silk_touch:      'Silk Touch enchantment unlocked! Rare drops incoming.',
        worker_1:        'A new villager worker has joined your mine!',
        worker_5:        '5 new villager workers have joined your mine!',
        speed_boost:     '2x Mining Speed activated for 1 hour!',
        auto_tap:        'Auto-Tap activated for 30 minutes!',
        end_pass:        'End Dimension Pass unlocked! The End awaits you.',
        resource_pack_1: 'Starter Pack received! 500 stone + 200 iron + 50 gold.',
        resource_pack_2: 'Advanced Pack received! 100 diamond + 500 iron + 200 gold.',
        resource_pack_3: 'Ultimate Pack received! 50 netherite + 200 diamond + 500 gold.',
        skin_creeper:    'Creeper Pickaxe skin unlocked!',
        skin_ender:      'Ender Pickaxe skin unlocked!',
      };

      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Payment confirmed! ${messages[itemId] || 'Your purchase is ready in-game.'}`,
          reply_markup: {
            inline_keyboard: [[
              { text: 'Open MineWorld', web_app: { url: process.env.MINE_WORLD_URL || 'https://mine-world.vercel.app' } }
            ]]
          }
        }),
      });

      return res.status(200).json({ ok: true });
    }

    // Handle pre-checkout query (must answer within 10 seconds)
    if (update.pre_checkout_query) {
      await fetch(`${TELEGRAM_API}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: update.pre_checkout_query.id,
          ok: true,
        }),
      });
      return res.status(200).json({ ok: true });
    }

    // Handle /start command
    if (update.message?.text?.startsWith('/start')) {
      const chatId = update.message.chat.id;
      const firstName = update.message.from.first_name || 'Miner';
      const args = update.message.text.split(' ');
      const startParam = args.length > 1 ? args[1] : '';

      let welcomeText = `Hey ${firstName}! Welcome to MineWorld!\n\nTap to mine blocks, craft pickaxes, build your base, and defeat bosses.\nTap the button below to start mining!`;

      if (startParam.startsWith('ref_')) {
        welcomeText = `Hey ${firstName}! Your friend invited you to MineWorld!\n\nYou both get an Iron Pickaxe + 1000 Stone as a welcome bonus!\nTap the button below to start mining!`;
      }

      const appUrl = process.env.MINE_WORLD_URL || 'https://mine-world.vercel.app';
      const gameUrl = startParam ? `${appUrl}?startapp=${startParam}` : appUrl;

      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeText,
          reply_markup: {
            inline_keyboard: [[
              { text: 'Start Mining', web_app: { url: gameUrl } }
            ]]
          }
        }),
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true });
  }
};
