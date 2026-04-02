/**
 * Sanity-check AI wiring: RocketRide pipeline (if configured) then OpenAI fallback.
 * Run: npm run check-ai (in server/)
 */
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

const { callAI } = require('../src/ai/adapter');

(async () => {
  try {
    const out = await callAI(
      'You are a test harness.',
      'Reply with exactly the word OK and nothing else.',
      20
    );
    console.log('Result:', out);
    if (!out || !String(out).toLowerCase().includes('ok')) {
      console.warn('Unexpected output (still counts as connectivity if non-empty).');
    }
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
})();
