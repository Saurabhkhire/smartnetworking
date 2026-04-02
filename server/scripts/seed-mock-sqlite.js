/**
 * Seed mock data into SQLite.
 *
 * 60 events spread across today through day+14 (many overlapping at same
 * date+time to show calendar conflicts).
 *
 * FOUR “live” events get 60 attendees each (full profiles: skills, work history,
 * projects, certifications, LinkedIn, past event history). Every other event gets
 * 6 showcase attendees with the same depth of data.
 *
 * All events: Saurabh Khire (saurabhskhire@gmail.com) is host, checked in, with
 * default blasts if none were specified on the template.
 *
 * Run:  npm run db:mock:sqlite   (from repo root or server/)
 */

const path = require('path');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

process.env.DB_DRIVER = 'sqlite';
const dal = require('../src/db/sqlite-dal');

// ── Date helpers ─────────────────────────────────────────────────────────────
function daysFromNow(n) {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}
function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}
const D0  = daysFromNow(0);
const D1  = daysFromNow(1);
const D2  = daysFromNow(2);
const D3  = daysFromNow(3);
const D5  = daysFromNow(5);
const D7  = daysFromNow(7);
const D10 = daysFromNow(10);
const D14 = daysFromNow(14);

// ── CONFIG ────────────────────────────────────────────────────────────────────
/** Saurabh is host here; these two also get 60 checked-in attendees. */
const SAURABH_HOST_EVENTS = new Set([
  'Bay Area Founders Mixer',
  'Tech Startup 1-on-1s',
]);
const ATTENDEES_COUNT = 60;
/** All other events: checked-in count (registration + check-in mock). */
const OTHER_EVENT_ATTENDEES = 10;
const DEFAULT_BLASTS = ['✨ Open registration — join the Bay Area guest list', '📍 Full venue + host details in app'];

