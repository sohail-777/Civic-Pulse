import { useEffect, useState } from 'react';

const LANGS = [['en','English','en-IN'],['hi','हिन्दी','hi-IN'],['te','తెలుగు','te-IN'],['ta','தமிழ்','ta-IN'],['kn','ಕನ್ನಡ','kn-IN'],['bn','বাংলা','bn-IN'],['mr','मराठी','mr-IN'],['ur','اردو','ur-IN']];
const api = async (path, body) => {
  const r = await fetch('/api' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
};

function Answer({ text, lang }) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => window.speechSynthesis?.cancel(), [text]);
  if (!text) return null;
  const toggle = () => {
    const s = window.speechSynthesis;
    if (!s) return alert('Audio is not supported in this browser.');
    if (speaking) { s.cancel(); return setSpeaking(false); }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANGS.find((l) => l[0] === lang)?.[2] || 'en-IN';
    u.onend = () => setSpeaking(false);
    s.speak(u); setSpeaking(true);
  };
  return (
    <section className="answer" aria-live="polite">
      <div className="answer-bar">
        <button className="btn ghost" onClick={toggle}>{speaking ? 'Stop audio' : 'Listen'}</button>
        <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(text)}>Copy</button>
      </div>
      <p lang={lang}>{text}</p>
    </section>
  );
}

function useAI(lang) {
  const [state, set] = useState({ loading: false, text: '', error: '' });
  const run = async (path, body) => {
    set({ loading: true, text: '', error: '' });
    try { const d = await api(path, { ...body, language: lang }); set({ loading: false, text: d.text, error: '' }); }
    catch (e) { set({ loading: false, text: '', error: e.message }); }
  };
  return [state, run];
}

function Explain({ lang }) {
  const [text, setText] = useState('');
  const [level, setLevel] = useState('plain');
  const [st, run] = useAI(lang);
  return (
    <div className="panel">
      <h2>Make any official document easy to understand</h2>
      <p className="muted">Paste a notification, circular, rule or law. You get a short explanation in your language, which you can also listen to.</p>
      <textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the text of the notification here…" />
      <div className="row">
        <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Reading level">
          <option value="plain">Plain language</option><option value="simple">Very simple</option>
        </select>
        <button className="btn" disabled={st.loading} onClick={() => run('/explain', { text, level })}>{st.loading ? 'Explaining…' : 'Explain it'}</button>
      </div>
      {st.error && <p className="error">{st.error}</p>}
      <Answer text={st.text} lang={lang} />
    </div>
  );
}

function Schemes({ lang }) {
  const [q, setQ] = useState(''); const [cat, setCat] = useState('');
  const [data, setData] = useState({ schemes: [], categories: [] });
  const [open, setOpen] = useState(null);
  const [st, run] = useAI(lang);
  useEffect(() => { const t = setTimeout(() => api(`/schemes?q=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}`).then(setData).catch(() => {}), 250); return () => clearTimeout(t); }, [q, cat]);
  return (
    <div className="panel">
      <h2>Government schemes</h2>
      <div className="row">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search schemes, e.g. pension, farmer, loan" aria-label="Search schemes" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="">All categories</option>{data.categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid">
        {data.schemes.map((s) => (
          <article key={s.id} className="card">
            <span className="tag">{s.category}</span>
            <h3>{s.name}</h3><p>{s.summary}</p>
            {open === s.id && (<div className="detail">
              <p><b>Benefits:</b> {s.benefits}</p><p><b>Who can apply:</b> {s.eligibility_text}</p><p><b>Documents:</b> {s.documents}</p>
              <a href={s.apply_url} target="_blank" rel="noreferrer">Official website</a>
            </div>)}
            <div className="row">
              <button className="btn ghost" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? 'Hide details' : 'Details'}</button>
              <button className="btn" onClick={() => { setOpen(s.id); run(`/schemes/${s.id}/explain`, {}); }}>Explain in my language</button>
            </div>
            {open === s.id && (st.loading ? <p className="muted">Explaining…</p> : <Answer text={st.text} lang={lang} />)}
            {open === s.id && st.error && <p className="error">{st.error}</p>}
          </article>
        ))}
        {!data.schemes.length && <p className="muted">No schemes match. Try a different word or clear the category.</p>}
      </div>
    </div>
  );
}

