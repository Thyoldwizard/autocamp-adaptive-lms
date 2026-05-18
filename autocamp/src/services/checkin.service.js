'use strict';

/**
 * checkin.service.js
 *
 * Powers the skill check-in (MCQ quiz) flow.
 *
 * Two operations:
 *   startCheckin(learnerId, skillCode)
 *     1. Fetch learner record.
 *     2. Fetch skill by code from catalog.
 *     3. Fetch learner's skill_state for that skill.
 *     4. Call LLM (with rules fallback) to generate 4 MCQ questions.
 *     5. Store correct answers in an in-memory session map keyed by UUID.
 *     6. Return questions WITHOUT correct answers.
 *
 *   submitCheckin(learnerId, skillCode, sessionId, answers)
 *     1. Look up session by sessionId — 400 if missing.
 *     2. Score answers against stored correct answers.
 *     3. Update skill_state proficiency via repo.
 *     4. Call recordActivity with score.
 *     5. Delete session from map.
 *     6. Return { score, updatedProficiency, signalsCreated }.
 *
 * In-memory session map:
 *   Map<sessionId, { learnerId, skillId, skillCode, questions: [{question, options, correctIndex, explanation}], createdAt }>
 *
 * Sessions expire after 30 minutes (checked on submit).
 */

const crypto                      = require('crypto');
const learnersRepo                = require('../db/repositories/learners.repo');
const skillsRepo                  = require('../db/repositories/skills.repo');
const skillStateRepo              = require('../db/repositories/skillState.repo');
const { recordActivity }          = require('./dashboard.service');
const llm                         = require('./llm');
const { buildCheckinPrompt, parseCheckinResponse, FALLBACK_QUESTIONS } =
  require('./llm/prompts/checkin.prompt');
const { NotFoundError, BadRequestError } = require('../lib/errors');

// ─── In-memory session store ─────────────────────────────────────────────────

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * @type {Map<string, {
 *   learnerId: string,
 *   skillId: string,
 *   skillCode: string,
 *   questions: Array<{ question: string, options: string[], correctIndex: number, explanation: string }>,
 *   createdAt: number,
 * }>}
 */
const sessions = new Map();

/**
 * Generate a UUID v4 for session IDs.
 */
function generateSessionId() {
  return crypto.randomUUID();
}

/**
 * Purge expired sessions (older than SESSION_TTL_MS).
 * Called opportunistically on each submit.
 */
function purgeExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start a new check-in session for a learner on a specific skill.
 *
 * @param {string} learnerId
 * @param {string} skillCode  - e.g. 'sql', 'python'
 * @returns {Promise<{
 *   sessionId: string,
 *   skillCode: string,
 *   skillName: string,
 *   questions: Array<{ question: string, options: string[] }>,
 * }>}
 */
async function startCheckin(learnerId, skillCode) {
  if (!learnerId) throw new BadRequestError('learnerId is required');
  if (!skillCode) throw new BadRequestError('skillCode is required');

  // 1. Fetch learner
  const learner = await learnersRepo.findById(learnerId);
  if (!learner) {
    throw new NotFoundError(`Learner not found: ${learnerId}`);
  }

  // 2. Fetch skill from catalog
  const skill = await skillsRepo.findByCode(skillCode);
  if (!skill) {
    throw new NotFoundError(`Skill not found: ${skillCode}`);
  }

  // 3. Fetch learner's current proficiency for this skill
  const existingState = await skillStateRepo.findByLearnerAndSkillId(learnerId, skill.id);
  const proficiency = existingState ? Number(existingState.proficiency) : 0;

  // 4. Generate questions via LLM (with fallback)
  let questions = await generateQuestions(learner, skill, proficiency);

  // 5. Create session and store correct answers
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    learnerId,
    skillId: skill.id,
    skillCode: skill.code,
    questions: questions.map((q) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })),
    createdAt: Date.now(),
  });

  // 6. Return questions WITHOUT correct answers
  const publicQuestions = questions.map((q) => ({
    question: q.question,
    options: q.options,
  }));

  return {
    sessionId,
    skillCode: skill.code,
    skillName: skill.name,
    questions: publicQuestions,
  };
}

/**
 * Submit answers for a check-in session.
 *
 * @param {string} learnerId
 * @param {string} skillCode
 * @param {string} sessionId
 * @param {number[]} answers - array of 0-based option indices, one per question
 * @returns {Promise<{
 *   score: number,
 *   totalQuestions: number,
 *   correctAnswers: number,
 *   updatedProficiency: number,
 *   signalsCreated: object[],
 *   review: Array<{
 *     question: string,
 *     options: string[],
 *     selectedIndex: number,
 *     correctIndex: number,
 *     isCorrect: boolean,
 *     explanation: string,
 *   }>,
 * }>}
 */