const EVENTS = [
  // ── TODAY (D0) — afternoon cluster ──────────────────────────────────────
  {
    name: 'Tech Startup 1-on-1s', type: 'personal', date: D0, startTime: '14:00',
    durationMins: 120, roundMins: 10, groupSizeMin: 2, groupSizeMax: 2,
    location: 'SoMa, San Francisco',
    description: 'Structured one-on-one meetings for founders and operators to explore partnerships, co-founder relationships, and warm intros. 10-minute speed rounds with AI-matched pairs.',
    blasts: ['🔥 60+ attendees registered', '⚡ Algorithm matching enabled', '📧 Personalized schedules will be emailed'],
  },
  {
    name: 'Product Leaders Roundtable', type: 'personal', date: D0, startTime: '14:30',
    durationMins: 90, roundMins: 10, groupSizeMin: 2, groupSizeMax: 2,
    location: 'Downtown San Jose',
    description: 'An intimate roundtable for senior product leaders to exchange playbooks on roadmap strategy, stakeholder alignment, and scaling product orgs.',
    blasts: ['Sold out last time — register early', '🎤 Featured speaker joining'],
  },
  {
    name: 'Early-Stage Founders Lunch', type: 'normal', date: D0, startTime: '13:00',
    durationMins: 90, roundMins: 10, groupSizeMin: 2, groupSizeMax: 4,
    location: 'University Ave, Palo Alto',
    description: 'A relaxed lunch for pre-seed and seed-stage founders to share learnings, troubleshoot early-stage challenges, and find potential collaborators.',
    blasts: ['Early bird spots limited'],
  },
  {
    name: 'AI & ML Builders Meetup', type: 'mixer', date: D0, startTime: '15:00',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'Mission District, San Francisco',
    description: 'A hands-on mixer for engineers, researchers, and founders building with machine learning. Share demos, swap war stories, and explore collaborations across LLMs, vision, and applied AI.',
    blasts: ['🔥 60+ attendees registered', '⚡ Algorithm matching enabled', '📧 Personalized schedules will be emailed'],
  },
  // ── TODAY (D0) — prime-time cluster ─────────────────────────────────────
  {
    name: 'Bay Area Founders Mixer', type: 'mixer', date: D0, startTime: '18:00',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 6,
    location: 'SOMA, San Francisco',
    description: 'The Bay Area\'s premier founders networking event — an energetic mixer bringing together early-stage and growth-stage startup founders for high-signal conversations and warm introductions.',
    blasts: ['🔥 60+ attendees registered', '⚡ Algorithm matching enabled', '📧 Personalized schedules will be emailed'],
  },
  {
    name: 'Investor Office Hours', type: 'personal', date: D0, startTime: '18:00',
    durationMins: 90, roundMins: 10, groupSizeMin: 2, groupSizeMax: 2,
    location: 'Sand Hill Road, Menlo Park',
    description: 'Back-to-back 10-minute slots with active Bay Area investors. Come with a tight pitch and specific ask — investors will give direct feedback on your deck and fundraising strategy.',
    blasts: ['🔥 60+ attendees registered', '⚡ Algorithm matching enabled', '📧 Personalized schedules will be emailed'],
  },
  {
    name: 'SaaS Growth Happy Hour', type: 'mixer', date: D0, startTime: '18:30',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'Financial District, San Francisco',
    description: 'Casual drinks and structured conversations for SaaS founders and growth leaders. Topics span PLG, demand gen, sales motions, and customer success strategies.',
    blasts: ['New venue — bigger space!'],
  },
  {
    name: 'Web3 & DeFi Builders Night', type: 'normal', date: D0, startTime: '19:00',
    durationMins: 120, roundMins: 10, groupSizeMin: 2, groupSizeMax: 4,
    location: 'SoMa, San Francisco',
    description: 'Deep-dive sessions for builders working on DeFi protocols, Web3 infrastructure, and decentralized applications. Technical talks followed by open networking.',
    blasts: [],
  },
  {
    name: 'Seed-Stage Fundraising Clinic', type: 'personal', date: D0, startTime: '19:00',
    durationMins: 60, roundMins: 10, groupSizeMin: 2, groupSizeMax: 2,
    location: 'University Ave, Palo Alto',
    description: 'One-on-one coaching sessions for founders preparing their seed round. Get feedback on your narrative, financial model, and investor outreach strategy from experienced operators.',
    blasts: ['Early bird spots limited'],
  },
  {
    name: 'Open Networking Night', type: 'normal', date: D0, startTime: '20:00',
    durationMins: 120, roundMins: 10, groupSizeMin: 2, groupSizeMax: 4,
    location: 'Uptown, Oakland',
    description: 'A free-form networking night for the broader Bay Area tech community. No agenda — just great people, good vibes, and serendipitous connections.',
    blasts: [],
  },
  {
    name: 'Design & UX Professionals', type: 'mixer', date: D0, startTime: '18:00',
    durationMins: 90, roundMins: 15, groupSizeMin: 3, groupSizeMax: 5,
    location: 'Hayes Valley, San Francisco',
    description: 'A curated mixer for product designers, UX researchers, and design leaders. Share portfolio work, discuss design systems, and connect with studios and startups hiring design talent.',
    blasts: ['🎤 Featured speaker joining'],
  },
  {
    name: 'Hiring & Talent Mixer', type: 'mixer', date: D0, startTime: '19:30',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 6,
    location: 'Embarcadero, San Francisco',
    description: 'Connect hiring managers, recruiters, and job-seeking technologists in a structured speed-networking format. Ideal for startups building their founding team.',
    blasts: [],
  },
  {
    name: 'DevOps & Platform Engineering', type: 'normal', date: D0, startTime: '17:00',
    durationMins: 90, roundMins: 15, groupSizeMin: 2, groupSizeMax: 4,
    location: 'North San Jose',
    description: 'Technical talks and networking for DevOps engineers, SREs, and platform teams. Sessions cover Kubernetes, observability, CI/CD, and developer productivity.',
    blasts: [],
  },
  {
    name: 'Female Founders Brunch', type: 'mixer', date: D0, startTime: '11:00',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'Pacific Heights, San Francisco',
    description: 'A welcoming brunch mixer for female founders and women in leadership roles across startups and venture. Build your network, find mentors, and celebrate each other\'s wins.',
    blasts: ['Sold out last time — register early'],
  },
  {
    name: 'Healthcare Innovation Summit', type: 'normal', date: D0, startTime: '14:00',
    durationMins: 180, roundMins: 15, groupSizeMin: 2, groupSizeMax: 4,
    location: 'South San Francisco',
    description: 'Half-day summit exploring AI diagnostics, digital therapeutics, and healthcare data infrastructure. Keynotes from leading healthtech founders, followed by investor office hours.',
    blasts: ['🎤 Featured speaker joining'],
  },

  // ── TOMORROW (D1) ────────────────────────────────────────────────────────
  {
    name: 'Investor Network Evening', type: 'personal', date: D1, startTime: '19:00',
    durationMins: 90, roundMins: 10, groupSizeMin: 2, groupSizeMax: 2,
    location: 'Sand Hill Road, Menlo Park',
    description: 'Invite-only evening for LPs, GPs, and angels to exchange deal flow, co-investment opportunities, and portfolio insights in a relaxed setting.',
    blasts: ['Early bird spots limited'],
  },
  {
    name: 'Deep Tech Demo Night', type: 'normal', date: D1, startTime: '18:30',
    durationMins: 120, roundMins: 10, groupSizeMin: 2, groupSizeMax: 4,
    location: 'Mission District, San Francisco',
    description: 'Live demos from founders building in robotics, biotech, quantum, and advanced materials. Five-minute slots per company followed by Q&A and open networking.',
    blasts: ['🎤 Featured speaker joining'],
  },
  {
    name: 'Female Founders Breakfast', type: 'mixer', date: D1, startTime: '09:00',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'Marina District, San Francisco',
    description: 'An early morning gathering for female founders to connect over coffee, share fundraising experiences, and build a supportive peer network before the workday begins.',
    blasts: [],
  },
  {
    name: 'Series A Founders Roundtable', type: 'personal', date: D1, startTime: '14:00',
    durationMins: 90, roundMins: 10, groupSizeMin: 2, groupSizeMax: 2,
    location: 'University Ave, Palo Alto',
    description: 'Candid peer sessions for founders who have closed or are actively raising Series A. Topics include board dynamics, team scaling, and managing investor expectations.',
    blasts: ['Sold out last time — register early'],
  },
  {
    name: 'Climate Tech Networking', type: 'mixer', date: D1, startTime: '18:00',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 6,
    location: 'Dogpatch, San Francisco',
    description: 'Connecting climate tech founders, impact investors, and sustainability-focused operators. Discuss carbon markets, clean energy, and the policy landscape shaping the sector.',
    blasts: [],
  },
  {
    name: 'B2B Sales Leaders Mixer', type: 'mixer', date: D1, startTime: '18:00',
    durationMins: 90, roundMins: 15, groupSizeMin: 3, groupSizeMax: 5,
    location: 'Downtown San Jose',
    description: 'Enterprise and mid-market sales leaders share playbooks on outbound strategy, SDR management, and closing complex deals. Structured breakouts by deal size and industry.',
    blasts: ['New venue — bigger space!'],
  },
  {
    name: 'Web3 Social Night', type: 'normal', date: D1, startTime: '19:30',
    durationMins: 90, roundMins: 10, groupSizeMin: 2, groupSizeMax: 4,
    location: 'SoMa, San Francisco',
    description: 'Casual evening for Web3 builders and enthusiasts to discuss the evolving social layer of the decentralized web, from token-gated communities to decentralized identity.',
    blasts: [],
  },
  {
    name: 'Product & Design Summit', type: 'mixer', date: D1, startTime: '17:00',
    durationMins: 120, roundMins: 15, groupSizeMin: 3, groupSizeMax: 5,
    location: 'Hayes Valley, San Francisco',
    description: 'A combined summit for product managers and designers to explore how the best teams collaborate. Workshops on design sprints, user research, and shipping fast without breaking things.',
    blasts: ['🎤 Featured speaker joining'],
  },
  {
    name: 'Startup Pitch Practice', type: 'normal', date: D1, startTime: '16:00',
    durationMins: 90, roundMins: 10, groupSizeMin: 2, groupSizeMax: 4,
    location: 'Uptown, Oakland',
    description: 'Practice your investor pitch in a friendly environment with structured feedback from experienced founders and operators. Great for anyone preparing for fundraising season.',
    blasts: ['Early bird spots limited'],
  },
  {
    name: 'Enterprise SaaS Meetup', type: 'mixer', date: D1, startTime: '18:30',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'SOMA, San Francisco',
    description: 'Connecting enterprise SaaS founders and buyers to discuss procurement trends, security requirements, and what it takes to land your first Fortune 500 customer.',
    blasts: [],
  },

  // ── DAY +2 ────────────────────────────────────────────────────────────────
  {
    name: 'CXO Summit Networking', type: 'personal', date: D2, startTime: '17:00',
    durationMins: 120, roundMins: 10, groupSizeMin: 2, groupSizeMax: 2,
    location: 'Financial District, San Francisco',
    description: 'Curated one-on-one meetings exclusively for C-suite executives from growth-stage and public tech companies. Discuss leadership challenges, talent strategy, and cross-company partnerships.',
    blasts: ['Sold out last time — register early'],
  },
  {
    name: 'Fintech & Crypto Builders', type: 'mixer', date: D2, startTime: '18:30',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'Financial District, San Francisco',
    description: 'Builders working in payments, digital banking, DeFi, and crypto infrastructure come together to exchange ideas on regulation, user adoption, and the future of financial technology.',
    blasts: [],
  },
  {
    name: 'Angel Investor Speed Dating', type: 'personal', date: D2, startTime: '19:00',
    durationMins: 90, roundMins: 10, groupSizeMin: 2, groupSizeMax: 2,
    location: 'Sand Hill Road, Menlo Park',
    description: 'Fast-paced 10-minute one-on-one sessions pairing early-stage founders with active angel investors. Come ready with your elevator pitch and term sheet questions.',
    blasts: ['Early bird spots limited'],
  },
  {
    name: 'Developer Community Mixer', type: 'mixer', date: D2, startTime: '18:00',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 6,
    location: 'Mission District, San Francisco',
    description: 'Open-source contributors, DevRel professionals, and developer advocates meet to discuss community building, API design, and how to grow healthy developer ecosystems.',
    blasts: [],
  },
  {
    name: 'Startup Legal & Finance Night', type: 'normal', date: D2, startTime: '19:00',
    durationMins: 90, roundMins: 10, groupSizeMin: 2, groupSizeMax: 4,
    location: 'SoMa, San Francisco',
    description: 'Expert-led sessions on cap table management, SAFE notes, Delaware C-corps, and startup accounting. Q&A with attorneys and CPAs who specialize in early-stage companies.',
    blasts: ['🎤 Featured speaker joining'],
  },
  {
    name: 'AI Ethics Roundtable', type: 'normal', date: D2, startTime: '16:00',
    durationMins: 120, roundMins: 15, groupSizeMin: 2, groupSizeMax: 4,
    location: 'UC Berkeley Area',
    description: 'Researchers, policy advocates, and founders discuss the ethical dimensions of deploying AI systems — from algorithmic bias and data privacy to governance frameworks and responsible scaling.',
    blasts: [],
  },
  {
    name: 'Blockchain Builders Meetup', type: 'mixer', date: D2, startTime: '18:30',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'SoMa, San Francisco',
    description: 'Protocol developers, smart contract engineers, and blockchain product teams come together to share technical learnings, tooling recommendations, and ecosystem updates.',
    blasts: [],
  },
  {
    name: 'GTM Leaders Workshop', type: 'normal', date: D2, startTime: '14:00',
    durationMins: 180, roundMins: 15, groupSizeMin: 2, groupSizeMax: 4,
    location: 'University Ave, Palo Alto',
    description: 'Hands-on workshop for go-to-market leaders covering ICP definition, channel strategy, pricing, and scaling from first revenue to $10M ARR. Facilitated breakouts by company stage.',
    blasts: ['🎤 Featured speaker joining'],
  },
  {
    name: 'E-commerce & DTC Founders', type: 'mixer', date: D2, startTime: '19:00',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'Mission District, San Francisco',
    description: 'Direct-to-consumer founders and e-commerce operators exchange insights on customer acquisition, supply chain optimization, retention strategies, and platform algorithm changes.',
    blasts: [],
  },
  {
    name: 'Robotics & Hardware Night', type: 'normal', date: D2, startTime: '18:30',
    durationMins: 90, roundMins: 15, groupSizeMin: 2, groupSizeMax: 4,
    location: 'North San Jose',
    description: 'Hardware founders, robotics engineers, and manufacturing experts connect over the unique challenges of building physical products — from prototyping and supply chain to fundraising for hardware.',
    blasts: ['New venue — bigger space!'],
  },

  // ── DAY +3 ────────────────────────────────────────────────────────────────
  {
    name: 'Growth Marketing Summit', type: 'normal', date: D3, startTime: '10:00',
    durationMins: 180, roundMins: 15, groupSizeMin: 2, groupSizeMax: 4,
    location: 'SoMa, San Francisco',
    description: 'Full morning of sessions and workshops for growth marketers and demand gen leaders. Covers SEO, paid acquisition, content loops, influencer partnerships, and attribution modeling.',
    blasts: ['🎤 Featured speaker joining'],
  },
  {
    name: 'Biotech & Healthtech Meetup', type: 'mixer', date: D3, startTime: '18:00',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'South San Francisco',
    description: 'Biotech scientists, digital health founders, and life sciences investors gather to discuss clinical pipelines, FDA strategy, and the convergence of AI and healthcare.',
    blasts: [],
  },
  {
    name: 'Pre-Seed Founders Speed Meet', type: 'personal', date: D3, startTime: '19:00',
    durationMins: 60, roundMins: 10, groupSizeMin: 2, groupSizeMax: 2,
    location: 'SoMa, San Francisco',
    description: 'Rapid-fire one-on-ones pairing the earliest-stage founders with experienced operators and seed investors for brutally honest feedback on their ideas and initial traction.',
    blasts: ['Early bird spots limited'],
  },
  {
    name: 'Impact Investing Forum', type: 'normal', date: D3, startTime: '16:00',
    durationMins: 120, roundMins: 15, groupSizeMin: 2, groupSizeMax: 4,
    location: 'Financial District, San Francisco',
    description: 'LPs, fund managers, and impact-focused founders discuss ESG criteria, blended finance, and the metrics that matter for measuring social and environmental returns alongside financial performance.',
    blasts: [],
  },
  {
    name: 'ML Engineers Mixer', type: 'mixer', date: D3, startTime: '18:30',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'Mission District, San Francisco',
    description: 'A social hour for machine learning engineers, data scientists, and AI researchers to connect outside of work. Topics range from model architectures to MLOps tooling and career transitions.',
    blasts: [],
  },
  {
    name: 'No-Code & Low-Code Builders', type: 'normal', date: D3, startTime: '17:00',
    durationMins: 90, roundMins: 10, groupSizeMin: 2, groupSizeMax: 4,
    location: 'Hayes Valley, San Francisco',
    description: 'Founders and operators who build products using no-code and low-code platforms share workflows, integrations, and how they scaled without traditional engineering resources.',
    blasts: [],
  },

  // ── DAY +5 ────────────────────────────────────────────────────────────────
  {
    name: 'Community-Led Growth Summit', type: 'normal', date: D5, startTime: '10:00',
    durationMins: 180, roundMins: 15, groupSizeMin: 2, groupSizeMax: 4,
    location: 'SoMa, San Francisco',
    description: 'A half-day summit for community builders and CLG-focused founders. Sessions cover Discord strategy, ambassador programs, user-generated content loops, and turning community into pipeline.',
    blasts: ['🎤 Featured speaker joining'],
  },
  {
    name: 'NFT & Web3 Art Night', type: 'normal', date: D5, startTime: '18:00',
    durationMins: 120, roundMins: 10, groupSizeMin: 2, groupSizeMax: 4,
    location: 'Tenderloin Arts District, San Francisco',
    description: 'Artists, collectors, and Web3 curators come together for an evening celebrating digital art, NFT platforms, and the intersection of creative expression and blockchain technology.',
    blasts: [],
  },
  {
    name: 'Supply Chain Tech Meetup', type: 'normal', date: D5, startTime: '14:00',
    durationMins: 90, roundMins: 15, groupSizeMin: 2, groupSizeMax: 4,
    location: 'North San Jose',
    description: 'Founders and operators solving supply chain, logistics, and manufacturing challenges meet to share learnings on inventory optimization, last-mile delivery, and resilient sourcing.',
    blasts: [],
  },
  {
    name: 'Cybersecurity Professionals', type: 'mixer', date: D5, startTime: '18:30',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'Financial District, San Francisco',
    description: 'Security engineers, CISOs, and cybersecurity founders connect over drinks to discuss threat landscapes, zero-trust architecture, compliance automation, and the security startup ecosystem.',
    blasts: [],
  },
  {
    name: 'EdTech Founders Circle', type: 'personal', date: D5, startTime: '19:00',
    durationMins: 90, roundMins: 10, groupSizeMin: 2, groupSizeMax: 2,
    location: 'Mission District, San Francisco',
    description: 'Structured one-on-ones for education technology founders to share distribution strategies, curriculum partnerships, and fundraising insights from a notoriously challenging sector to raise in.',
    blasts: ['Sold out last time — register early'],
  },

  // ── DAY +7 ────────────────────────────────────────────────────────────────
  {
    name: 'Scale-Up Leaders Forum', type: 'personal', date: D7, startTime: '14:00',
    durationMins: 180, roundMins: 15, groupSizeMin: 2, groupSizeMax: 2,
    location: 'Financial District, San Francisco',
    description: 'Intimate one-on-ones reserved for founders and executives scaling companies from $5M to $50M ARR. Candid conversations on organizational design, executive hiring, and board management.',
    blasts: ['Sold out last time — register early'],
  },
  {
    name: 'Global Startup Mixer', type: 'mixer', date: D7, startTime: '18:00',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 6,
    location: 'Embarcadero, San Francisco',
    description: 'Celebrating the diversity of the Bay Area startup ecosystem with founders from around the world. A vibrant mixer connecting international founders with local investors, operators, and partners.',
    blasts: ['New venue — bigger space!'],
  },
  {
    name: 'VC & LP Networking Dinner', type: 'personal', date: D7, startTime: '19:30',
    durationMins: 120, roundMins: 10, groupSizeMin: 2, groupSizeMax: 2,
    location: 'Sand Hill Road, Menlo Park',
    description: 'An exclusive dinner bringing together venture capital partners and limited partners for relationship-building, fund performance discussions, and co-investment pipeline reviews.',
    blasts: ['Early bird spots limited'],
  },
  {
    name: 'Entrepreneurs Weekend Mixer', type: 'mixer', date: D7, startTime: '11:00',
    durationMins: 90, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'Hayes Valley, San Francisco',
    description: 'A relaxed weekend brunch-style mixer for founders who prefer connecting over coffee rather than cocktails. Great for early-stage builders looking for co-founders and advisors.',
    blasts: [],
  },
  {
    name: 'Generative AI Deep Dive', type: 'normal', date: D7, startTime: '15:00',
    durationMins: 120, roundMins: 15, groupSizeMin: 2, groupSizeMax: 4,
    location: 'Mission District, San Francisco',
    description: 'Technical and product deep-dives into generative AI applications. Sessions cover fine-tuning, RAG architectures, multimodal models, and real-world deployment patterns from production systems.',
    blasts: ['🎤 Featured speaker joining'],
  },
  {
    name: 'Real Estate Tech Founders', type: 'normal', date: D7, startTime: '18:00',
    durationMins: 90, roundMins: 10, groupSizeMin: 2, groupSizeMax: 4,
    location: 'Financial District, San Francisco',
    description: 'PropTech founders and real estate operators explore AI-powered valuations, digital mortgage platforms, short-term rental analytics, and the disruption of commercial real estate brokerage.',
    blasts: [],
  },

  // ── DAY +10 ───────────────────────────────────────────────────────────────
  {
    name: 'Future of Work Summit', type: 'normal', date: D10, startTime: '10:00',
    durationMins: 240, roundMins: 15, groupSizeMin: 2, groupSizeMax: 4,
    location: 'SoMa, San Francisco',
    description: 'A four-hour summit exploring remote work technology, AI-augmented workflows, the gig economy, and what the next decade of work looks like for knowledge workers and blue-collar professionals alike.',
    blasts: ['🎤 Featured speaker joining'],
  },
  {
    name: 'Diversity in Tech Founders', type: 'mixer', date: D10, startTime: '18:00',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'Mission District, San Francisco',
    description: 'A community mixer celebrating underrepresented founders across gender, ethnicity, and background. Focused on building genuine support networks, sharing investor contacts, and amplifying diverse voices in tech.',
    blasts: ['Sold out last time — register early'],
  },
  {
    name: 'AgriTech & FoodTech Night', type: 'normal', date: D10, startTime: '19:00',
    durationMins: 90, roundMins: 10, groupSizeMin: 2, groupSizeMax: 4,
    location: 'SoMa, San Francisco',
    description: 'Founders working on precision agriculture, alternative proteins, food supply optimization, and restaurant tech share progress and connect with investors focused on the future of food.',
    blasts: [],
  },
  {
    name: 'Sports Tech & Media', type: 'mixer', date: D10, startTime: '18:30',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 5,
    location: 'SOMA, San Francisco',
    description: 'Startups building in sports analytics, fan engagement, athlete performance, and sports media gather to explore partnerships and investment opportunities in one of the fastest-growing tech verticals.',
    blasts: [],
  },

  // ── DAY +14 ───────────────────────────────────────────────────────────────
  {
    name: 'YC Alumni Reunion Mixer', type: 'mixer', date: D14, startTime: '18:00',
    durationMins: 90, roundMins: 10, groupSizeMin: 3, groupSizeMax: 6,
    location: 'Embarcadero, San Francisco',
    description: 'A celebratory mixer for Y Combinator alumni across all cohorts. Reconnect with batch-mates, meet alumni from other seasons, and explore the deep network that YC has built over two decades.',
    blasts: ['Sold out last time — register early', '🎤 Featured speaker joining'],
  },
  {
    name: 'Seed to Series A Bootcamp', type: 'normal', date: D14, startTime: '09:00',
    durationMins: 480, roundMins: 15, groupSizeMin: 2, groupSizeMax: 4,
    location: 'SoMa, San Francisco',
    description: 'A full-day intensive bootcamp for founders navigating the transition from seed to Series A. Covers fundraising narrative, metrics benchmarks, investor targeting, and due diligence preparation.',
    blasts: ['🎤 Featured speaker joining'],
  },
  {
    name: 'Bay Area Tech Summit', type: 'mixer', date: D14, startTime: '17:00',
    durationMins: 120, roundMins: 10, groupSizeMin: 3, groupSizeMax: 6,
    location: 'Embarcadero, San Francisco',
    description: 'The flagship end-of-season tech networking summit bringing together founders, investors, operators, and press for two hours of curated conversations and high-energy community celebration.',
    blasts: ['🔥 200+ attendees expected', '⚡ AI-powered matching for all attendees', '📧 Pre-event introductions will be sent'],
  },
];

