# How to Auto-Post Telegram → Website Blog
### No coding needed — takes about 10 minutes

---

## What you need (all free)
1. **Telegram Bot** — a bot that reads your channel
2. **JSONBin** — stores your posts online
3. **Make.com** — automatically moves posts from Telegram to JSONBin

---

## STEP 1 — Create a Telegram Bot (2 min)

1. Open Telegram → search **@BotFather** → tap it
2. Send: `/newbot`
3. Give it any name, e.g. `HKOTC Post Bot`
4. Give it a username, e.g. `hkotcpost_bot`
5. BotFather sends you a **token** like `7123456789:AAFxxx...`
   → **Copy and save this token**

6. Go to your channel → **Settings → Administrators**
7. Tap **Add Admin** → search your bot name → add it
8. Enable **"Post Messages"** → Save

---

## STEP 2 — Create JSONBin storage (2 min)

1. Go to **https://jsonbin.io** → Sign up free
2. Click **+ Create Bin**
3. Paste this as the initial content:
   ```json
   []
   ```
4. Click **Create** → it gives you a **Bin ID** like `664abc123...`
5. Copy the **Access URL**:
   `https://api.jsonbin.io/v3/b/YOUR_BIN_ID/latest`
6. Go to **API Keys** tab → create a key → copy it

---

## STEP 3 — Put your JSONBin URL in the blog (1 min)

Open `otc-web/blog.html` in a text editor, find this line:

```js
const CHANNEL_POSTS_URL = 'channel-posts.json';
```

Replace it with:

```js
const CHANNEL_POSTS_URL = 'https://api.jsonbin.io/v3/b/YOUR_BIN_ID/latest';
```

---

## STEP 4 — Set up Make.com automation (5 min)

1. Go to **https://make.com** → Sign up free
2. Click **+ Create a new scenario**
3. Click the **+** circle → search **"Telegram Bot"** → pick **"Watch Channel Posts"**
   - Paste your bot token
   - Enter your channel username e.g. `@hkotcdesk`
4. Click the **+** after it → search **"HTTP"** → pick **"Make a Request"**
   - **URL**: `https://api.jsonbin.io/v3/b/YOUR_BIN_ID`
   - **Method**: `PUT`
   - **Headers**:
     - `Content-Type` = `application/json`
     - `X-Master-Key` = your JSONBin API key
     - `X-Bin-Versioning` = `false`
   - **Body type**: `Raw`
   - **Body**: paste this exactly:
     ```
     [{"message_id": {{1.message_id}}, "date": {{1.date}}, "text": "{{1.text}}", "photo": "{{1.photo[].file_id}}", "channel": "hkotcdesk", "message_link": "https://t.me/hkotcdesk/{{1.message_id}}"}]
     ```
5. Click **Run once** to test → post something in your channel
6. If it works → click **ON** toggle to activate it

---

## Done! 🎉

Now every time you post on your Telegram channel:
1. Make.com detects it automatically
2. Saves it to JSONBin
3. Your blog shows it within 15 minutes

**The blog URL is**: https://hkotc.io/blog.html

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Posts not showing | Check the bot is admin in your channel |
| Make.com not triggering | Make sure scenario is turned ON |
| Blog shows "No posts" | Double-check the JSONBin URL in blog.html |
