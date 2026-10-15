import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { User, Project, Experience, SkillGroup, Post } from './models/index.js';
import { getSettings } from './settings.js';

const l = (uz, ru, en) => ({ uz, ru, en });

export async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  if (!(await User.findOne({ email }))) {
    const weak = !process.env.ADMIN_PASSWORD || password === 'ChangeMe123!' || password.length < 10;
    if (weak && process.env.NODE_ENV === 'production')
      throw new Error('Set a strong ADMIN_PASSWORD (min 10 chars, not the default) before first production start');
    await User.create({ email, password: await bcrypt.hash(password, 12) });
    console.log(`[seed] admin created: ${email}${weak ? ' (WEAK DEV PASSWORD — change it in admin)' : ''}`);
  }
  await getSettings();
  if (process.env.NODE_ENV === 'production') return; // namunaviy kontent faqat dev rejimda

  if ((await Project.countDocuments()) === 0) {
    await Project.insertMany([
      {
        title: l('E-commerce platforma', 'E-commerce платформа', 'E-commerce platform'),
        summary: l("Kichik biznes uchun onlayn do'kon: katalog, savat va to'lov.", 'Онлайн-магазин для малого бизнеса: каталог, корзина, оплата.', 'Online store for small businesses: catalog, cart and checkout.'),
        architecture: l('JWT + Refresh Token, Cloudinary, Redis kesh', 'JWT + Refresh Token, Cloudinary, Redis кэш', 'JWT + Refresh Token auth, Cloudinary uploads, Redis caching'),
        tags: ['React', 'Node.js', 'MongoDB', 'Tailwind'], demoUrl: '#', repoUrl: '#', featured: true, order: 1,
      },
      {
        title: l('Real-time chat', 'Чат в реальном времени', 'Real-time chat'),
        summary: l('Socket.io asosidagi xonalar va xabarlar tarixi.', 'Комнаты и история сообщений на Socket.io.', 'Rooms and message history built on Socket.io.'),
        architecture: l('WebSocket, MongoDB indekslari, rate limiting', 'WebSocket, индексы MongoDB, rate limiting', 'WebSockets, MongoDB indexes, rate limiting'),
        tags: ['React', 'Socket.io', 'Express', 'MongoDB'], demoUrl: '#', repoUrl: '#', order: 2,
      },
    ]);
  }
  if ((await SkillGroup.countDocuments()) === 0) {
    await SkillGroup.insertMany([
      { title: l('Frontend', 'Frontend', 'Frontend'), items: ['React.js', 'Vite', 'Tailwind CSS', 'Redux Toolkit', 'Framer Motion', 'Axios'], order: 1 },
      { title: l('Backend', 'Backend', 'Backend'), items: ['Node.js', 'Express.js', 'REST API', 'JWT', 'Socket.io'], order: 2 },
      { title: l('Database & Tools', 'Database & Tools', 'Database & Tools'), items: ['MongoDB', 'Mongoose', 'Git/GitHub', 'Nginx', 'PM2', 'Docker'], order: 3 },
    ]);
  }
  if ((await Experience.countDocuments()) === 0) {
    await Experience.insertMany([
      { kind: 'work', title: l('Full-stack dasturchi', 'Full-stack разработчик', 'Full-stack Developer'), place: 'Freelance', period: '2023 — hozir',
        description: l('Loyihalarni noldan ishlab chiqish, SEO va deploy.', 'Разработка проектов с нуля, SEO и деплой.', 'Building projects from scratch, SEO and deployment.'), order: 1 },
      { kind: 'education', title: l('Iqtisodiyot', 'Экономика', 'Economics'), place: 'Tashkent State University of Economics', period: '2020 — 2024',
        description: l('', '', ''), order: 2 },
    ]);
  }
  if ((await Post.countDocuments()) === 0) {
    await Post.create({
      slug: 'hello-world', tags: ['mern'],
      title: l('Salom, dunyo', 'Привет, мир', 'Hello, world'),
      excerpt: l('Birinchi maqola.', 'Первая статья.', 'The first post.'),
      content: l('# Salom\n\nBu **Markdown** maqola.', '# Привет\n\nЭто статья в **Markdown**.', '# Hello\n\nThis is a **Markdown** post.'),
    });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { connectDB } = await import('./db.js');
  await connectDB();
  await seedAdmin();
  process.exit(0);
}
