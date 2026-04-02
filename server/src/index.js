const path = require('path');
// Repo root .env first, then server/.env (latter overrides for duplicate keys)
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

const eventsRouter = require('./routes/events');
const matchingRouter = require('./routes/matching');
const aiRouter = require('./routes/ai');
const connectionsRouter = require('./routes/connections');
const profilesRouter = require('./routes/profiles');
const personalizationRouter = require('./routes/personalization');
const emailRouter = require('./routes/email');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/events', matchingRouter);
app.use('/api/ai', aiRouter);
app.use('/api/connections', connectionsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/personalization', personalizationRouter);
app.use('/api/email', emailRouter);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// WebSocket for real-time check-in broadcasts
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'connected' }));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

// Expose broadcast so routes can use it
app.locals.broadcast = broadcast;

function shutdown(signal) {
  return () => {
    console.log(`\n${signal} — shutting down…`);
    // Close Neo4j driver if available
    const driver = process.env.DB_DRIVER || 'neo4j';
    if (driver === 'neo4j') {
      try { require('./db/neo4j').closeDriver().catch(() => {}); } catch {}
    }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 4000).unref();
  };
}

// Start
async function start() {
  const driver = (process.env.DB_DRIVER || 'neo4j').toLowerCase();

  try {
    if (driver === 'neo4j') {
      const { verifyConnection } = require('./db/neo4j');
      await verifyConnection();
    } else {
      // SQLite — initialise DB on first access
      require('./db').listEvents();
      console.log('✓ SQLite ready');
    }

    server.listen(PORT, () => {
      console.log(`✓ VentureGraph server running on http://localhost:${PORT} [DB: ${driver}]`);
      console.log(`✓ WebSocket available on ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));

start();