// ── Rich mock data pools ──────────────────────────────────────────────────────

const ROLES = [
  'Founder', 'Co-Founder', 'Investor', 'Angel Investor', 'VC Partner',
  'Engineer', 'Product Manager', 'Designer', 'Marketing', 'Growth',
  'Sales', 'Recruiter', 'Analyst', 'Advisor', 'Executive',
];

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Morgan', 'Taylor', 'Casey', 'Riley', 'Drew', 'Avery',
  'Quinn', 'Blake', 'Cameron', 'Skyler', 'Reese', 'Kendall', 'Peyton',
  'Logan', 'Hayden', 'Dakota', 'Finley', 'Rowan', 'River', 'Sage',
  'Phoenix', 'Elliot', 'Shawn', 'Jamie', 'Emery', 'Corey', 'Tatum', 'Oakley',
];

const LAST_NAMES = [
  'Chen', 'Patel', 'Williams', 'Rodriguez', 'Kim', 'Johnson', 'Lee', 'Garcia',
  'Smith', 'Brown', 'Davis', 'Wilson', 'Martinez', 'Anderson', 'Taylor',
  'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Young',
  'Hall', 'Allen', 'Scott', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts',
];

const COMPANIES = [
  'Nexus AI', 'DataFlow', 'Buildwise', 'Launchpad', 'HorizonX', 'Stackly',
  'Meridian Labs', 'Cloudbit', 'Openform', 'Vecta Systems', 'Parity', 'Archon',
  'Luminary', 'Cresta', 'Forge AI', 'Altitude', 'Portals', 'Inkwell',
  'Capsule', 'Synth', 'Overture', 'Trident', 'Beacon', 'Axiom Labs',
];

