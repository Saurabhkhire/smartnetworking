const neo4j = require('neo4j-driver');

let driver;

function isNeo4jConfigured() {
  const { NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD } = process.env;
  return (
    typeof NEO4J_URI === 'string' &&
    NEO4J_URI.length > 0 &&
    typeof NEO4J_USER === 'string' &&
    NEO4J_USER.length > 0 &&
    typeof NEO4J_PASSWORD === 'string' &&
    NEO4J_PASSWORD.length > 0
  );
}

function getDriver() {
  if (!isNeo4jConfigured()) {
    throw new Error(
      'Neo4j is required — set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD in .env (root or server/).'
    );
  }
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
      { disableLosslessIntegers: true }
    );
  }
  return driver;
}

async function runQuery(cypher, params = {}) {
  const session = getDriver().session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    await session.close();
  }
}

/** One write transaction, multiple runs — faster for bulk seeds than runQuery per row. */
async function runWrite(workFn) {
  const session = getDriver().session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
  try {
    return await session.executeWrite(workFn);
  } finally {
    await session.close();
  }
}

async function verifyConnection() {
  if (!isNeo4jConfigured()) {
    const msg =
      'Neo4j is required — set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD in .env before starting the server.';
    console.error('✗', msg);
    throw new Error(msg);
  }
  try {
    await runQuery('RETURN 1 AS test');
    console.log('✓ Neo4j connected');
  } catch (err) {
    console.error('✗ Neo4j connection failed:', err.message);
    throw err;
  }
}

async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

module.exports = { getDriver, runQuery, runWrite, verifyConnection, closeDriver, isNeo4jConfigured };
