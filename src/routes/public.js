import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Project, Experience, SkillGroup, Post, Message } from '../models/index.js';
import { getSettings } from '../settings.js';

const r = Router();
const byOrder = { order: 1, createdAt: -1 };

// Bitta so'rov bilan butun sayt ma'lumoti
r.get('/site', async (_req, res, next) => {
  try {
    const [settings, projects, experience, skills, posts] = await Promise.all([
      getSettings(),
      Project.find({ published: true }).sort(byOrder).lean(),
      Experience.find({ published: true }).sort(byOrder).lean(),
      SkillGroup.find({ published: true }).sort(byOrder).lean(),
      Post.find({ published: true }).sort({ createdAt: -1 }).select('-content').lean(),
    ]);
    res.json({ settings, projects, experience, skills, posts });
  } catch (e) { next(e); }
});

r.get('/posts/:slug', async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, published: true }).lean();
    if (!post) return res.status(404).json({ error: 'Not found' });
    res.json(post);
  } catch (e) { next(e); }
});

const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

r.post('/contact', contactLimiter, async (req, res, next) => {
  try {
    const { name = '', email = '', text = '', website = '' } = req.body || {};
    if (website) return res.json({ ok: true }); // honeypot
    if (!String(name).trim() || !/^\S+@\S+\.\S+$/.test(String(email)) || String(text).trim().length < 5)
      return res.status(400).json({ error: 'Invalid data' });
    const msg = await Message.create({
      name: String(name).slice(0, 100), email: String(email).slice(0, 200), text: String(text).slice(0, 3000),
    });

    const { TELEGRAM_BOT_TOKEN: t, TELEGRAM_CHAT_ID: c } = process.env;
    if (t && c) {
      fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: c, text: `📩 Yangi xabar\n👤 ${msg.name}\n✉️ ${msg.email}\n\n${msg.text}` }),
      }).catch((e) => console.error('[telegram]', e.message));
    }
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
