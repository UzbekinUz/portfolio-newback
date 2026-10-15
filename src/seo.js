import { Post } from './models/index.js';
import { getSettings } from './settings.js';

const LANGS = ['uz', 'ru', 'en'];
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pick = (v, lang) => (v && typeof v === 'object' ? v[lang] || v.en || v.uz || v.ru || '' : v || '');

export const siteUrl = (req) =>
  (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

function detectLang(req) {
  const q = String(req.query.lang || '');
  if (LANGS.includes(q)) return q;
  const al = String(req.headers['accept-language'] || '').toLowerCase();
  for (const l of LANGS) if (al.startsWith(l) || al.includes(`,${l}`)) return l;
  return process.env.DEFAULT_LANG && LANGS.includes(process.env.DEFAULT_LANG) ? process.env.DEFAULT_LANG : 'uz';
}

/** index.html shablonini sahifaga mos title/meta/OG/JSON-LD va noscript kontent bilan to'ldiradi */
export async function renderHtml(template, req) {
  const s = await getSettings();
  const lang = detectLang(req);
  const base = siteUrl(req);
  const p = s.profile || {};
  const url = base + req.path;

  let title = pick(s.seo?.title, lang) || p.name || 'Portfolio';
  let desc = pick(s.seo?.description, lang) || pick(p.tagline, lang);
  let type = 'website';
  let body = `<h1>${esc(p.name)}</h1><h2>${esc(pick(p.role, lang))}</h2><p>${esc(pick(p.tagline, lang))}</p><p>${esc(pick(p.about, lang))}</p>`;

  const m = /^\/blog\/([^/]+)\/?$/.exec(req.path);
  let status = 200;
  if (m) {
    const post = await Post.findOne({ slug: m[1], published: true }).lean();
    if (post) {
      title = `${pick(post.title, lang)} — ${p.name || ''}`.trim();
      desc = pick(post.excerpt, lang) || desc;
      type = 'article';
      body = `<article><h1>${esc(pick(post.title, lang))}</h1><p>${esc(pick(post.excerpt, lang))}</p></article>`;
    } else status = 404;
  } else if (!['/', '/blog'].includes(req.path.replace(/\/$/, '') || '/') && !req.path.startsWith('/admin')) {
    status = 404;
  }

  const image = p.avatar ? (p.avatar.startsWith('http') ? p.avatar : base + p.avatar) : '';
  const sameAs = [p.github, p.linkedin, p.telegram, p.instagram].filter(Boolean);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    jobTitle: pick(p.role, lang),
    url: base,
    ...(image && { image }),
    ...(p.email && { email: p.email }),
    ...(sameAs.length && { sameAs }),
  };

  const isAdmin = req.path.startsWith('/admin');
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    isAdmin ? '<meta name="robots" content="noindex,nofollow" />' : '',
    status === 404 ? '<meta name="robots" content="noindex" />' : '',
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].filter(Boolean).join('\n    ');

  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('<!--SEO_HEAD-->', head)
    .replace('<!--SEO_BODY-->', isAdmin ? '' : `<noscript>${body}</noscript>`)
    .replace('<html lang="uz">', `<html lang="${lang}">`);
  return { html, status };
}

export async function sitemap(req) {
  const base = siteUrl(req);
  const s = await getSettings();
  const urls = [{ loc: base + '/' }];
  if (s.sections?.blog) {
    urls.push({ loc: base + '/blog' });
    const posts = await Post.find({ published: true }).select('slug updatedAt').lean();
    for (const p of posts) if (p.slug) urls.push({ loc: `${base}/blog/${p.slug}`, lastmod: p.updatedAt?.toISOString().slice(0, 10) });
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>\n`;
}