const STAGES = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Growth', 'Independent'];

const PURPOSES = [
  'Fundraising', 'Hiring', 'Finding Co-founder', 'Partnerships',
  'Learning', 'Customer Discovery', 'General Networking',
];

const INTENTS = [
  'Looking to meet early-stage investors who understand deep tech.',
  'Seeking a technical co-founder with an ML or systems background.',
  'Want to find partnerships for distribution in the APAC region.',
  'Here to explore hiring opportunities in product and design.',
  'Trying to close a $2M pre-seed round by end of quarter.',
  'Looking for advisors with SaaS go-to-market experience.',
  'Interested in connecting with other founders building in AI.',
  'Want to understand what VCs are focused on funding right now.',
  'Looking for potential enterprise customers in the fintech space.',
  'Hoping to meet designers, creative leads, and brand builders.',
  'Building in climate tech and need introductions to impact investors.',
  'Exploring acqui-hire opportunities and talent from late-stage startups.',
  'Need connections into the enterprise sales channel in the US market.',
  'Looking for a CTO to join my founding team — open to equity discussions.',
  'Hoping to find other B2B SaaS founders to share learnings on growth.',
];

const SUMMARIES = [
  'Serial entrepreneur with two successful exits. Currently building my third company focused on AI infrastructure for enterprise.',
  'Full-stack engineer turned product lead. Passionate about developer tooling and making complex systems simple.',
  'Investor focused on early-stage B2B SaaS and developer tools. Backed 35+ companies over 8 years.',
  'Growth hacker who scaled three SaaS products from 0 to 10M ARR. Expert in PLG and viral loops.',
  'UX designer with a background in cognitive psychology. Building human-centered products for complex workflows.',
  'Ex-Google engineer now building ML-powered analytics platform. Looking for enterprise design partners.',
  'Marketing leader specialized in B2B demand generation and brand building at scale.',
  'Product manager obsessed with metrics-driven development. Former PM at Stripe and Notion.',
  'Climate tech founder raising Series A for carbon monitoring platform. Former BCG consultant.',
  'Deep tech founder working on quantum computing applications for drug discovery.',
  'Sales leader with track record of building 0-to-1 sales motions at three successful startups.',
  'VC analyst covering early-stage startups in AI/ML, fintech, and climate. Looking to make first investments.',
  'Co-founder of a Y Combinator W23 company building AI-powered legal tech. Looking for enterprise customers.',
  'CTO with 15 years of experience scaling engineering teams from 5 to 200 people.',
  'Angel investor and startup advisor. Previously built and sold two companies in adtech.',
];

