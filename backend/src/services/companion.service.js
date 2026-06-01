'use strict';

/**
 * companion.service.js
 *
 * Orchestrates the AI learning companion conversation.
 *
 * chat(learnerId, userMessage):
 *   1. Fetch the learner model (analysis + skill state + progress).
 *   2. Build a rich system prompt from the learner's context.
 *   3. Fetch last 10 companion messages as conversation history.
 *   4. Call the LLM (gemini or fallback, per env).
 *   5. Persist both the user message and assistant reply.
 *   6. If the user's message contains struggle indicators → write help_requested signal.
 *   7. Return { response, signalCreated }.
 */

const { getLearnerModel }  = require('./learnerModel.service');
const companionRepo        = require('../db/repositories/companion.repo');
const signalsRepo          = require('../db/repositories/signals.repo');
const llm                  = require('./llm');
const fallbackProvider     = require('./llm/fallback.provider');
const { getRules }         = require('../config/rules');
const logger               = require('../lib/logger');

// ─── Struggle phrase detection ────────────────────────────────────────────────
//
// Runs on the student's own message (not the LLM reply): when the user signals
// confusion, we write a help_requested signal so instructors are alerted.

const STRUGGLE_PHRASES = [
  "i don't understand",
  "i don't get",
  "i'm confused",
  "i am confused",
  "i'm lost",
  "i am lost",
  'help me',
  "i can't figure",
  'stuck on',
  'struggling with',
  "don't know how",
  'make no sense',
  "makes no sense",
  'totally lost',
  'have no idea',
];

// Compile each phrase to a word-boundary regex so it only matches as whole
// words. A raw substring match produced false positives — e.g. "help me"
// firing inside "help mentor" — which a leading/trailing \b prevents.
const STRUGGLE_PATTERNS = STRUGGLE_PHRASES.map(
  (phrase) => new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
);

function detectStruggle(userMessage) {
  return STRUGGLE_PATTERNS.some((pattern) => pattern.test(userMessage));
}

// ─── System prompt builder ────────────────────────────────────────────────────

/**
 * Build the system prompt from the learner model.
 * Embeds enough context for both the Gemini model and the fallback to give
 * a personalised, contextually relevant response.
 *
 * @param {object} model - result of getLearnerModel()
 * @returns {string}
 */
function buildSystemPrompt(model) {
  const { learner, analysis } = model;
  const { atRisk, goalProgress, nextBestAction } = analysis;

  // Find the current in-progress module (lowest completion_pct among active)
  const activeProgress = model.progress
    .filter((p) => p.status === 'in_progress' || p.status === 'stalled')
    .sort((a, b) => Number(a.completion_pct) - Number(b.completion_pct));
  const currentModule = activeProgress[0]?.module?.name ?? null;

  const strongAreas = goalProgress.strongAreas.join(', ') || 'none yet';
  const weakAreas   = goalProgress.weakAreas.join(', ')   || 'none identified';

  const atRiskNote = atRisk.level !== 'low'
    ? `⚠️ At-risk level: ${atRisk.level} (${atRisk.reasons.join(', ')}). `
      + `Be especially supportive and encouraging.`
    : '';

  return [
    `You are a warm, expert AI learning companion for the pace LMS.`,
    `Your role is to help students understand course material, stay motivated, and make progress.`,
    `Always be encouraging, specific, and concise. Never make the student feel judged.`,
    ``,
    `── Learner context ──`,
    `Name: ${learner.name}`,
    `Program: ${learner.program}`,
    `Goal: ${learner.stated_goal ?? 'Not specified'}`,
    `Current module: ${currentModule ?? 'No active module'}`,
    `Recommended next module: ${nextBestAction?.moduleName ?? 'Not determined'}`,
    `Goal progress: ${goalProgress.percentage}%`,
    `On track: ${goalProgress.onTrack}`,
    `Strong areas: ${strongAreas}`,
    `Weak areas: ${weakAreas}`,
    atRiskNote,
    ``,
    `Keep responses under 200 words unless the student asks for a detailed explanation.`,
    `Use markdown sparingly — bold key terms, use bullet points for lists.`,
  ].filter(Boolean).join('\n');
}

// ─── History builder ──────────────────────────────────────────────────────────

/**
 * Convert repo rows (newest-first) to LLM messages (oldest-first).
 * We reverse so the LLM sees chronological conversation flow.
 */
function buildHistory(rows) {
  return [...rows]
    .reverse()                          // newest-first → oldest-first
    .map((r) => ({ role: r.role, content: r.content }));
}

// ─── LLM call with retry + deterministic fallback ────────────────────────────
//
// Attempt the primary provider up to twice; on both failures degrade to the
// deterministic fallback so the companion never returns a 500 to the user.

async function generateWithFallback(opts) {
  try {
    return await llm.generate(opts);
  } catch (firstErr) {
    logger.warn('LLM first attempt failed, retrying', { error: firstErr.message });
    try {
      return await llm.generate(opts);
    } catch (secondErr) {
      logger.warn('LLM retry failed, using deterministic fallback', { error: secondErr.message });
      return await fallbackProvider.generate(opts);
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run one conversation turn with the AI companion.
 *
 * @param {string} learnerId   - learners.id UUID
 * @param {string} userMessage - the student's new message
 * @returns {Promise<{ response: string, signalCreated: object|null }>}
 */
async function chat(learnerId, userMessage) {
  if (!learnerId)    throw new Error('companion.chat: learnerId is required');
  if (!userMessage?.trim()) throw new Error('companion.chat: userMessage is required');

  const cleanMessage = userMessage.trim();

  // ── 1 + 3: Fetch model and history in parallel ────────────────────────────
  const maxHistory = getRules().companion?.maxHistoryMessages ?? 10;
  const [model, historyRows] = await Promise.all([
    getLearnerModel(learnerId),
    companionRepo.findRecentByLearnerId(learnerId, maxHistory),
  ]);

  // ── 2: Build system prompt ────────────────────────────────────────────────
  const system = buildSystemPrompt(model);

  // ── 3 (cont): Build message list = history + new user message ─────────────
  const messages = [
    ...buildHistory(historyRows),
    { role: 'user', content: cleanMessage },
  ];

  // ── 4: Call LLM (one retry; falls back to deterministic on double failure) ──
  const response = await generateWithFallback({ system, messages });

  // ── 5: Persist both turns in parallel ─────────────────────────────────────
  const [, assistantRow] = await Promise.all([
    companionRepo.insert({
      learner_id: learnerId,
      role:       'user',
      content:    cleanMessage,
    }),
    companionRepo.insert({
      learner_id: learnerId,
      role:       'assistant',
      content:    response,
    }),
  ]);

  // ── 6: Struggle detection on user message ─────────────────────────────────
  let signalCreated = null;
  if (detectStruggle(cleanMessage)) {
    signalCreated = await signalsRepo.insert({
      learner_id:  learnerId,
      signal_type: 'help_requested',
      severity:    'low',
      source:      'companion',
      context: {
        message_id:      assistantRow.id,
        user_message:    cleanMessage.slice(0, 200),
        triggered_by:    'struggle_phrase_detection',
      },
    });
  }

  return { response, signalCreated };
}

module.exports = { chat, buildSystemPrompt, detectStruggle };
