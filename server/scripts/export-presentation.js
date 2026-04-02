/**
 * Generates VentureGraph SmartNetworking.pptx
 * Run: node scripts/export-presentation.js   (from server/)
 */
const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', '..', 'docs', 'generated');
fs.mkdirSync(OUT_DIR, { recursive: true });

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in

// ── Brand colours ────────────────────────────────────────────────────────────
const C = {
  accent:   '7C6FFF',
  info:     '3B82F6',
  dark:     '0F0F1A',
  card:     '1A1A2E',
  cardAlt:  '16213E',
  white:    'FFFFFF',
  muted:    'A0A0C0',
  green:    '22C55E',
  yellow:   'F59E0B',
  pink:     'EC4899',
  border:   '2A2A4A',
  grad1:    '6A5CF0',
  grad2:    '3B82F6',
};

// ── Reusable helpers ──────────────────────────────────────────────────────────
function bg(slide) {
  slide.background = { color: C.dark };
}

function addGradRect(slide, x, y, w, h, c1 = C.grad1, c2 = C.grad2, angle = 135) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h,
    fill: { type: 'grad', stops: [{ position: 0, color: c1 }, { position: 100, color: c2 }], angle },
  });
}

function addCard(slide, x, y, w, h, color = C.card) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h,
    fill: { color },
    line: { color: C.border, width: 1 },
    rectRadius: 0.12,
  });
}

function heading(slide, text, x, y, w, size = 32, color = C.white, bold = true) {
  slide.addText(text, {
    x, y, w, h: 0.6,
    fontSize: size, bold, color,
    fontFace: 'Segoe UI',
  });
}

function body(slide, text, x, y, w, h = 0.4, size = 14, color = C.muted) {
  slide.addText(text, {
    x, y, w, h,
    fontSize: size, color,
    fontFace: 'Segoe UI',
    wrap: true,
  });
}

function pill(slide, text, x, y, color = C.accent) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w: text.length * 0.1 + 0.5, h: 0.28, fill: { color }, rectRadius: 0.14 });
  slide.addText(text, { x: x + 0.08, y: y + 0.03, w: text.length * 0.1 + 0.34, h: 0.22, fontSize: 10, color: C.white, bold: true, fontFace: 'Segoe UI' });
}

