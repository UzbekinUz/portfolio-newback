import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Ko'p tilli maydon
const L = { uz: { type: String, default: '' }, ru: { type: String, default: '' }, en: { type: String, default: '' } };
const modeColors = { bg: String, secondary: String, accent: String, text: String };

export const User = model('User', new Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
}));

// Yagona (singleton) sozlamalar hujjati
export const Settings = model('Settings', new Schema({
  key: { type: String, default: 'main', unique: true },
  theme: { dark: modeColors, light: modeColors },
  profile: {
    name: String, role: L, tagline: L, about: L, location: L,
    available: { type: Boolean, default: true }, availableText: L,
    email: String, phone: String, avatar: String, resumeUrl: String,
    github: String, linkedin: String, telegram: String, instagram: String,
  },
  typewriter: [String],
  stats: [{ value: String, label: L }],
  now: [L],
  principles: [L],
  sections: { blog: { type: Boolean, default: true }, experience: { type: Boolean, default: true } },
  seo: { title: L, description: L },
}, { minimize: false }));

const common = { order: { type: Number, default: 0 }, published: { type: Boolean, default: true } };

export const Project = model('Project', new Schema({
  title: L, summary: L, architecture: L,
  image: String, tags: [String], demoUrl: String, repoUrl: String,
  featured: { type: Boolean, default: false }, ...common,
}, { timestamps: true }));

export const Experience = model('Experience', new Schema({
  kind: { type: String, enum: ['work', 'education'], default: 'work' },
  title: L, place: String, period: String, description: L,
  ...common,
}, { timestamps: true }));

export const SkillGroup = model('SkillGroup', new Schema({
  title: L, items: [String], ...common,
}, { timestamps: true }));

export const Post = model('Post', new Schema({
  title: L, excerpt: L, content: L, slug: { type: String, unique: true, sparse: true },
  cover: String, tags: [String], ...common,
}, { timestamps: true }));

export const Message = model('Message', new Schema({
  name: String, email: String, text: String, read: { type: Boolean, default: false },
}, { timestamps: true }));

export const defaultTheme = {
  dark: { bg: '#282B4A', secondary: '#EC5E27', accent: '#FF3E6C', text: '#F6F5FB' },
  light: { bg: '#F3F6FC', secondary: '#2F4BDB', accent: '#0891B2', text: '#12183A' },
};