const HEADLINES = [
  'Founder & CEO at Nexus AI | Ex-OpenAI | Building the future of AI infrastructure',
  'Product Leader | Former Stripe, Notion | Scaling B2B SaaS',
  'Early-stage Investor | 35+ Investments | Partner at HorizonX Ventures',
  'Growth Engineer | Scaled to 10M ARR | PLG Expert',
  'UX Design Lead | Cognitive Psychology Background | Design Systems at Scale',
  'Full-Stack ML Engineer | Ex-Google | Building DataFlow Analytics',
  'Head of Marketing | B2B SaaS | Demand Gen & Brand',
  'VP Product | Metrics-Driven | Former Stripe & Notion PM',
  'Climate Tech Founder | Carbon Monitoring | BCG Alumni',
  'Deep Tech Founder | Quantum Computing | Drug Discovery Applications',
  'VP Sales | B2B SaaS | 0-to-1 Expert | 3x Startup Exits',
  'VC Analyst | AI/ML & Fintech | Early-Stage Focus',
  'YC W23 Founder | AI Legal Tech | Looking for Enterprise Design Partners',
  'CTO | Engineering Leadership | Built Teams from 5 to 200',
  'Angel Investor | Startup Advisor | 2x Founder with Exits',
];

const WORK_EXPERIENCES = [
  [
    { company: 'Nexus AI', role: 'Founder & CEO', years: '2022-Present', description: 'Building AI infrastructure platform for enterprise teams.' },
    { company: 'OpenAI', role: 'Senior Research Engineer', years: '2020-2022', description: 'Worked on GPT-3 fine-tuning and enterprise deployment.' },
    { company: 'Google', role: 'Software Engineer', years: '2017-2020', description: 'Built distributed ML training infrastructure.' },
  ],
  [
    { company: 'Buildwise', role: 'Head of Product', years: '2021-Present', description: 'Leading product for developer tooling platform with 50K users.' },
    { company: 'Stripe', role: 'Product Manager', years: '2018-2021', description: 'Led payments API developer experience team.' },
    { company: 'Notion', role: 'Associate PM', years: '2016-2018', description: 'Launched collaboration features used by millions.' },
  ],
  [
    { company: 'HorizonX Ventures', role: 'Partner', years: '2016-Present', description: 'Early-stage B2B SaaS and developer tools fund. $150M AUM.' },
    { company: 'Sequoia Capital', role: 'Associate', years: '2013-2016', description: 'Sourced and evaluated early-stage opportunities.' },
  ],
  [
    { company: 'DataFlow', role: 'Head of Growth', years: '2022-Present', description: 'Scaled from 0 to 10M ARR through PLG and viral referral loops.' },
    { company: 'HubSpot', role: 'Growth Lead', years: '2019-2022', description: 'Led product-led growth experiments increasing MRR by 40%.' },
  ],
  [
    { company: 'Portals Design', role: 'Design Lead', years: '2021-Present', description: 'Building design system and UX for enterprise workflow tools.' },
    { company: 'Figma', role: 'Senior Product Designer', years: '2018-2021', description: 'Designed core collaboration and commenting features.' },
  ],
];

