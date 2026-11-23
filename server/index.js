import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const db = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'civic_pulse', waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4',
});

const LANGS = { en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil', kn: 'Kannada', bn: 'Bengali', mr: 'Marathi', ur: 'Urdu' };
const KEY = process.env.ANTHROPIC_API_KEY;

async function ai(system, user) {
  if (!KEY) return null;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 1500, system, messages: [{ role: 'user', content: user }] }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || 'AI request failed');
  return d.content.map((c) => c.text || '').join('');
}

const STYLE = (lang, level) =>
  `You explain Indian government policies, notifications, schemes and laws to ordinary citizens and small businesses. ` +
  `Write the whole answer in ${LANGS[lang] || 'English'}. Reading level: ${level === 'simple' ? 'a 10-year-old, very short sentences' : 'a general adult, clear and plain'}. ` +
  `Use plain text only (no markdown symbols, no asterisks). Never invent facts, numbers or dates that are not in the source; ` +
  `if something is unclear say so. End with one line advising the reader to verify on the official website or at a local office.`;
const NO_KEY = 'AI is not configured. Add ANTHROPIC_API_KEY to server/.env to enable explanations.';
const save = (kind, input, language, output) =>
  db.query('INSERT INTO history (kind,input,language,output) VALUES (?,?,?,?)', [kind, input.slice(0, 4000), language, output]).catch(() => {});
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e); res.status(500).json({ error: e.message }); });

app.get('/api/health', (_q, res) => res.json({ ok: true, ai: !!KEY }));

app.get('/api/schemes', wrap(async (req, res) => {
  const { q = '', category = '' } = req.query;
  const where = [], params = [];
  if (q) { where.push('(name LIKE ? OR summary LIKE ? OR benefits LIKE ?)'); params.push(...Array(3).fill(`%${q}%`)); }
  if (category) { where.push('category = ?'); params.push(category); }
  const [rows] = await db.query(`SELECT * FROM schemes ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY name`, params);
  const [cats] = await db.query('SELECT DISTINCT category FROM schemes ORDER BY category');
  res.json({ schemes: rows, categories: cats.map((c) => c.category) });
}));

app.post('/api/eligibility', wrap(async (req, res) => {
  const { age, income, gender, occupation } = req.body;
  const [rows] = await db.query('SELECT * FROM schemes');
  const out = rows.map((s) => {
    const reasons = [], fails = [];
    if (age !== '' && age != null) {
      if (s.min_age != null && age < s.min_age) fails.push(`Minimum age is ${s.min_age}`);
      else if (s.max_age != null && age > s.max_age) fails.push(`Maximum age is ${s.max_age}`);
      else if (s.min_age != null || s.max_age != null) reasons.push('Your age fits');
    }
    if (income !== '' && income != null && s.max_income != null) {
      if (income > s.max_income) fails.push(`Income limit is about Rs ${s.max_income.toLocaleString('en-IN')} per year`);
      else reasons.push('Your income is within the limit');
    }
    if (s.gender !== 'any') {
      if (gender && gender !== s.gender) fails.push(`Meant for ${s.gender === 'female' ? 'women and girls' : 'men'}`);
      else if (gender) reasons.push('Gender criterion met');
    }
    if (s.occupation !== 'any') {
      if (occupation && occupation !== s.occupation) fails.push(`Meant for ${s.occupation}s`);
      else if (occupation) reasons.push(`Matches your occupation (${occupation})`);
    }
    return { ...s, eligible: fails.length === 0, reasons, fails };
  });
  out.sort((a, b) => b.eligible - a.eligible || b.reasons.length - a.reasons.length);
  res.json({ results: out });
}));

app.post('/api/explain', wrap(async (req, res) => {
  const { text, language = 'en', level = 'plain' } = req.body;
  if (!text || text.trim().length < 20) return res.status(400).json({ error: 'Paste at least a few sentences of the document.' });
  const out = await ai(STYLE(language, level) + ' Structure: What this says; Who it affects; What you need to do; Deadlines or costs; Watch out for.', `Explain this document:\n\n${text.slice(0, 12000)}`);
  if (!out) return res.json({ text: NO_KEY, ai: false });
  save('explain', text, language, out);
  res.json({ text: out, ai: true });
}));

app.post('/api/schemes/:id/explain', wrap(async (req, res) => {
  const { language = 'en', level = 'plain' } = req.body;
  const [[s]] = await db.query('SELECT * FROM schemes WHERE id = ?', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'Scheme not found' });
  const out = await ai(STYLE(language, level) + ' Structure: What it is; Who can get it; What you get; Documents needed; How to apply.', `Explain this scheme using only this data:\n${JSON.stringify(s)}`);
  if (!out) return res.json({ text: NO_KEY, ai: false });
  save('scheme', s.name, language, out);
  res.json({ text: out, ai: true });
}));

app.post('/api/ask', wrap(async (req, res) => {
  const { question, language = 'en' } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Type a question.' });
  const [rows] = await db.query('SELECT name,category,summary,benefits,eligibility_text,documents,apply_url FROM schemes');
  const out = await ai(STYLE(language, 'plain') + ' Answer only from the scheme database provided. If the answer is not there, say you do not have it and suggest where to check. Name the relevant schemes.', `Scheme database:\n${JSON.stringify(rows)}\n\nQuestion: ${question}`);
  if (!out) return res.json({ text: NO_KEY, ai: false });
  save('ask', question, language, out);
  res.json({ text: out, ai: true });
}));

app.get('/api/history', wrap(async (_q, res) => {
  const [rows] = await db.query('SELECT id,kind,input,language,output,created_at FROM history ORDER BY id DESC LIMIT 15');
  res.json({ history: rows });
}));

app.listen(process.env.PORT || 5000, () => console.log('Civic Pulse API running'));
