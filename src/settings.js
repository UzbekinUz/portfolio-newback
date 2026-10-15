import { Settings, defaultTheme } from './models/index.js';

export const defaultSettings = {
  key: 'main',
  theme: defaultTheme,
  profile: {
    name: 'Your Name',
    role: { uz: 'Full-stack MERN dasturchi', ru: 'Full-stack MERN разработчик', en: 'Full-stack MERN Developer' },
    tagline: {
      uz: "Ma'lumotlar bazasidan UI gacha — tez va ishonchli veb-ilovalar yarataman.",
      ru: 'От базы данных до интерфейса — создаю быстрые и надёжные веб-приложения.',
      en: 'Building scalable, high-performance web applications from database to UI.',
    },
    about: { uz: '', ru: '', en: '' },
    location: { uz: '', ru: '', en: '' },
    available: true,
    availableText: {
      uz: 'Freelance / Full-time uchun ochiqman',
      ru: 'Открыт для фриланса / Full-time',
      en: 'Available for freelance / Full-time roles',
    },
    email: '', phone: '', avatar: '', resumeUrl: '',
    github: '', linkedin: '', telegram: '', instagram: '',
  },
  typewriter: ["const stack = ['MongoDB', 'Express', 'React', 'Node.js'];"],
  stats: [],
  now: [],
  principles: [],
  sections: { blog: true, experience: true },
  seo: {
    title: { uz: 'Portfolio — MERN dasturchi', ru: 'Портфолио — MERN разработчик', en: 'Portfolio — MERN Developer' },
    description: { uz: 'Full-stack MERN dasturchi portfoliosi', ru: 'Портфолио full-stack MERN разработчика', en: 'Full-stack MERN developer portfolio' },
  },
};

// Qisqa muddatli xotira keshi (har bir so'rovda bazaga bormaslik uchun)
let cache = null;
let cachedAt = 0;
export const invalidateSettings = () => { cache = null; };

export async function getSettings() {
  if (cache && Date.now() - cachedAt < 15_000) return cache;
  let s = await Settings.findOne({ key: 'main' }).lean();
  if (!s) s = (await Settings.create(defaultSettings)).toObject();
  cache = s;
  cachedAt = Date.now();
  return s;
}