const CERTIFICATIONS_POOL = [
  ['AWS Certified Solutions Architect', 'Google Cloud Professional Data Engineer', 'Kubernetes Administrator (CKA)'],
  ['Y Combinator Alumni', 'Stanford GSB Executive Education', 'Product Management Certification — PMI'],
  ['CFA Level II', 'Series 65 Investment Adviser', 'GARP Financial Risk Manager'],
  ['Google Analytics Certified', 'HubSpot Inbound Marketing', 'Facebook Blueprint Certified'],
  ['Human-Computer Interaction — Stanford Online', 'UX Design Professional Certificate — Google', 'Interaction Design Foundation'],
  ['Machine Learning Specialization — Coursera', 'Deep Learning Nanodegree — Udacity', 'MLOps Professional Certificate'],
  ['Salesforce Certified Sales Cloud Consultant', 'SPIN Selling Certified', 'Challenger Sales Method'],
  ['PMP Certification', 'Agile Scrum Master', 'Product-Led Growth Certificate — Wes Bush'],
  ['LEED Green Associate', 'Climate Reality Leadership Corps', 'Impact Investing Certificate'],
  ['Certified Blockchain Professional', 'Ethereum Developer', 'Zero-Knowledge Proof Architecture'],
];

const PROJECTS_POOL = [
  [
    { name: 'LLM Fine-tuning Platform', description: 'Open-source tool for fine-tuning LLMs on proprietary data with 2K GitHub stars.', url: 'https://github.com' },
    { name: 'AI Cost Optimizer', description: 'Tool that reduces LLM API costs by 60% through intelligent caching and batching.', url: '' },
  ],
  [
    { name: 'Dev Docs AI', description: 'AI assistant that answers questions about your codebase. Used by 500+ developers.', url: '' },
    { name: 'API Changelog Monitor', description: 'Automated monitoring for breaking API changes with instant Slack alerts.', url: '' },
  ],
  [
    { name: 'Startup Valuation Model', description: 'Excel model used by 200+ investors for early-stage startup valuation.', url: '' },
    { name: 'VC Deal Flow Dashboard', description: 'Notion template for managing 1000+ deal flow opportunities with automation.', url: '' },
  ],
  [
    { name: 'PLG Playbook', description: 'Comprehensive guide to product-led growth with 50+ tactics and case studies.', url: '' },
    { name: 'Viral Loop Calculator', description: 'Tool to model and optimize viral coefficient for SaaS products.', url: '' },
  ],
  [
    { name: 'Design System Library', description: 'Open-source component library with 100+ components used by 300+ teams.', url: 'https://github.com' },
    { name: 'UX Research Framework', description: 'Template for conducting user interviews and synthesizing insights at scale.', url: '' },
  ],
];

