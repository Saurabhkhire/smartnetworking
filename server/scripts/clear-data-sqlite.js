/**
 * Clear all SQLite data (events, persons, skills, etc.)
 * Run: npm run db:clear:sqlite
 */
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

process.env.DB_DRIVER = 'sqlite';
const { getDb } = require('../src/db/sqlite-dal');

const TABLES = [
  'group_members', 'groups_tbl', 'connections', 'blocks', 'wants_to_meet',
  'goals', 'attendances', 'person_skills', 'skills', 'persons', 'events',
  'persona_insights', 'profiles', 'event_registrations', 'past_event_history', 'users',
];

try {
  const db = getDb();
  for (const table of TABLES) {
    db.prepare(`DELETE FROM ${table}`).run();
    console.log(`✓ Cleared ${table}`);
  }
  console.log('\n✓ All SQLite data cleared.');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
