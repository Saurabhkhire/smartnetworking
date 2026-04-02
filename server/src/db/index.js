/**
 * DAL hub — picks Neo4j or SQLite based on DB_DRIVER env var.
 * DB_DRIVER=neo4j (default) | sqlite
 */

const driver = (process.env.DB_DRIVER || 'neo4j').toLowerCase();

let dal;
if (driver === 'sqlite') {
  dal = require('./sqlite-dal');
} else {
  dal = require('./neo4j-dal');
}

module.exports = dal;