function accentLine(slide, x, y, w) {
  slide.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color: C.accent, width: 3 } });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Title
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  bg(s);

  // Full-width gradient bar at top
  addGradRect(s, 0, 0, 13.33, 0.08, C.accent, C.info, 90);

  // Large background circle (decorative)
  s.addShape(pptx.ShapeType.ellipse, {
    x: 8.5, y: -1.5, w: 6, h: 6,
    fill: { type: 'grad', stops: [{ position: 0, color: C.accent + '33' }, { position: 100, color: C.dark }], angle: 135 },
    line: { type: 'none' },
  });

  // AI pill
  addGradRect(s, 0.7, 1.2, 1.4, 0.35, C.accent, C.info, 135);
  s.addText('AI-POWERED', { x: 0.75, y: 1.23, w: 1.3, h: 0.29, fontSize: 10, bold: true, color: C.white, fontFace: 'Segoe UI', align: 'center' });

  // Title
  s.addText('VentureGraph', { x: 0.7, y: 1.7, w: 8, h: 1.1, fontSize: 64, bold: true, color: C.white, fontFace: 'Segoe UI' });

  // Gradient underline
  addGradRect(s, 0.7, 2.75, 5.5, 0.06, C.accent, C.info, 90);

  // Subtitle
  s.addText('Smart Networking Platform', { x: 0.7, y: 2.95, w: 8, h: 0.6, fontSize: 26, color: C.muted, fontFace: 'Segoe UI' });

  // Description
  s.addText('Graph-powered event networking with AI-driven\nattendee matching, personalised recommendations\nand real-time group formation.', {
    x: 0.7, y: 3.65, w: 6.5, h: 1.2,
    fontSize: 15, color: 'C0C0E0', fontFace: 'Segoe UI', lineSpacingMultiple: 1.4,
  });

  // Badges row
  const badges = [
    { label: 'Neo4j', color: C.accent },
    { label: 'OpenAI', color: C.info },
    { label: 'React', color: '06B6D4' },
    { label: 'Node.js', color: C.green },
    { label: 'Apify', color: C.yellow },
  ];
  badges.forEach((b, i) => pill(s, b.label, 0.7 + i * 1.6, 5.1, b.color));

  // Hackathon badge
  addCard(s, 0.7, 5.7, 3.8, 0.8, C.cardAlt);
  s.addText('🏆  HackWithBay 2.0  —  Track 9: Neo4j + RocketRide AI', {
    x: 0.85, y: 5.8, w: 3.5, h: 0.6, fontSize: 11, color: C.yellow, bold: true, fontFace: 'Segoe UI',
  });

  // Right panel — feature chips
  const chips = ['🗓  Event Calendar', '🤖  AI Chatbot', '📊  Matching Engine', '🌐  Luma Import', '📧  Email Blasts', '👥  Group Formation'];
  chips.forEach((c, i) => {
    addCard(s, 9.0 + (i % 2) * 2.2, 1.5 + Math.floor(i / 2) * 0.9, 2.0, 0.65, C.cardAlt);
    s.addText(c, { x: 9.1 + (i % 2) * 2.2, y: 1.62 + Math.floor(i / 2) * 0.9, w: 1.8, h: 0.4, fontSize: 12, color: C.white, fontFace: 'Segoe UI' });
  });

  // Bottom bar
  addGradRect(s, 0, 7.3, 13.33, 0.2, C.accent + '44', C.info + '44', 90);
  s.addText('venturegraph.app  ·  github.com/smartnetworking  ·  HackWithBay 2.0', {
    x: 0, y: 7.32, w: 13.33, h: 0.18, fontSize: 9, color: C.muted, align: 'center', fontFace: 'Segoe UI',
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Problem & Solution
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  bg(s);
  addGradRect(s, 0, 0, 13.33, 0.06, C.accent, C.info, 90);

  heading(s, 'The Problem', 0.6, 0.35, 5.5, 28, C.white);
  accentLine(s, 0.6, 0.95, 2.5);

  const problems = [
    ['😤', 'Networking events feel random', 'No structure to meet the right people'],
    ['🕐', 'Time wasted in small talk', 'No pre-matching based on goals & skills'],
    ['📋', 'No attendee intelligence', 'Organisers have no insight into who is attending'],
    ['🔁', 'No follow-through', 'Conversations don\'t convert to real connections'],
  ];

  problems.forEach(([icon, title, desc], i) => {
    addCard(s, 0.6, 1.15 + i * 1.3, 5.8, 1.15, C.card);
    s.addText(icon, { x: 0.75, y: 1.3 + i * 1.3, w: 0.6, h: 0.6, fontSize: 22 });
    s.addText(title, { x: 1.45, y: 1.28 + i * 1.3, w: 4.8, h: 0.38, fontSize: 14, bold: true, color: C.white, fontFace: 'Segoe UI' });
    s.addText(desc, { x: 1.45, y: 1.66 + i * 1.3, w: 4.8, h: 0.38, fontSize: 12, color: C.muted, fontFace: 'Segoe UI' });
  });

  // Divider
  s.addShape(pptx.ShapeType.line, { x: 6.8, y: 0.35, w: 0, h: 6.8, line: { color: C.border, width: 1 } });

  heading(s, 'Our Solution', 7.0, 0.35, 5.5, 28, C.white);
  accentLine(s, 7.0, 0.95, 2.5);

  const solutions = [
    ['🎯', 'Smart Matching Engine', 'Layer 1 role-seek + Layer 2 deep profile scoring'],
    ['🤖', 'AI-Powered Chatbot', 'Event & multi-event discovery with date/time awareness'],
    ['📊', 'Real-time Groups', 'Rotating breakout groups with anti-repeat tracking'],
    ['🌐', 'Luma Integration', 'Apify scraper pulls events + attendees into dual DB'],
  ];

  solutions.forEach(([icon, title, desc], i) => {
    addCard(s, 7.0, 1.15 + i * 1.3, 5.8, 1.15, C.cardAlt);
    addGradRect(s, 7.0, 1.15 + i * 1.3, 0.06, 1.15, C.accent, C.info, 180);
    s.addText(icon, { x: 7.15, y: 1.3 + i * 1.3, w: 0.6, h: 0.6, fontSize: 22 });
    s.addText(title, { x: 7.85, y: 1.28 + i * 1.3, w: 4.6, h: 0.38, fontSize: 14, bold: true, color: C.white, fontFace: 'Segoe UI' });
    s.addText(desc, { x: 7.85, y: 1.66 + i * 1.3, w: 4.6, h: 0.38, fontSize: 12, color: C.muted, fontFace: 'Segoe UI' });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Tech Stack
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  bg(s);
  addGradRect(s, 0, 0, 13.33, 0.06, C.accent, C.info, 90);

  heading(s, 'Technology Stack', 0.6, 0.25, 12, 28);
  accentLine(s, 0.6, 0.85, 3);
  body(s, 'Full-stack graph-native architecture with dual database, AI personalization and real-time WebSocket communication', 0.6, 0.92, 11, 0.4, 13);

  const layers = [
    {
      label: 'FRONTEND', color: '06B6D4',
      items: [
        ['React 18 + Vite', 'SPA with react-router-dom v6'],
        ['CSS Variables', 'Dark/light theme via data-theme'],
        ['Custom Markdown', 'ChatMessageBody renderer'],
        ['EventsCalendar', 'AI sidebar + date filters'],
        ['EventRoom', 'Breakout groups + schedule'],
        ['EventJoin', 'Floating AI chatbot'],
      ],
    },
    {
      label: 'BACKEND', color: C.accent,
      items: [
        ['Node.js + Express', 'REST API on port 4000'],
        ['WebSocket (ws)', 'Real-time checkin broadcast'],
        ['nodemailer', 'SMTP email blasts'],
        ['JWT + bcryptjs', 'Auth tokens'],
        ['uuid v4', 'Entity ID generation'],
        ['DAL abstraction', 'DB_DRIVER=neo4j|sqlite'],
      ],
    },
    {
      label: 'DATABASE', color: C.green,
      items: [
        ['Neo4j AuraDB', 'Graph DB — Cypher queries'],
        ['SQLite', 'Embedded via better-sqlite3'],
        ['Dual-write', 'Luma import → both DBs'],
        ['7 Node types', 'Person, Event, Skill, Goal…'],
        ['10 Rel types', 'ATTENDED, SEEKS_ROLE…'],
        ['In-memory match', 'SQLite JS scoring engine'],
      ],
    },
    {
      label: 'AI / INTEGRATIONS', color: C.yellow,
      items: [
        ['OpenAI GPT-4o-mini', 'LLM for chat responses'],
        ['RocketRide SDK', 'Pipeline orchestration (prep)'],
        ['Apify Scraper', 'Luma event + attendee import'],
        ['Date/Time Parser', 'Server-side query pre-filter'],
        ['Persona Insights', 'AI profile summaries'],
        ['Email AI', 'Personalised match emails'],
      ],
    },
  ];

  layers.forEach((layer, col) => {
    const x = 0.5 + col * 3.2;
    addCard(s, x, 1.45, 3.0, 5.5, C.card);
    addGradRect(s, x, 1.45, 3.0, 0.42, layer.color + 'CC', layer.color + '44', 135);
    s.addText(layer.label, { x: x + 0.12, y: 1.52, w: 2.76, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI', align: 'center' });

    layer.items.forEach(([name, desc], i) => {
      s.addShape(pptx.ShapeType.line, { x: x + 0.15, y: 1.92 + i * 0.82, w: 2.7, h: 0, line: { color: C.border, width: 0.5 } });
      s.addText(name, { x: x + 0.15, y: 1.96 + i * 0.82, w: 2.7, h: 0.28, fontSize: 12, bold: true, color: C.white, fontFace: 'Segoe UI' });
      s.addText(desc, { x: x + 0.15, y: 2.24 + i * 0.82, w: 2.7, h: 0.28, fontSize: 10, color: C.muted, fontFace: 'Segoe UI' });
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — System Architecture
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  bg(s);
  addGradRect(s, 0, 0, 13.33, 0.06, C.accent, C.info, 90);

  heading(s, 'System Architecture', 0.6, 0.25, 12, 28);
  accentLine(s, 0.6, 0.85, 3);

  // Layer boxes
  const layers = [
    { label: 'BROWSER / CLIENT  (React + Vite :5173)', color: '06B6D4', y: 1.05, items: ['EventsCalendar  ·  EventJoin  ·  EventRoom  ·  Profile  ·  My Events  ·  Create Event  ·  Check-in'] },
    { label: 'REST API + WebSocket  (Express :4000)', color: C.accent, y: 2.3, items: ['/api/auth  ·  /api/events  ·  /api/matching  ·  /api/personalization  ·  /api/profiles  ·  /api/email  ·  /api/ai'] },
    { label: 'SERVICES LAYER', color: C.info, y: 3.55, items: ['Matching Engine  ·  AI Adapter (OpenAI / RocketRide)  ·  Luma Import (Apify)  ·  Email Service (nodemailer)  ·  DAL Abstraction'] },
    { label: 'DATA LAYER', color: C.green, y: 4.8, items: ['Neo4j AuraDB  (graph — Cypher)                    SQLite  (embedded — SQL + JS matching)'] },
    { label: 'EXTERNAL SERVICES', color: C.yellow, y: 6.05, items: ['OpenAI API  ·  RocketRide API  ·  Apify (lu-ma-scraper)  ·  SMTP Email Provider'] },
  ];

  layers.forEach(layer => {
    addCard(s, 0.5, layer.y, 12.33, 1.0, C.card);
    addGradRect(s, 0.5, layer.y, 12.33, 0.32, layer.color + 'BB', layer.color + '33', 90);
    s.addText(layer.label, { x: 0.65, y: layer.y + 0.04, w: 12, h: 0.24, fontSize: 10, bold: true, color: C.white, fontFace: 'Segoe UI' });
    s.addText(layer.items[0], { x: 0.65, y: layer.y + 0.42, w: 12, h: 0.44, fontSize: 13, color: 'D0D0F0', fontFace: 'Segoe UI' });

    // Arrow down (except last)
    if (layer.y < 6.0) {
      s.addShape(pptx.ShapeType.line, { x: 6.5, y: layer.y + 1.0, w: 0, h: 0.2, line: { color: C.border, width: 1.5 } });
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Matching Algorithm
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  bg(s);
  addGradRect(s, 0, 0, 13.33, 0.06, C.accent, C.info, 90);

  heading(s, 'Matching Algorithm', 0.6, 0.25, 12, 28);
  accentLine(s, 0.6, 0.85, 3.5);
  body(s, 'Two-layer scoring engine produces ranked attendee pairs and optimal group assignments', 0.6, 0.92, 11, 0.38, 13);

  // Layer 1
  addCard(s, 0.5, 1.4, 5.9, 2.6, C.card);
  addGradRect(s, 0.5, 1.4, 5.9, 0.38, C.accent + 'CC', C.accent + '44', 135);
  s.addText('LAYER 1  —  Role-Seek Scoring', { x: 0.65, y: 1.45, w: 5.6, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });

  const l1 = [
    ['seeksRoles match', 'A seeks "Investor" → B is investor  =  +10 pts'],
    ['Bidirectional boost', 'Both sides match each other  =  double score'],
    ['whoYouSeek text', 'Keyword match in registration intent  =  +5 pts'],
    ['Result', 'Ranked candidate pairs per person'],
  ];
  l1.forEach(([k, v], i) => {
    s.addText('›', { x: 0.65, y: 1.94 + i * 0.46, w: 0.2, h: 0.32, fontSize: 14, color: C.accent, bold: true, fontFace: 'Segoe UI' });
    s.addText(k + ':', { x: 0.88, y: 1.94 + i * 0.46, w: 1.6, h: 0.32, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });
    s.addText(v, { x: 2.5, y: 1.94 + i * 0.46, w: 3.7, h: 0.32, fontSize: 11, color: C.muted, fontFace: 'Segoe UI' });
  });

  // Layer 2
  addCard(s, 6.9, 1.4, 5.9, 2.6, C.card);
  addGradRect(s, 6.9, 1.4, 5.9, 0.38, C.info + 'CC', C.info + '44', 135);
  s.addText('LAYER 2  —  Deep Profile Scoring', { x: 7.05, y: 1.45, w: 5.6, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });

  const l2 = [
    ['Skills match', 'skillsHave ↔ skillsSeek  =  +8 pts each'],
    ['Company stage', 'Same growth stage  =  +6 pts'],
    ['Event intent', 'Semantic whoYouAre/whoYouSeek  =  +10 pts'],
    ['Work history', 'Shared past companies/sectors  =  +4 pts'],
  ];
  l2.forEach(([k, v], i) => {
    s.addText('›', { x: 7.05, y: 1.94 + i * 0.46, w: 0.2, h: 0.32, fontSize: 14, color: C.info, bold: true, fontFace: 'Segoe UI' });
    s.addText(k + ':', { x: 7.28, y: 1.94 + i * 0.46, w: 1.5, h: 0.32, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });
    s.addText(v, { x: 8.8, y: 1.94 + i * 0.46, w: 3.8, h: 0.32, fontSize: 11, color: C.muted, fontFace: 'Segoe UI' });
  });

  // Group planner
  addCard(s, 0.5, 4.15, 12.3, 2.85, C.cardAlt);
  addGradRect(s, 0.5, 4.15, 12.3, 0.38, C.green + 'AA', C.green + '33', 135);
  s.addText('GROUP PLANNER  —  Round-Robin Interest Distribution', { x: 0.65, y: 4.2, w: 12, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });

  const phases = [
    ['① Score', 'Compute pairwise scores\nfor all attendee pairs'],
    ['② Sort', 'Sort pairs highest → lowest\nscore globally'],
    ['③ Assign', 'Greedy group fill: place\nhighest-value pairs first'],
    ['④ Anti-repeat', 'Track seen pairs per round;\nblock re-assignment'],
    ['⑤ Timesheet', 'Generate per-person schedule\nfor all N rounds'],
  ];

  phases.forEach(([num, desc], i) => {
    addCard(s, 0.65 + i * 2.42, 4.65, 2.25, 2.15, C.card);
    s.addText(num, { x: 0.75 + i * 2.42, y: 4.72, w: 2.05, h: 0.4, fontSize: 18, bold: true, color: C.accent, fontFace: 'Segoe UI', align: 'center' });
    s.addText(desc, { x: 0.75 + i * 2.42, y: 5.22, w: 2.05, h: 1.3, fontSize: 11, color: C.muted, fontFace: 'Segoe UI', align: 'center', wrap: true });
    if (i < 4) {
      s.addText('→', { x: 2.72 + i * 2.42, y: 5.35, w: 0.3, h: 0.4, fontSize: 18, color: C.border, bold: true, fontFace: 'Segoe UI' });
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — AI Chatbot & Personalization
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  bg(s);
  addGradRect(s, 0, 0, 13.33, 0.06, C.accent, C.info, 90);

  heading(s, 'AI Chatbot & Personalization', 0.6, 0.25, 12, 28);
  accentLine(s, 0.6, 0.85, 4);
  body(s, 'Deep event discovery with server-side date/time awareness, parallel DB loading and structured LLM prompting', 0.6, 0.92, 11, 0.38, 13);

  // Flow steps
  const steps = [
    { n: '1', title: 'User Query', desc: '"Best events\nApril 1-10 after 6pm"', color: C.accent },
    { n: '2', title: 'Date/Time Parser', desc: 'extractDateTimeFilters()\nextracts range + time', color: C.info },
    { n: '3', title: 'DB Pre-Filter', desc: 'preFilterEvents() cuts\n60 events → 4 matches', color: C.green },
    { n: '4', title: 'Profile Loader', desc: 'Parallel load: person\n+ skills + past events', color: C.yellow },
    { n: '5', title: 'LLM Call', desc: 'GPT-4o-mini with\nstructured prompt block', color: C.pink },
    { n: '6', title: 'AI Response', desc: 'Ranked list with\nreasoning section', color: C.accent },
  ];

  steps.forEach((step, i) => {
    const x = 0.5 + i * 2.12;
    addCard(s, x, 1.45, 1.95, 2.35, C.card);
    addGradRect(s, x, 1.45, 1.95, 0.38, step.color + 'BB', step.color + '33', 135);
    s.addText(step.n, { x: x + 0.75, y: 1.49, w: 0.45, h: 0.3, fontSize: 12, bold: true, color: C.white, fontFace: 'Segoe UI', align: 'center' });
    s.addText(step.title, { x: x + 0.08, y: 1.95, w: 1.8, h: 0.4, fontSize: 12, bold: true, color: C.white, fontFace: 'Segoe UI', align: 'center' });
    s.addText(step.desc, { x: x + 0.08, y: 2.42, w: 1.8, h: 0.7, fontSize: 10, color: C.muted, fontFace: 'Segoe UI', align: 'center', wrap: true });
    if (i < 5) {
      s.addText('→', { x: x + 1.98, y: 2.35, w: 0.18, h: 0.4, fontSize: 16, color: C.border, bold: true });
    }
  });

  // Prompt architecture card
  addCard(s, 0.5, 4.0, 5.9, 3.0, C.card);
  addGradRect(s, 0.5, 4.0, 5.9, 0.38, C.accent + 'CC', C.accent + '33', 135);
  s.addText('PROMPT ARCHITECTURE', { x: 0.65, y: 4.05, w: 5.6, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });

  const prompts = [
    'System role: expert networking advisor',
    'Person profile block: skills, roles, goals',
    'PRE-FILTERED EVENTS block (date/time match)',
    'Attendee index: top 20 events × 15 attendees',
    'CRITICAL RULES 1-7 for structured output',
    'Mandatory **Reasoning:** footer section',
  ];
  prompts.forEach((p, i) => {
    s.addText('›  ' + p, { x: 0.65, y: 4.52 + i * 0.38, w: 5.6, h: 0.34, fontSize: 11, color: i < 2 ? C.white : C.muted, fontFace: 'Segoe UI' });
  });

  // Performance card
  addCard(s, 6.9, 4.0, 5.9, 3.0, C.card);
  addGradRect(s, 6.9, 4.0, 5.9, 0.38, C.green + 'CC', C.green + '33', 135);
  s.addText('PERFORMANCE OPTIMISATIONS', { x: 7.05, y: 4.05, w: 5.6, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });

  const perf = [
    ['Promise.allSettled', 'Parallel DB queries — no sequential waits'],
    ['Limit 25 profiles', 'Cap attendee deep-loads per event'],
    ['Top 20 events', 'Bound multi-event index size'],
    ['Token budget', '1000 (multi) / 1200 (single) tokens'],
    ['Server pre-filter', 'LLM only sees relevant events'],
    ['Lazy Neo4j load', 'Skip heavy queries when SQLite active'],
  ];
  perf.forEach(([k, v], i) => {
    s.addText(k + ':', { x: 7.05, y: 4.52 + i * 0.38, w: 1.8, h: 0.34, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });
    s.addText(v, { x: 8.88, y: 4.52 + i * 0.38, w: 3.8, h: 0.34, fontSize: 11, color: C.muted, fontFace: 'Segoe UI' });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Neo4j Graph Database
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  bg(s);
  addGradRect(s, 0, 0, 13.33, 0.06, C.accent, C.info, 90);

  heading(s, 'Neo4j Graph Database', 0.6, 0.25, 12, 28);
  accentLine(s, 0.6, 0.85, 3.5);

  // Node types
  addCard(s, 0.5, 1.1, 5.4, 4.1, C.card);
  addGradRect(s, 0.5, 1.1, 5.4, 0.38, C.accent + 'BB', C.accent + '33', 135);
  s.addText('NODE TYPES  (7)', { x: 0.65, y: 1.15, w: 5.1, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });

  const nodes = [
    ['Person', 'id, name, email, roles, skills, headline'],
    ['Event', 'id, name, type, date, location, description'],
    ['Skill', 'id, name, category (general/technical)'],
    ['Company', 'name, stage, domain'],
    ['Goal', 'id, purpose, personId, eventId'],
    ['User', 'id, email, passwordHash, personId'],
    ['Profile', 'summary, headline, workExperience[]'],
  ];
  nodes.forEach(([name, desc], i) => {
    addCard(s, 0.65, 1.6 + i * 0.5, 5.1, 0.42, C.cardAlt);
    s.addText(name, { x: 0.8, y: 1.66 + i * 0.5, w: 1.2, h: 0.3, fontSize: 11, bold: true, color: C.accent, fontFace: 'Segoe UI' });
    s.addText(desc, { x: 2.08, y: 1.66 + i * 0.5, w: 3.6, h: 0.3, fontSize: 10, color: C.muted, fontFace: 'Segoe UI' });
  });

  // Relationship types
  addCard(s, 6.1, 1.1, 6.7, 4.1, C.card);
  addGradRect(s, 6.1, 1.1, 6.7, 0.38, C.info + 'BB', C.info + '33', 135);
  s.addText('RELATIONSHIP TYPES  (10)', { x: 6.25, y: 1.15, w: 6.4, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });

  const rels = [
    ['ATTENDED', '(Person)-[:ATTENDED]->(Event)'],
    ['REGISTERED_FOR', '(Person)-[:REGISTERED_FOR]->(Event)'],
    ['HAS_SKILL', '(Person)-[:HAS_SKILL {level}]->(Skill)'],
    ['SEEKS_SKILL', '(Person)-[:SEEKS_SKILL {priority}]->(Skill)'],
    ['SEEKS_ROLE', '(Person)-[:SEEKS_ROLE {role}]->(Person)'],
    ['WORKS_AT', '(Person)-[:WORKS_AT]->(Company)'],
    ['WANTS_TO_MEET', '(Person)-[:WANTS_TO_MEET]->(Person)'],
    ['BLOCKS', '(Person)-[:BLOCKS]->(Person)'],
  ];
  rels.forEach(([rel, cypher], i) => {
    addCard(s, 6.25, 1.6 + i * 0.46, 6.4, 0.38, C.cardAlt);
    s.addText(rel, { x: 6.38, y: 1.65 + i * 0.46, w: 1.7, h: 0.28, fontSize: 10, bold: true, color: C.info, fontFace: 'Segoe UI' });
    s.addText(cypher, { x: 8.12, y: 1.65 + i * 0.46, w: 4.4, h: 0.28, fontSize: 9.5, color: C.muted, fontFace: 'Consolas' });
  });

  // Graph advantage
  addCard(s, 0.5, 5.35, 12.3, 1.7, C.cardAlt);
  addGradRect(s, 0.5, 5.35, 12.3, 0.36, C.green + 'AA', C.green + '33', 135);
  s.addText('WHY GRAPH DATABASE?', { x: 0.65, y: 5.4, w: 12, h: 0.26, fontSize: 10, bold: true, color: C.white, fontFace: 'Segoe UI' });

  const why = [
    '2-hop traversal: find people who know people you want to meet',
    'Pattern matching: MATCH (a)-[:SEEKS_ROLE]->(b)-[:HAS_SKILL]->(s) in one query',
    'Relationship-first: connections are first-class citizens, not join tables',
    'Scale: graph queries stay O(subgraph) as data grows — no full table scans',
  ];
  why.forEach((w, i) => {
    s.addText('›  ' + w, { x: 0.7, y: 5.82 + i * 0.28, w: 12, h: 0.26, fontSize: 10, color: C.muted, fontFace: 'Segoe UI' });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — Luma Import via Apify
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  bg(s);
  addGradRect(s, 0, 0, 13.33, 0.06, C.accent, C.info, 90);

  heading(s, 'Luma Event Import  —  Apify Integration', 0.6, 0.25, 12, 28);
  accentLine(s, 0.6, 0.85, 4.5);

  // Flow
  const flow = [
    { icon: '🌐', label: 'Apify Actor', desc: 'lexis-solutions~\nlu-ma-scraper', color: C.yellow },
    { icon: '📦', label: 'Raw Items', desc: 'Events + guests\n+ hosts + speakers', color: C.info },
    { icon: '⚙️', label: 'Parse', desc: 'parseApifyEvent()\nparseApifyPerson()', color: C.accent },
    { icon: '💾', label: 'SQLite', desc: 'createEvent()\ncreateOrMergePerson()', color: C.green },
    { icon: '🔷', label: 'Neo4j', desc: 'createEvent()\ncreateOrMergePerson()', color: '00D2FF' },
  ];

  flow.forEach((f, i) => {
    addCard(s, 0.5 + i * 2.6, 1.3, 2.3, 2.5, C.card);
    addGradRect(s, 0.5 + i * 2.6, 1.3, 2.3, 0.38, f.color + 'BB', f.color + '33', 135);
    s.addText(f.icon, { x: 0.9 + i * 2.6, y: 1.35, w: 1.5, h: 0.3, fontSize: 16, align: 'center' });
    s.addText(f.label, { x: 0.58 + i * 2.6, y: 1.82, w: 2.14, h: 0.36, fontSize: 13, bold: true, color: C.white, fontFace: 'Segoe UI', align: 'center' });
    s.addText(f.desc, { x: 0.58 + i * 2.6, y: 2.25, w: 2.14, h: 0.8, fontSize: 10.5, color: C.muted, fontFace: 'Consolas', align: 'center', wrap: true });
    if (i < 4) {
      s.addText(i === 2 ? '⬇' : '→', {
        x: i < 3 ? 2.62 + i * 2.6 : 3.02 + i * 2.6,
        y: i < 3 ? 2.35 : 2.95,
        w: 0.25, h: 0.36, fontSize: 16, color: C.border, bold: true,
      });
    }
  });

  // tryDual pattern
  addCard(s, 0.5, 4.0, 7.2, 3.0, C.card);
  addGradRect(s, 0.5, 4.0, 7.2, 0.38, C.accent + 'BB', C.accent + '33', 135);
  s.addText('DUAL-WRITE PATTERN  (tryDual)', { x: 0.65, y: 4.05, w: 7, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });

  const codeLines = [
    'async function tryDual(fn) {',
    '  const [sqlite, neo4j] = await Promise.allSettled([',
    '    fn(getSqlite()),   // write to SQLite',
    '    fn(getNeo4j()),    // write to Neo4j',
    '  ]);',
    '  // throws only if BOTH fail',
    '}',
  ];
  codeLines.forEach((line, i) => {
    s.addText(line, { x: 0.65, y: 4.52 + i * 0.34, w: 7, h: 0.32, fontSize: 10, color: i === 0 ? C.yellow : i === 6 ? C.yellow : i >= 1 && i <= 4 ? C.white : C.muted, fontFace: 'Consolas' });
  });

  // Data extracted
  addCard(s, 7.9, 4.0, 5.0, 3.0, C.card);
  addGradRect(s, 7.9, 4.0, 5.0, 0.38, C.green + 'BB', C.green + '33', 135);
  s.addText('DATA EXTRACTED PER PERSON', { x: 8.05, y: 4.05, w: 4.7, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });

  const fields = ['name  ·  email  ·  linkedinUrl', 'jobTitle  ·  company  ·  bio', 'roles  ·  headline', 'workExperience[]', 'eventIntent (who they are)', 'who they seek / tagline'];
  fields.forEach((f, i) => {
    s.addText('›  ' + f, { x: 8.05, y: 4.52 + i * 0.38, w: 4.7, h: 0.34, fontSize: 11, color: C.muted, fontFace: 'Segoe UI' });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Key Features & User Flows
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  bg(s);
  addGradRect(s, 0, 0, 13.33, 0.06, C.accent, C.info, 90);

  heading(s, 'Key Features & User Flows', 0.6, 0.25, 12, 28);
  accentLine(s, 0.6, 0.85, 3.5);

  const features = [
    {
      icon: '🗓', title: 'Events Calendar', color: C.accent,
      points: ['Date range + time filters', 'AI sidebar with quick chips', 'Card click → Join or Room', 'Luma import with dual-save status'],
    },
    {
      icon: '🤖', title: 'AI Chatbot', color: C.info,
      points: ['Multi-event: "top events April 1-10"', 'Single-event: attendee intelligence', 'Date/time aware pre-filtering', 'Accessible before check-in'],
    },
    {
      icon: '📊', title: 'Event Room', color: C.green,
      points: ['Attendee list with profiles', 'My Schedule tab (1-on-1s)', 'Breakout Groups tab', 'Real-time WebSocket updates'],
    },
    {
      icon: '✉️', title: 'Email Blasts', color: C.yellow,
      points: ['Host sends personalised emails', 'AI-written per attendee', 'Includes match details', 'Triggers post-algorithm run'],
    },
    {
      icon: '👤', title: 'Profile System', color: C.pink,
      points: ['Skills have / seek', 'Work experience + projects', 'LinkedIn import ready', 'Persona AI summary'],
    },
    {
      icon: '⚡', title: 'Auth & Identity', color: '00D2FF',
      points: ['Email-only login (no password)', 'personId in localStorage', 'Host vs attendee roles', 'Event-level registration'],
    },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.28;
    const y = 1.25 + row * 2.95;

    addCard(s, x, y, 4.0, 2.7, C.card);
    addGradRect(s, x, y, 4.0, 0.38, f.color + 'BB', f.color + '33', 135);
    s.addText(f.icon + '  ' + f.title, { x: x + 0.15, y: y + 0.06, w: 3.7, h: 0.28, fontSize: 12, bold: true, color: C.white, fontFace: 'Segoe UI' });

    f.points.forEach((p, j) => {
      s.addText('›  ' + p, { x: x + 0.15, y: y + 0.52 + j * 0.5, w: 3.7, h: 0.44, fontSize: 11, color: C.muted, fontFace: 'Segoe UI' });
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — Demo & Hackathon
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  bg(s);
  addGradRect(s, 0, 0, 13.33, 0.06, C.accent, C.info, 90);

  // Decorative glow
  s.addShape(pptx.ShapeType.ellipse, {
    x: 9.5, y: 2, w: 5.5, h: 5.5,
    fill: { type: 'grad', stops: [{ position: 0, color: C.accent + '22' }, { position: 100, color: C.dark }], angle: 135 },
    line: { type: 'none' },
  });

  heading(s, 'Demo & Hackathon Details', 0.6, 0.25, 12, 28);
  accentLine(s, 0.6, 0.85, 4);

  // Demo logins
  addCard(s, 0.5, 1.2, 5.8, 3.2, C.card);
  addGradRect(s, 0.5, 1.2, 5.8, 0.38, C.accent + 'BB', C.accent + '33', 135);
  s.addText('DEMO LOGINS  (no password)', { x: 0.65, y: 1.25, w: 5.5, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });

  const logins = [
    ['Host', 'saurabhskhire@gmail.com'],
    ['Mixer attendee', 'kendall.kim.13@techfounder.dev'],
    ['AI & ML event', 'alex.rodriguez.120@techfounder.dev'],
    ['Pattern', '{first}.{last}.{index}@techfounder.dev'],
  ];
  logins.forEach(([role, email], i) => {
    addCard(s, 0.65, 1.72 + i * 0.62, 5.5, 0.52, C.cardAlt);
    s.addText(role + ':', { x: 0.8, y: 1.79 + i * 0.62, w: 1.5, h: 0.34, fontSize: 11, bold: true, color: C.muted, fontFace: 'Segoe UI' });
    s.addText(email, { x: 2.35, y: 1.79 + i * 0.62, w: 3.7, h: 0.34, fontSize: 11, color: C.white, fontFace: 'Consolas' });
  });

  // Mock data
  addCard(s, 0.5, 4.55, 5.8, 2.45, C.card);
  addGradRect(s, 0.5, 4.55, 5.8, 0.38, C.green + 'AA', C.green + '33', 135);
  s.addText('MOCK DATA', { x: 0.65, y: 4.6, w: 5.5, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });

  const mocks = [
    '60 events (multiple mixer, personal, normal types)',
    '240 attendees (60 per live event)',
    '4 LIVE events with real matchable profiles',
    'npm run db:mock:sqlite  →  seed SQLite',
    'npm run db:mock  →  seed Neo4j',
  ];
  mocks.forEach((m, i) => {
    s.addText('›  ' + m, { x: 0.65, y: 5.06 + i * 0.36, w: 5.5, h: 0.32, fontSize: 11, color: C.muted, fontFace: 'Segoe UI' });
  });

  // Hackathon
  addCard(s, 6.6, 1.2, 6.2, 2.0, C.cardAlt);
  addGradRect(s, 6.6, 1.2, 6.2, 0.38, C.yellow + 'AA', C.yellow + '33', 135);
  s.addText('🏆  HACKWITHBAY 2.0', { x: 6.75, y: 1.25, w: 5.9, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });
  const hack = ['Track 9: Neo4j + RocketRide AI', 'Graph DB + LLM pipeline integration', 'Dual database architecture', 'Real-world event networking use-case'];
  hack.forEach((h, i) => {
    s.addText('›  ' + h, { x: 6.75, y: 1.72 + i * 0.34, w: 5.9, h: 0.3, fontSize: 11, color: C.muted, fontFace: 'Segoe UI' });
  });

  // Run commands
  addCard(s, 6.6, 3.35, 6.2, 1.6, C.card);
  addGradRect(s, 6.6, 3.35, 6.2, 0.38, C.info + 'AA', C.info + '33', 135);
  s.addText('RUN COMMANDS', { x: 6.75, y: 3.4, w: 5.9, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });
  const cmds = ['npm run dev          →  SQLite (default)', 'npm run dev:neo4j    →  Neo4j AuraDB', 'npm run stop:dev     →  kill ports 4000/5173'];
  cmds.forEach((c, i) => {
    s.addText(c, { x: 6.75, y: 3.85 + i * 0.36, w: 5.9, h: 0.32, fontSize: 10.5, color: C.muted, fontFace: 'Consolas' });
  });

  // Env vars
  addCard(s, 6.6, 5.1, 6.2, 1.9, C.card);
  addGradRect(s, 6.6, 5.1, 6.2, 0.38, C.pink + 'AA', C.pink + '33', 135);
  s.addText('KEY ENV VARS', { x: 6.75, y: 5.15, w: 5.9, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI' });
  const envs = ['DB_DRIVER=neo4j|sqlite', 'NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD', 'OPENAI_API_KEY', 'APIFY_TOKEN  (lu-ma-scraper)', 'AI_SKIP_ROCKETRIDE=true'];
  envs.forEach((e, i) => {
    s.addText(e, { x: 6.75, y: 5.62 + i * 0.28, w: 5.9, h: 0.26, fontSize: 10, color: C.muted, fontFace: 'Consolas' });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Thank You
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  bg(s);
  addGradRect(s, 0, 0, 13.33, 0.06, C.accent, C.info, 90);

  // Large decorative circles
  s.addShape(pptx.ShapeType.ellipse, {
    x: -1, y: 4, w: 6, h: 6,
    fill: { type: 'grad', stops: [{ position: 0, color: C.accent + '22' }, { position: 100, color: C.dark }], angle: 135 },
    line: { type: 'none' },
  });
  s.addShape(pptx.ShapeType.ellipse, {
    x: 9, y: -1, w: 6, h: 6,
    fill: { type: 'grad', stops: [{ position: 0, color: C.info + '22' }, { position: 100, color: C.dark }], angle: 45 },
    line: { type: 'none' },
  });

  // Thank you text
  s.addText('Thank You', { x: 1.5, y: 1.8, w: 10, h: 1.4, fontSize: 72, bold: true, color: C.white, fontFace: 'Segoe UI', align: 'center' });
  addGradRect(s, 4.17, 3.25, 5, 0.07, C.accent, C.info, 90);
  s.addText('VentureGraph  ·  Smart Networking Platform', {
    x: 1.5, y: 3.45, w: 10, h: 0.5, fontSize: 18, color: C.muted, fontFace: 'Segoe UI', align: 'center',
  });

  // Summary chips
  const chips = [
    { t: 'Neo4j Graph DB', c: C.accent },
    { t: 'AI Matching', c: C.info },
    { t: 'OpenAI GPT-4o', c: '06B6D4' },
    { t: 'Apify Scraper', c: C.yellow },
    { t: 'Dual-Write DB', c: C.green },
    { t: 'RocketRide', c: C.pink },
  ];
  const totalW = chips.length * 1.9 + (chips.length - 1) * 0.2;
  const startX = (13.33 - totalW) / 2;
  chips.forEach((chip, i) => {
    addGradRect(s, startX + i * 2.1, 4.2, 1.9, 0.38, chip.c + 'CC', chip.c + '55', 135);
    s.addText(chip.t, { x: startX + i * 2.1, y: 4.22, w: 1.9, h: 0.34, fontSize: 11, bold: true, color: C.white, fontFace: 'Segoe UI', align: 'center' });
  });

  // Built for
  addCard(s, 3.5, 5.0, 6.33, 1.4, C.card);
  s.addText('Built for HackWithBay 2.0  —  Track 9', {
    x: 3.6, y: 5.1, w: 6.13, h: 0.4, fontSize: 15, bold: true, color: C.yellow, fontFace: 'Segoe UI', align: 'center',
  });
  s.addText('Neo4j Graph Database  +  RocketRide AI Pipeline  +  OpenAI GPT-4o-mini', {
    x: 3.6, y: 5.58, w: 6.13, h: 0.32, fontSize: 11, color: C.muted, fontFace: 'Segoe UI', align: 'center',
  });

  addGradRect(s, 0, 7.3, 13.33, 0.2, C.accent + '44', C.info + '44', 90);
  s.addText('Questions? Let\'s connect.', {
    x: 0, y: 7.32, w: 13.33, h: 0.18, fontSize: 9, color: C.muted, align: 'center', fontFace: 'Segoe UI',
  });
}

// ── Write file ────────────────────────────────────────────────────────────────
const outPath = path.join(OUT_DIR, 'VentureGraph_Presentation.pptx');
pptx.writeFile({ fileName: outPath })
  .then(() => console.log('✓ Wrote', outPath))
  .catch(e => { console.error(e); process.exit(1); });