const PAST_EVENTS_POOL = [
  [
    { eventName: 'YC Startup School Mixer', eventDate: daysAgo(45), eventType: 'mixer', peopleMet: 8, connectionsMade: 3, highlights: 'Met two potential co-investors. Had a great conversation with a YC W22 founder about GTM strategy.', rating: 5 },
    { eventName: 'SaaStr Annual Networking Night', eventDate: daysAgo(90), eventType: 'mixer', peopleMet: 12, connectionsMade: 5, highlights: 'Closed a partnership deal with a SaaS company met at this event. Excellent ROI.', rating: 5 },
    { eventName: 'AI Founders Dinner', eventDate: daysAgo(20), eventType: 'normal', peopleMet: 5, connectionsMade: 2, highlights: 'Deep dive conversations about LLM architecture. Met the CTO of Anthropic briefly.', rating: 4 },
  ],
  [
    { eventName: 'Product Hunt Makers Festival', eventDate: daysAgo(60), eventType: 'mixer', peopleMet: 15, connectionsMade: 6, highlights: 'Launched a product at the event. Got 200 signups and 3 investor intros.', rating: 5 },
    { eventName: 'First Round Fast Forward', eventDate: daysAgo(30), eventType: 'personal', peopleMet: 6, connectionsMade: 4, highlights: '1-on-1 sessions with incredible founders. Got tactical advice on scaling from $1M to $10M ARR.', rating: 5 },
  ],
  [
    { eventName: 'Sequoia Arc Cohort Mixer', eventDate: daysAgo(120), eventType: 'mixer', peopleMet: 20, connectionsMade: 8, highlights: 'Met 3 portfolio companies that became customers. Strong deal flow from this event.', rating: 5 },
    { eventName: 'Founder Summit NYC', eventDate: daysAgo(75), eventType: 'normal', peopleMet: 10, connectionsMade: 4, highlights: 'Panel discussion on enterprise sales. Found 2 strong lead investors for Series A.', rating: 4 },
    { eventName: 'Climate Tech Demo Day', eventDate: daysAgo(15), eventType: 'normal', peopleMet: 7, connectionsMade: 3, highlights: 'Excellent presentations. Met a potential strategic partner for carbon credit marketplace.', rating: 4 },
  ],
  [
    { eventName: 'Growth Hackers Conference', eventDate: daysAgo(55), eventType: 'normal', peopleMet: 25, connectionsMade: 7, highlights: 'Gave a talk on viral loops. Got 50 followers and 5 consulting inquiries.', rating: 5 },
    { eventName: 'B2B SaaS Founders Meetup', eventDate: daysAgo(25), eventType: 'mixer', peopleMet: 9, connectionsMade: 3, highlights: 'Shared learnings on PLG vs sales-led growth. Very engaged audience.', rating: 4 },
  ],
  [
    { eventName: 'Design Matters SF', eventDate: daysAgo(40), eventType: 'mixer', peopleMet: 11, connectionsMade: 5, highlights: 'Met incredible designers from Google, Figma, and Notion. Got 2 contract opportunities.', rating: 5 },
    { eventName: 'UX Research Summit', eventDate: daysAgo(100), eventType: 'normal', peopleMet: 8, connectionsMade: 3, highlights: 'Presented design system. Got featured in a case study article.', rating: 4 },
  ],
];

const LINKEDIN_BASE = 'https://linkedin.com/in/';

const SKILL_POOL = [
  'sk_python', 'sk_js', 'sk_ts', 'sk_react', 'sk_node', 'sk_cloud', 'sk_ml', 'sk_nlp',
  'sk_fundraise', 'sk_gtm', 'sk_salesb2b', 'sk_uxdesign', 'sk_prodstrat', 'sk_growth',
  'sk_finance', 'sk_recruit', 'sk_dataanlyt', 'sk_bizdev',
];

