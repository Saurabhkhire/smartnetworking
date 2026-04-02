/**
 * Run once to seed all 60 skill nodes in Neo4j.
 * Usage (from server/): node src/db/seed.js
 */
const path = require('path');
// server/src/db → repo root is ../../../
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), override: true });
const { runQuery, verifyConnection, closeDriver } = require('./neo4j');

const SKILLS = [
  {id:'sk_python',name:'Python',cat:'Engineering'},
  {id:'sk_js',name:'JavaScript',cat:'Engineering'},
  {id:'sk_ts',name:'TypeScript',cat:'Engineering'},
  {id:'sk_go',name:'Go / Golang',cat:'Engineering'},
  {id:'sk_rust',name:'Rust',cat:'Engineering'},
  {id:'sk_java',name:'Java',cat:'Engineering'},
  {id:'sk_cpp',name:'C / C++',cat:'Engineering'},
  {id:'sk_react',name:'React / Frontend',cat:'Engineering'},
  {id:'sk_node',name:'Node.js / Backend',cat:'Engineering'},
  {id:'sk_cloud',name:'Cloud / AWS / GCP',cat:'Engineering'},
  {id:'sk_devops',name:'DevOps / CI-CD',cat:'Engineering'},
  {id:'sk_ml',name:'Machine Learning',cat:'Engineering'},
  {id:'sk_datascience',name:'Data Science',cat:'Engineering'},
  {id:'sk_cv',name:'Computer Vision',cat:'Engineering'},
  {id:'sk_nlp',name:'NLP / LLMs',cat:'Engineering'},
  {id:'sk_blockchain',name:'Blockchain / Web3',cat:'Engineering'},
  {id:'sk_mobile_ios',name:'Mobile iOS',cat:'Engineering'},
  {id:'sk_mobile_and',name:'Mobile Android',cat:'Engineering'},
  {id:'sk_db',name:'Database / SQL',cat:'Engineering'},
  {id:'sk_sysdesign',name:'System Design',cat:'Engineering'},
  {id:'sk_prodstrat',name:'Product Strategy',cat:'Product'},
  {id:'sk_prodanlyt',name:'Product Analytics',cat:'Product'},
  {id:'sk_roadmap',name:'Roadmap Planning',cat:'Product'},
  {id:'sk_uxresearch',name:'UX Research',cat:'Design'},
  {id:'sk_uxdesign',name:'UX / UI Design',cat:'Design'},
  {id:'sk_prototyping',name:'Prototyping',cat:'Design'},
  {id:'sk_dataanlyt',name:'Data Analysis',cat:'Analytics'},
  {id:'sk_bizintel',name:'Business Intelligence',cat:'Analytics'},
  {id:'sk_growth',name:'Growth Hacking',cat:'Product'},
  {id:'sk_ab_test',name:'A/B Testing',cat:'Analytics'},
  {id:'sk_fundraise',name:'Fundraising',cat:'Business'},
  {id:'sk_gtm',name:'Go-to-market',cat:'Business'},
  {id:'sk_salesb2b',name:'Sales B2B',cat:'Business'},
  {id:'sk_salesb2c',name:'Sales B2C',cat:'Business'},
  {id:'sk_entsales',name:'Enterprise Sales',cat:'Business'},
  {id:'sk_mktgstrat',name:'Marketing Strategy',cat:'Business'},
  {id:'sk_content',name:'Content Marketing',cat:'Business'},
  {id:'sk_perfmktg',name:'Performance Marketing',cat:'Business'},
  {id:'sk_brand',name:'Brand Building',cat:'Business'},
  {id:'sk_pr',name:'PR / Communications',cat:'Business'},
  {id:'sk_bizdev',name:'Business Development',cat:'Business'},
  {id:'sk_partnerships',name:'Partnerships',cat:'Business'},
  {id:'sk_custsucc',name:'Customer Success',cat:'Business'},
  {id:'sk_finance',name:'Finance / CFO',cat:'Business'},
  {id:'sk_ops',name:'Operations',cat:'Business'},
  {id:'sk_hr',name:'HR / People Ops',cat:'People'},
  {id:'sk_recruit',name:'Recruiting',cat:'People'},
  {id:'sk_exechire',name:'Executive Hiring',cat:'People'},
  {id:'sk_legal',name:'Legal / Compliance',cat:'People'},
  {id:'sk_fintech',name:'Fintech',cat:'Domain'},
  {id:'sk_healthtech',name:'HealthTech',cat:'Domain'},
  {id:'sk_edtech',name:'EdTech',cat:'Domain'},
  {id:'sk_cleantech',name:'CleanTech',cat:'Domain'},
  {id:'sk_saas',name:'SaaS B2B',cat:'Domain'},
  {id:'sk_ecomm',name:'E-commerce',cat:'Domain'},
  {id:'sk_deeptech',name:'DeepTech',cat:'Domain'},
  {id:'sk_biotech',name:'Biotech',cat:'Domain'},
  {id:'sk_proptech',name:'PropTech',cat:'Domain'},
  {id:'sk_govtech',name:'GovTech',cat:'Domain'},
  {id:'sk_gaming',name:'Gaming',cat:'Domain'},
];

const CONSTRAINTS = [
  'CREATE CONSTRAINT person_id   IF NOT EXISTS FOR (p:Person)         REQUIRE p.id IS UNIQUE',
  'CREATE CONSTRAINT skill_id    IF NOT EXISTS FOR (s:Skill)          REQUIRE s.id IS UNIQUE',
  'CREATE CONSTRAINT event_id    IF NOT EXISTS FOR (e:Event)          REQUIRE e.id IS UNIQUE',
  'CREATE CONSTRAINT company_id  IF NOT EXISTS FOR (c:Company)        REQUIRE c.id IS UNIQUE',
  'CREATE CONSTRAINT group_id    IF NOT EXISTS FOR (g:Group)          REQUIRE g.id IS UNIQUE',
  'CREATE CONSTRAINT insight_id  IF NOT EXISTS FOR (i:PersonaInsight) REQUIRE i.id IS UNIQUE',
];

const INDEXES = [
  'CREATE INDEX person_company  IF NOT EXISTS FOR (p:Person) ON (p.companyName)',
  'CREATE INDEX person_purpose  IF NOT EXISTS FOR (p:Person) ON (p.purpose)',
  'CREATE INDEX skill_category  IF NOT EXISTS FOR (s:Skill)  ON (s.category)',
  'CREATE INDEX event_type      IF NOT EXISTS FOR (e:Event)  ON (e.type, e.date)',
];

async function seed() {
  await verifyConnection();

  console.log('Creating constraints...');
  for (const c of CONSTRAINTS) {
    await runQuery(c);
    process.stdout.write('.');
  }
  console.log(' done');

  console.log('Creating indexes...');
  for (const idx of INDEXES) {
    await runQuery(idx);
    process.stdout.write('.');
  }
  console.log(' done');

  console.log('Seeding 60 skill nodes...');
  await runQuery(
    `UNWIND $skills AS s
     MERGE (sk:Skill {id: s.id})
     SET sk.name = s.name, sk.category = s.cat`,
    { skills: SKILLS }
  );

  const count = await runQuery('MATCH (s:Skill) RETURN count(s) AS n');
  console.log(`✓ Skill nodes in DB: ${count[0].get('n')}`);

  await closeDriver();
  console.log('Seed complete.');
}

seed().catch(err => { console.error(err); process.exit(1); });
