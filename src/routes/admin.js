import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { requireAuth, COOKIE, cookieOptions } from '../middleware/auth.js';
import { User, Settings, Project, Experience, SkillGroup, Post, Message } from '../models/index.js';
import { getSettings, invalidateSettings } from '../settings.js';

const r = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
r.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(String(password || ''), user.password)))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, cookieOptions());
  res.json({ ok: true, email: user.email });
});

r.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

r.use(requireAuth);

r.get('/me', (req, res) => res.json({ email: req.user.email }));

r.post('/password', async (req, res) => {
  const { current, next } = req.body || {};
  if (!next || String(next).length < 10) return res.status(400).json({ error: 'Password must be at least 10 chars' });
  const user = await User.findById(req.user.id);
  if (!user || !(await bcrypt.compare(String(current || ''), user.password)))
    return res.status(400).json({ error: 'Current password is wrong' });
  user.password = await bcrypt.hash(String(next), 12);
  await user.save();
  res.json({ ok: true });
});

// Sozlamalar (theme, profil, SEO ...)
r.get('/settings', async (_req, res) => res.json(await getSettings()));
r.put('/settings', async (req, res, next) => {
  try {
    const { _id, __v, key, ...data } = req.body || {};
    const s = await Settings.findOneAndUpdate({ key: 'main' }, { $set: data }, { new: true, upsert: true, runValidators: true }).lean();
    invalidateSettings();
    res.json(s);
  } catch (e) { next(e); }
});

// Fayl yuklash: CLOUDINARY_URL bo'lsa Cloudinary'ga, bo'lmasa lokal diskka
const ALLOWED = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'application/pdf': '.pdf' };
const useCloud = !!process.env.CLOUDINARY_URL;
const uploadDir = path.resolve('uploads');
if (!useCloud) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: useCloud
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: uploadDir,
        // kengaytma mimetype'dan olinadi, foydalanuvchi bergan nomdan emas
        filename: (_req, file, cb) => cb(null, randomBytes(12).toString('hex') + ALLOWED[file.mimetype]),
      }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, !!ALLOWED[file.mimetype]),
});

r.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Invalid file (png, jpg, webp, gif, pdf; max 5MB)' });
    if (!useCloud) return res.json({ url: `/uploads/${req.file.filename}` });
    const { v2: cloudinary } = await import('cloudinary');
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: 'portfolio', resource_type: 'auto' }, (e, out) => (e ? reject(e) : resolve(out)))
        .end(req.file.buffer);
    });
    res.json({ url: result.secure_url });
  } catch (e) { next(e); }
});

// Umumiy CRUD
function crud(name, Model, sort = { order: 1, createdAt: -1 }) {
  r.get(`/${name}`, async (_req, res) => res.json(await Model.find().sort(sort).lean()));
  r.post(`/${name}`, async (req, res, next) => {
    try { res.status(201).json(await Model.create(req.body)); } catch (e) { next(e); }
  });
  r.put(`/${name}/:id`, async (req, res, next) => {
    try {
      const { _id, __v, createdAt, updatedAt, ...data } = req.body || {};
      const doc = await Model.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
      if (!doc) return res.status(404).json({ error: 'Not found' });
      res.json(doc);
    } catch (e) { next(e); }
  });
  r.delete(`/${name}/:id`, async (req, res) => {
    await Model.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  });
}
crud('projects', Project);
crud('experience', Experience);
crud('skills', SkillGroup);
crud('posts', Post, { createdAt: -1 });
crud('messages', Message, { createdAt: -1 });

export default r;
