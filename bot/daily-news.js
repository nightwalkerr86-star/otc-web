/**
 * HKOTC Daily Crypto News Bot
 * ────────────────────────────
 * Fetches top crypto news from RSS feeds and posts a daily digest
 * to a Telegram channel, linking back to https://hkotc.io/blog.html
 *
 * Required environment variables (set as GitHub Actions secrets):
 *   TELEGRAM_BOT_TOKEN  — from @BotFather
 *   TELEGRAM_CHAT_ID    — channel username e.g. @hkotcnews, or numeric ID
 *
 * Optional:
 *   POST_COUNT          — number of articles to include (default: 5)
 *   LANG                — "en" or "zh" (default: "en")
 */

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID     = process.env.TELEGRAM_CHAT_ID;
const POST_COUNT  = parseInt(process.env.POST_COUNT  || '5', 10);
const LANG        = process.env.LANG_MODE || 'en';
const BLOG_URL    = 'https://hkotc.io/blog.html';
const RSS_API     = 'https://api.rss2json.com/v1/api.json?count=8&rss_url=';

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌  TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set.');
  process.exit(1);
}

const FEEDS = [
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',  name: 'CoinDesk' },
  { url: 'https://cointelegraph.com/rss',                    name: 'CoinTelegraph' },
  { url: 'https://decrypt.co/feed',                          name: 'Decrypt' },
  { url: 'https://bitcoinmagazine.com/.rss/full/',            name: 'Bitcoin Magazine' },
];

// ── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(str) {
  try {
    return new Date(str).toLocaleDateString('en-HK', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return new Date().toDateString(); }
}

function todayHKT() {
  return new Date().toLocaleDateString('en-HK', {
    timeZone: 'Asia/Hong_Kong',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').trim();
}

function truncate(str, max = 120) {
  const s = stripHtml(str);
  return s.length > max ? s.slice(0, max).replace(/\s+\S*$/, '') + '…' : s;
}

// ── fetch all feeds ──────────────────────────────────────────────────────────

async function fetchFeed(feed) {
  try {
    const res  = await fetch(RSS_API + encodeURIComponent(feed.url));
    const data = await res.json();
    if (data.status !== 'ok' || !data.items?.length) return [];
    return data.items.map(item => ({ ...item, source: feed.name }));
  } catch (e) {
    console.warn(`⚠️  ${feed.name}: ${e.message}`);
    return [];
  }
}

async function fetchAllNews() {
  const batches = await Promise.allSettled(FEEDS.map(fetchFeed));
  const all = batches.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  // Sort newest-first, deduplicate by title similarity
  all.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const seen = new Set();
  return all.filter(item => {
    const key = item.title.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── build Telegram message ───────────────────────────────────────────────────

const EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
const SOURCE_EMOJI = {
  'CoinDesk':        '📰',
  'CoinTelegraph':   '📡',
  'Decrypt':         '🔓',
  'Bitcoin Magazine':'₿',
};

function buildMessage(articles) {
  const date  = todayHKT();
  const top   = articles.slice(0, POST_COUNT);

  const isZH  = LANG === 'zh';
  const header = isZH
    ? `🗞 <b>每日加密貨幣快訊</b>\n📅 ${date}\n`
    : `🗞 <b>Daily Crypto Digest</b>\n📅 ${date}\n`;

  const lines = top.map((item, i) => {
    const emoji  = EMOJIS[i] || '▪️';
    const srcEmj = SOURCE_EMOJI[item.source] || '📄';
    const title  = item.title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const excerpt = truncate(item.description || item.content, 100);
    return [
      `${emoji} <b>${title}</b>`,
      excerpt ? `<i>${excerpt}</i>` : '',
      `${srcEmj} <a href="${item.link}">${item.source}</a>`,
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  const footer = isZH
    ? `\n\n📖 <a href="${BLOG_URL}">在 HKOTC 博客閱讀更多 →</a>`
    : `\n\n📖 <a href="${BLOG_URL}">Read more on HKOTC Blog →</a>`;

  return header + '\n' + lines + footer;
}

// ── send to Telegram ─────────────────────────────────────────────────────────

async function sendMessage(text) {
  const isZH = LANG === 'zh';
  const body = {
    chat_id:    CHAT_ID,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: [[
        {
          text: isZH ? '📖 HKOTC 博客' : '📖 HKOTC Blog',
          url:  BLOG_URL,
        },
        {
          text: isZH ? '💱 立即交易' : '💱 Trade Now',
          url:  'https://hkotc.io/#calculator',
        },
      ]],
    },
  };

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  const result = await res.json();
  if (!result.ok) {
    throw new Error(`Telegram API error: ${result.description}`);
  }
  return result;
}

// ── main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('🚀  Fetching news feeds…');
  const articles = await fetchAllNews();

  if (!articles.length) {
    console.error('❌  No articles fetched — aborting.');
    process.exit(1);
  }

  console.log(`✅  Got ${articles.length} articles. Picking top ${POST_COUNT}.`);
  articles.slice(0, POST_COUNT).forEach((a, i) =>
    console.log(`  ${i + 1}. [${a.source}] ${a.title.slice(0, 70)}`),
  );

  const message = buildMessage(articles);
  console.log('\n📨  Sending to Telegram…');
  const result = await sendMessage(message);
  console.log(`✅  Posted! message_id: ${result.result.message_id}`);
})();