function Eligibility() {
  const [f, setF] = useState({ age: '', income: '', gender: '', occupation: '' });
  const [res, setRes] = useState(null); const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const check = async () => {
    setErr('');
    try { setRes((await api('/eligibility', { ...f, age: f.age === '' ? '' : +f.age, income: f.income === '' ? '' : +f.income })).results); }
    catch (e) { setErr(e.message); }
  };
  return (
    <div className="panel">
      <h2>Which schemes can I apply for?</h2>
      <p className="muted">Fill what you know. Leave a field empty to skip it.</p>
      <div className="form">
        <label>Age<input type="number" min="0" value={f.age} onChange={set('age')} /></label>
        <label>Yearly family income (Rs)<input type="number" min="0" value={f.income} onChange={set('income')} /></label>
        <label>Gender<select value={f.gender} onChange={set('gender')}><option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option></select></label>
        <label>Occupation<select value={f.occupation} onChange={set('occupation')}>
          <option value="">Not specified</option><option value="farmer">Farmer</option><option value="student">Student</option>
          <option value="entrepreneur">Business owner</option><option value="worker">Worker</option><option value="artisan">Artisan</option></select></label>
      </div>
      <button className="btn" onClick={check}>Check eligibility</button>
      {err && <p className="error">{err}</p>}
      {res && <div className="grid">{res.map((s) => (
        <article key={s.id} className={'card ' + (s.eligible ? 'ok' : 'no')}>
          <span className="tag">{s.eligible ? 'You may qualify' : 'Not a match'}</span>
          <h3>{s.name}</h3><p>{s.benefits}</p>
          <ul>{[...s.reasons, ...s.fails].map((r) => <li key={r}>{r}</li>)}</ul>
          {s.eligible && <a href={s.apply_url} target="_blank" rel="noreferrer">Apply on official site</a>}
        </article>))}</div>}
    </div>
  );
}

function Ask({ lang }) {
  const [question, setQ] = useState('');
  const [st, run] = useAI(lang);
  const [hist, setHist] = useState([]);
  useEffect(() => { api('/history').then((d) => setHist(d.history)).catch(() => {}); }, [st.text]);
  return (
    <div className="panel">
      <h2>Ask a question</h2>
      <p className="muted">Answers come from the scheme database, not from guesswork.</p>
      <div className="row">
        <input value={question} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run('/ask', { question })} placeholder="e.g. I am a 25-year-old shop owner. What loan can I get?" />
        <button className="btn" disabled={st.loading} onClick={() => run('/ask', { question })}>{st.loading ? 'Thinking…' : 'Ask'}</button>
      </div>
      {st.error && <p className="error">{st.error}</p>}
      <Answer text={st.text} lang={lang} />
      {hist.length > 0 && <><h3>Recent explanations</h3><ul className="hist">{hist.map((h) => <li key={h.id}><b>{h.kind}</b> ({h.language}): {h.input.slice(0, 90)}</li>)}</ul></>}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('explain'); const [lang, setLang] = useState('en');
  const tabs = [['explain', 'Explain'], ['schemes', 'Schemes'], ['eligibility', 'Eligibility'], ['ask', 'Ask']];
  return (
    <>
      <header>
        <div className="brand"><span className="dot" />Civic Pulse</div>
        <nav>{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</nav>
        <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">{LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
      </header>
      <main>
        {tab === 'explain' && <Explain lang={lang} />}
        {tab === 'schemes' && <Schemes lang={lang} />}
        {tab === 'eligibility' && <Eligibility />}
        {tab === 'ask' && <Ask lang={lang} />}
      </main>
      <footer>Information is for guidance only. Confirm details on the official government website.</footer>
    </>
  );
}