const SKILL_NAMES = {
  sk_python: 'Python', sk_js: 'JavaScript', sk_ts: 'TypeScript', sk_react: 'React / Frontend',
  sk_node: 'Node.js / Backend', sk_cloud: 'Cloud / AWS / GCP', sk_ml: 'Machine Learning',
  sk_nlp: 'NLP / LLMs', sk_fundraise: 'Fundraising', sk_gtm: 'Go-to-market',
  sk_salesb2b: 'Sales B2B', sk_uxdesign: 'UX / UI Design', sk_prodstrat: 'Product Strategy',
  sk_growth: 'Growth Hacking', sk_finance: 'Finance / CFO', sk_recruit: 'Recruiting',
  sk_dataanlyt: 'Data Analysis', sk_bizdev: 'Business Development',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick(arr, i, n = 1) {
  const out = [];
  for (let k = 0; k < n; k++) out.push(arr[(i + k) % arr.length]);
  return n === 1 ? out[0] : out;
}

function pickName(idx) {
  const first = FIRST_NAMES[idx % FIRST_NAMES.length];
  const last = LAST_NAMES[(idx * 7 + 3) % LAST_NAMES.length];
  return `${first} ${last}`;
}

function pickEmail(name, idx) {
  const clean = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
  return `${clean}.${idx}@techfounder.dev`;
}

// ── Seeding ───────────────────────────────────────────────────────────────────

function ensureSkills() {
  const database = dal.getDb();
  const ins = database.prepare(
    'INSERT INTO skills (id, name, category) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING'
  );
  database.transaction(() => {
    for (const [id, name] of Object.entries(SKILL_NAMES)) {
      ins.run(id, name, 'general');
    }
  })();
  console.log(`✓ ${Object.keys(SKILL_NAMES).length} skills ensured`);
}

/** One transaction per event’s guest list — much faster than committing per row. */
function seedAttendees(eventId, count, globalOffset = 0) {
  const database = dal.getDb();
  database.transaction(() => {
    for (let i = 0; i < count; i++) {
      const idx = globalOffset + i;
      const personId = uuidv4();
      const goalId = uuidv4();
      const name = pickName(idx);
      const email = pickEmail(name, idx);

      const roles = pick(ROLES, idx, 2);
      const seeksRoles = pick(ROLES, idx + 5, 2);
      const purpose = pick(PURPOSES, idx);
      const companyStage = pick(STAGES, idx);
      const companyName = pick(COMPANIES, idx);
      const have = pick(SKILL_POOL, idx, 3);
      const seek = pick(SKILL_POOL, idx + 9, 2);
      const eventIntent = pick(INTENTS, idx);
      const summary = SUMMARIES[idx % SUMMARIES.length];
      const headline = HEADLINES[idx % HEADLINES.length];
      const linkedinUrl = `${LINKEDIN_BASE}${name.toLowerCase().replace(/\s+/g, '-')}-${idx}`;
      const workExperience = WORK_EXPERIENCES[idx % WORK_EXPERIENCES.length];
      const certifications = CERTIFICATIONS_POOL[idx % CERTIFICATIONS_POOL.length];
      const projects = PROJECTS_POOL[idx % PROJECTS_POOL.length];

      dal.createOrMergePerson(personId, {
        name, roles, companyName, companyStage, purpose, seeksRoles,
        openToRematch: true, eventIntent, email, summary, headline,
        linkedinUrl, workExperience, certifications, projects,
      });

      for (const skillId of have) dal.addPersonHasSkill(personId, skillId, 'mid');
      for (const skillId of seek) dal.addPersonSeeksSkill(personId, skillId, 'medium');

      dal.createGoal(goalId, personId, eventId, purpose);
      dal.checkIn(personId, eventId);

      dal.saveProfile(personId, {
        email, headline, description: summary, linkedinUrl,
        previousCompanies: workExperience.map(w => w.company),
        certifications, projects, workExperience, summary,
      });

      const pastEvents = PAST_EVENTS_POOL[idx % PAST_EVENTS_POOL.length];
      for (const ev of pastEvents) {
        dal.addPastEventHistory(personId, ev);
      }

      dal.createUser(uuidv4(), email, name, personId);
    }
  })();
  process.stdout.write('.');
  process.stdout.write(` ${count} guests\n`);
}

async function seedSaurabhKhire() {
  const personId = uuidv4();
  const email = 'saurabhskhire@gmail.com';
  const name = 'Saurabh Khire';

  await dal.createOrMergePerson(personId, {
    name,
    roles: ['Founder', 'Engineer'],
    companyName: 'SmartNetworking',
    companyStage: 'Seed',
    purpose: 'Building AI-powered networking tools',
    seeksRoles: ['Investor', 'Advisor'],
    openToRematch: true,
    eventIntent: 'Looking to connect with investors and advisors who can help scale SmartNetworking.',
    email,
    summary: 'Founder and engineer building AI-powered networking tools for professionals. Passionate about combining technology with meaningful human connections. Previously worked in enterprise software and AI research.',
    headline: 'Founder at SmartNetworking | AI + Networking | Building tools that make connections matter',
    linkedinUrl: 'https://linkedin.com/in/saurabhkhire',
    workExperience: [
      { company: 'SmartNetworking', role: 'Founder & CEO', years: '2024-Present', description: 'Building AI-powered professional networking platform for events.' },
      { company: 'HackWithBay', role: 'Participant & Winner', years: '2024', description: 'Won first place with VentureGraph — AI matching for professional events.' },
      { company: 'Tech Startup', role: 'Senior Software Engineer', years: '2020-2024', description: 'Built enterprise SaaS products serving 500+ enterprise customers.' },
    ],
    certifications: ['AWS Solutions Architect', 'Full Stack Developer Certification', 'AI Product Management'],
    projects: [
      { name: 'SmartNetworking', description: 'AI-powered event networking platform with intelligent matching and icebreaker generation.', url: '' },
      { name: 'VentureGraph', description: 'Graph-based startup connection platform built for HackWithBay 2.0 hackathon.', url: '' },
    ],
  });

  for (const skillId of ['sk_python', 'sk_js', 'sk_react', 'sk_node', 'sk_ml', 'sk_prodstrat']) {
    await dal.addPersonHasSkill(personId, skillId, 'senior');
  }
  for (const skillId of ['sk_fundraise', 'sk_gtm', 'sk_bizdev']) {
    await dal.addPersonSeeksSkill(personId, skillId, 'high');
  }

  await dal.saveProfile(personId, {
    email,
    headline: 'Founder at SmartNetworking | AI + Networking',
    description: 'Building AI-powered networking tools for professionals.',
    linkedinUrl: 'https://linkedin.com/in/saurabhkhire',
    previousCompanies: ['SmartNetworking', 'HackWithBay', 'Tech Startup'],
    certifications: ['AWS Solutions Architect', 'Full Stack Developer Certification', 'AI Product Management'],
    projects: [
      { name: 'SmartNetworking', description: 'AI-powered event networking platform.', url: '' },
      { name: 'VentureGraph', description: 'Graph-based startup connection platform.', url: '' },
    ],
    workExperience: [
      { company: 'SmartNetworking', role: 'Founder & CEO', years: '2024-Present', description: 'Building AI-powered professional networking platform.' },
    ],
    summary: 'Founder building AI-powered networking tools.',
  });

  // Past events for Saurabh
  await dal.addPastEventHistory(personId, { eventName: 'HackWithBay 2.0', eventDate: daysAgo(30), eventType: 'normal', peopleMet: 15, connectionsMade: 8, highlights: 'Won first place with VentureGraph. Met incredible founders and investors.', rating: 5 });
  await dal.addPastEventHistory(personId, { eventName: 'Bay Area Startup Mixer', eventDate: daysAgo(60), eventType: 'mixer', peopleMet: 12, connectionsMade: 5, highlights: 'Great conversations with early-stage investors. Got 3 investor intro meetings.', rating: 5 });
  await dal.addPastEventHistory(personId, { eventName: 'YC Alumni Meetup', eventDate: daysAgo(90), eventType: 'mixer', peopleMet: 10, connectionsMade: 4, highlights: 'Learned a lot about scaling from YC alumni. Found 2 potential advisors.', rating: 4 });

  // Create user record
  await dal.createUser(uuidv4(), email, name, personId);

  console.log(`\n✓ Added Saurabh Khire (${email})`);
  return personId;
}

async function main() {
  console.log('SQLite mock seed starting…\n');
  ensureSkills();
  const saurabhId = await seedSaurabhKhire();

  console.log(`\nSeeding ${EVENTS.length} events…`);

  let fullRoomOffset = 0;

  for (let ei = 0; ei < EVENTS.length; ei++) {
    const cfg = EVENTS[ei];
    const saurabhHosts = SAURABH_HOST_EVENTS.has(cfg.name);
    const blasts = cfg.blasts && cfg.blasts.length ? cfg.blasts : DEFAULT_BLASTS;
    const { id: eventId } = await dal.createEvent({
      ...cfg,
      blasts,
      location: cfg.location || 'Bay Area (see event description)',
      description: cfg.description || `${cfg.name} — curated VentureGraph networking session.`,
      hostId: saurabhHosts ? saurabhId : null,
    });
    if (saurabhHosts) {
      dal.checkIn(saurabhId, eventId);
    }

    const isFullRoom = saurabhHosts;
    const tag = isFullRoom
      ? ` <- Saurabh host + ${ATTENDEES_COUNT} checked in`
      : ` <- ${OTHER_EVENT_ATTENDEES} checked in`;
    console.log(`  [${cfg.type.padEnd(8)}] ${cfg.name} (${cfg.date} ${cfg.startTime})${tag}`);

    if (isFullRoom) {
      process.stdout.write('  ');
      seedAttendees(eventId, ATTENDEES_COUNT, fullRoomOffset);
      fullRoomOffset += ATTENDEES_COUNT;
    } else {
      const fillerOffset = 20_000 + ei * 137 + (cfg.name.length % 41);
      process.stdout.write('  ');
      seedAttendees(eventId, OTHER_EVENT_ATTENDEES, fillerOffset);
    }
  }

  const evCount = (await dal.listEvents()).length;
  console.log(`\n✓ ${evCount} events  |  2 host events × ${ATTENDEES_COUNT} guests  |  others × ${OTHER_EVENT_ATTENDEES}`);
  console.log(`  Saurabh hosts: ${[...SAURABH_HOST_EVENTS].join(' · ')}`);
  console.log('  Login with any attendee email from those events to explore the app.');
}

main().catch(err => { console.error(err); process.exit(1); });