async function submitCheckin(learnerId, skillCode, sessionId, answers) {
  if (!learnerId)  throw new BadRequestError('learnerId is required');
  if (!skillCode)  throw new BadRequestError('skillCode is required');
  if (!sessionId)  throw new BadRequestError('sessionId is required');
  if (!answers || !Array.isArray(answers)) {
    throw new BadRequestError('answers array is required');
  }

  // Opportunistically purge expired sessions
  purgeExpiredSessions();

  // 1. Look up session
  const session = sessions.get(sessionId);
  if (!session) {
    throw new BadRequestError('Invalid or expired session. Start a new check-in.');
  }

  // Verify session belongs to this learner and skill
  if (session.learnerId !== learnerId) {
    throw new BadRequestError('Session does not belong to this learner.');
  }
  if (session.skillCode !== skillCode) {
    throw new BadRequestError('Session does not match the requested skill.');
  }

  // 2. Score answers
  const totalQuestions = session.questions.length;
  if (answers.length !== totalQuestions) {
    throw new BadRequestError(
      `Expected ${totalQuestions} answers, got ${answers.length}.`,
    );
  }

  let correctAnswers = 0;
  for (let i = 0; i < totalQuestions; i++) {
    if (answers[i] === session.questions[i].correctIndex) {
      correctAnswers++;
    }
  }

  const score = Math.round((correctAnswers / totalQuestions) * 100);

  // 3. Update proficiency
  const delta = score >= 75 ? 0.08 : score >= 50 ? 0.02 : -0.05;
  const currentProficiency = await getCurrentProficiency(learnerId, session.skillId);
  const newProficiency = Math.max(0, Math.min(1, currentProficiency + delta));

  await skillStateRepo.updateProficiency(learnerId, session.skillId, {
    proficiency: newProficiency,
    last_assessed_at: new Date().toISOString(),
  });

  // 4. Record activity (find a relevant module for this skill)
  const signalsCreated = await recordActivityForCheckin(
    learnerId,
    session.skillId,
    score,
  );

  // 5. Delete session
  sessions.delete(sessionId);

  return {
    score,
    totalQuestions,
    correctAnswers,
    updatedProficiency: Math.round(newProficiency * 100) / 100,
    signalsCreated,
    review: session.questions.map((question, index) => ({
      question: question.question,
      options: question.options,
      selectedIndex: answers[index],
      correctIndex: question.correctIndex,
      isCorrect: answers[index] === question.correctIndex,
      explanation: question.explanation,
    })),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate MCQ questions via LLM, with retry and fallback.
 *
 * @param {object} learner
 * @param {object} skill
 * @param {number} proficiency
 * @returns {Promise<Array<{question, options, correctIndex}>>}
 */
async function generateQuestions(learner, skill, proficiency) {
  const prompt = buildCheckinPrompt({
    learner,
    skill,
    proficiency,
    backgroundType: learner.background_type,
  });

  try {
    const raw = await llm.generate(prompt);
    const parsed = parseCheckinResponse(raw);
    if (parsed && parsed.length >= 2) {
      return parsed.slice(0, 4);
    }
  } catch {
    // LLM failed — fall through to retry then fallback
  }

  // Retry once
  try {
    const raw = await llm.generate(prompt);
    const parsed = parseCheckinResponse(raw);
    if (parsed && parsed.length >= 2) {
      return parsed.slice(0, 4);
    }
  } catch {
    // Second failure — fall through to fallback
  }

  // Fallback: hardcoded questions for this skill
  const fallback = FALLBACK_QUESTIONS[skill.code] ?? FALLBACK_QUESTIONS.sql;
  return fallback;
}

/**
 * Get current proficiency for a learner-skill pair.
 *
 * @param {string} learnerId
 * @param {string} skillId
 * @returns {Promise<number>}
 */
async function getCurrentProficiency(learnerId, skillId) {
  const state = await skillStateRepo.findByLearnerAndSkillId(learnerId, skillId);
  return state ? Number(state.proficiency) : 0;
}

/**
 * Record check-in activity. Since check-ins are skill-scoped (not module-scoped),
 * we record activity against a synthetic "check-in" event.
 *
 * @param {string} learnerId
 * @param {string} skillId
 * @param {number} score
 * @returns {Promise<object[]>}
 */
async function recordActivityForCheckin(learnerId, skillId, score) {
  // Check-in is a skill-level event, not module-level.
  // We still call recordActivity but without a module — it will create
  // signals if the score triggers struggle detectors.
  // Since recordActivity requires a moduleId, we use the skillId as a proxy.
  // This is a pragmatic choice — in a future iteration we could add a
  // dedicated check-in activity table.
  try {
    const result = await recordActivity(learnerId, skillId, {
      attempts: 1,
      score,
      timeSpentMinutes: 5,
    });
    return result.signalsCreated ?? [];
  } catch {
    // If recordActivity fails (e.g., no module row for this skillId),
    // we still return the check-in result — signals are non-critical.
    return [];
  }
}

module.exports = { startCheckin, submitCheckin, sessions };
