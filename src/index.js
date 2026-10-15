import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { connectDB } from './db.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { seedAdmin } from './seed.js';
import { renderHtml, sitemap, siteUrl } from './seo.js';

const prod = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
  if (prod) throw new Error('JWT_SECRET (min 24 chars) is required in production');
  process.env.JWT_SECRET = 'dev-secret-' + Math.random();
}

const app = express();
app.set('trust proxy', 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // inline: tema kesh skripti + JSON-LD
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);
app.use(compression());
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.use('/uploads', express.static(path.resolve('uploads'), { maxAge: '7d', immutable: true }));
app.use('/api/admin', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, adminRoutes);
app.use('/api', publicRoutes);

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${siteUrl(req)}/sitemap.xml\n`);
});
app.get('/sitemap.xml', async (req, res, next) => {
  try { res.type('application/xml').send(await sitemap(req)); } catch (e) { next(e); }
});

// React build + SEO meta injektsiyasi
const dist = fileURLToPath(new URL('../../client/dist', import.meta.url));
if (fs.existsSync(path.join(dist, 'index.html'))) {
  const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  app.use('/assets', express.static(path.join(dist, 'assets'), { maxAge: '1y', immutable: true }));
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', async (req, res, next) => {
    try {
      const { html, status } = await renderHtml(template, req);
      res.status(status).set('Cache-Control', 'no-cache').type('html').send(html);
    } catch (e) { next(e); }
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.name === 'ValidationError' ? 400 : err.status || 500;
  // ichki xato matnini mijozga bermaymiz
  res.status(status).json({ error: status === 500 ? 'Server error' : err.message });
});

const port = process.env.PORT || 5000;
connectDB()
  .then(seedAdmin)
  .then(() => app.listen(port, () => console.log(`[api] http://localhost:${port}`)))
  .catch((e) => { console.error(e); process.exit(1); });
