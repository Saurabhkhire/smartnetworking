/**
 * Deletes every node and relationship (constraints/indexes remain).
 * Run from server/:  npm run db:clear
 */
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

const { runQuery, verifyConnection, closeDriver } = require('../src/db/neo4j');

async function main() {
  await verifyConnection();
  await runQuery('MATCH (n) DETACH DELETE n');
  console.log('✓ All graph data removed.');
  await closeDriver();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
