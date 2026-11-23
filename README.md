# Civic Pulse – Multilingual Policy, Rights & Scheme Explainer

React + Node/Express + MySQL + Claude AI.

Features: (1) paste any notification/law/circular → plain-language explanation in 8 languages with audio read-aloud;
(2) browse/search government schemes stored in MySQL; (3) eligibility checker (rule-based, with reasons);
(4) "Ask" – Q&A grounded in the scheme database; (5) saved explanation history.

## Setup
1. MySQL: `mysql -u root -p < server/schema.sql`
2. Server: `cd server && cp .env.example .env` (fill DB + ANTHROPIC_API_KEY) → `npm i && npm start` (port 5000)
3. Client: `cd client && npm i && npm run dev` (port 5173, proxies /api to 5000)

Without an API key the app still works (scheme browsing + eligibility); AI endpoints return a notice.
Seed data is a summary for demo purposes – always verify on the official site linked on each scheme.
