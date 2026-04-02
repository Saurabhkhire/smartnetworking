/**
 * AI adapter — RocketRide chat pipeline first (see /pipelines), OpenAI REST as fallback.
 */

const path = require('path');
const { RocketRideClient, Question } = require('rocketride');

const cache = new Map();

let rrSession = null;
let rrDisabled = false;
let rrInitPromise = null;

function normalizeRocketRideUri(uri) {
  if (!uri || !String(uri).trim()) return 'https://cloud.rocketride.ai';
  let u = String(uri).trim().replace(/\/v1\/?$/i, '');
  if (/api\.rocketride\.ai/i.test(u)) {
    u = u.replace(/api\.rocketride\.ai/i, 'cloud.rocketride.ai');
  }
  return u;
}

function rocketRideClientConfig() {
  const uri = normalizeRocketRideUri(
    process.env.ROCKETRIDE_URI || process.env.ROCKETRIDE_BASE_URL
  );
  const auth = process.env.ROCKETRIDE_APIKEY || process.env.ROCKETRIDE_API_KEY;
  return { uri, auth };
}

/** Treat placeholder keys as missing so we skip RocketRide and use OpenAI immediately. */
function isUnusableRocketRideAuth(auth) {
  if (!auth || !String(auth).trim()) return true;
  const a = String(auth).trim();
  if (a.length < 16) return true;
  if (/^rr-[-xX]{8,}$/i.test(a)) return true;
  if (/placeholder|changeme|your-api-key/i.test(a)) return true;
  return false;
}

function pipelineFilePath() {
  const name = process.env.ROCKETRIDE_PIPELINE_FILE || 'smartnetworking-ai.pipe';
  return path.join(__dirname, '..', '..', '..', 'pipelines', name);
}

async function ensureRocketRideSession() {
  if (rrDisabled) return null;
  if (rrSession) return rrSession;
  if (rrInitPromise) return rrInitPromise;

  rrInitPromise = (async () => {
    const { uri, auth } = rocketRideClientConfig();
    if (!auth || isUnusableRocketRideAuth(auth)) {
      rrDisabled = true;
      console.warn('[ai] RocketRide key missing or placeholder — skipping DAP; using OpenAI fallback if configured.');
      return null;
    }
    try {
      const client = new RocketRideClient({ uri, auth });
      await client.connect();
      const filepath = pipelineFilePath();
      const { token } = await client.use({ filepath });
      rrSession = { client, token };
      return rrSession;
    } catch (err) {
      rrDisabled = true;
      console.warn('[ai] RocketRide session failed:', err.message);
      return null;
    } finally {
      rrInitPromise = null;
    }
  })();

  return rrInitPromise;
}

function firstAnswerText(response) {
  if (!response || !Array.isArray(response.answers) || response.answers.length === 0) {
    return null;
  }
  const first = response.answers[0];
  if (typeof first === 'string') return first.trim() || null;
  if (first && typeof first === 'object' && typeof first.text === 'string') {
    return first.text.trim() || null;
  }
  return String(first).trim() || null;
}

function openAiTimeoutMs() {
  const dedicated = parseInt(process.env.OPENAI_TIMEOUT_MS || '', 10);
  if (!Number.isNaN(dedicated) && dedicated >= 5000) return dedicated;
  const legacy = parseInt(process.env.ROCKETRIDE_TIMEOUT_MS || '8000', 10);
  return Math.max(legacy, 120000);
}

async function callOpenAIDirect(systemPrompt, userPrompt, maxTokens) {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) {
    throw new Error(
      'OpenAI fallback requires OPENAI_API_KEY (and RocketRide path failed or was skipped).'
    );
  }
  const model = process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini';
  const timeout = openAiTimeoutMs();

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI returned an empty message.');
  }
  return content.trim();
}

function lastResortAiMessage(err) {
  const hint =
    'Configure OPENAI_API_KEY for Chat Completions fallback, set a real ROCKETRIDE_APIKEY for DAP pipelines, or set AI_FALLBACK_MODE=true for stub replies.';
  return (
    `The AI assistant could not reach a language model (${err?.message || 'unknown error'}). ` +
    `${hint}`
  );
}

async function callAI(systemPrompt, userPrompt, maxTokens = 300) {
  if (process.env.AI_FALLBACK_MODE === 'true') {
    return '[AI fallback] ' + userPrompt.slice(0, 80) + '...';
  }

  const skipRocketRide =
    process.env.AI_SKIP_ROCKETRIDE === 'true' ||
    process.env.OPENAI_ONLY === 'true' ||
    isUnusableRocketRideAuth(rocketRideClientConfig().auth);

  if (!skipRocketRide) {
    try {
      const session = await ensureRocketRideSession();
      if (session) {
        const question = new Question();
        question.addInstruction('System', systemPrompt);
        question.addQuestion(userPrompt);
        const response = await session.client.chat({
          token: session.token,
          question,
        });
        const text = firstAnswerText(response);
        if (text) return text;
      }
    } catch (err) {
      console.warn('[ai] RocketRide chat failed:', err.message);
    }
  }

  try {
    return await callOpenAIDirect(systemPrompt, userPrompt, maxTokens);
  } catch (err) {
    console.warn('[ai] OpenAI fallback failed:', err.message);
    return lastResortAiMessage(err);
  }
}

async function callAICached(cacheKey, systemPrompt, userPrompt, maxTokens = 300) {
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const result = await callAI(systemPrompt, userPrompt, maxTokens);
  cache.set(cacheKey, result);
  return result;
}

module.exports = { callAI, callAICached };
