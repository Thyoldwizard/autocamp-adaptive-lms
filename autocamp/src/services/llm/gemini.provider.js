'use strict';

/**
 * gemini.provider.js
 *
 * Calls Gemini 2.5 Flash via the Google Generative Language REST API.
 * One retry on 429 (rate limit) after a 5-second back-off.
 *
 * Interface:
 *   generate({ system, messages }) → Promise<string>
 *
 * `messages` is an array of { role: 'user'|'assistant', content: string }
 * in chronological order. The final element must be the new user message.
 */

const { GEMINI_API_KEY } = require('../../config/env');

// ── Error type ────────────────────────────────────────────────────────────────

class LLMError extends Error {
  constructor(message, statusCode, raw) {
    super(message);
    this.name       = 'LLMError';
    this.statusCode = statusCode ?? 500;
    this.raw        = raw ?? null;
    this.isOperational = true;
  }
}

// ── Config ────────────────────────────────────────────────────────────────────

const GEMINI_MODEL   = 'gemini-2.5-flash';
const GEMINI_BASE    = 'https://generativelanguage.googleapis.com/v1beta/models';
const RETRY_DELAY_MS = 5_000;
const MAX_TOKENS     = 1024;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Map our canonical { role, content } messages to Gemini's `contents` format.
 * Gemini uses role 'model' for assistant turns.
 */
function toGeminiContents(messages) {
  return messages.map((m) => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

/**
 * Execute a single POST to the Gemini generateContent endpoint.
 * Returns the raw Response object so the caller can inspect status.
 */
async function callGemini(system, messages) {
  const url  = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    system_instruction: system ? { parts: [{ text: system }] } : undefined,
    contents:           toGeminiContents(messages),
    generationConfig: {
      maxOutputTokens: MAX_TOKENS,
      temperature:     0.7,
    },
  };

  return fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

/**
 * Sleep for `ms` milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call Gemini 2.5 Flash and return the assistant text.
 *
 * @param {{ system?: string, messages: Array<{ role: string, content: string }> }} opts
 * @returns {Promise<string>} the assistant's response text
 * @throws {LLMError} on non-retryable failure or second 429
 */
async function generate({ system = '', messages }) {
  if (!GEMINI_API_KEY) {
    throw new LLMError('GEMINI_API_KEY is not configured', 500);
  }
  if (!messages?.length) {
    throw new LLMError('messages array is required and must not be empty', 400);
  }

  let res = await callGemini(system, messages);

  // ── One retry on 429 ────────────────────────────────────────────────────────
  if (res.status === 429) {
    await sleep(RETRY_DELAY_MS);
    res = await callGemini(system, messages);
  }

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { /* ignore parse error */ }
    throw new LLMError(
      `Gemini API error (${res.status}): ${detail.slice(0, 200)}`,
      res.status,
      detail,
    );
  }

  let json;
  try {
    json = await res.json();
  } catch (err) {
    throw new LLMError('Failed to parse Gemini response as JSON', 502);
  }

  // Extract text from the first candidate
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new LLMError('Gemini returned an empty response', 502, json);
  }

  return text.trim();
}

module.exports = { generate, LLMError };
