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
 *     5. Persist session (with full questions incl. correctIndex) in checkin_sessions.
 *     6. Return questions WITHOUT correct answers.
 *
 *   submitCheckin(learnerId, skillCode, sessionId, answers)
 *     1. Opportunistically purge expired DB sessions.
 *     2. Look up session by sessionId — 400 if missing or expired.
 *     3. Verify session belongs to this learner and skill.
 *     4. Score answers against stored correct answers.
 *     5. Update skill_state proficiency via repo.
 *     6. Call recordActivity with score.
 *     7. Delete session from DB.
 *     8. Return { score, updatedProficiency, signalsCreated }.
 *
 * Session TTL comes from getRules().checkin.sessionTtlMs.
 */

const crypto                      = require('crypto');
const learnersRepo                = require('../db/repositories/learners.repo');
const skillsRepo                  = require('../db/repositories/skills.repo');
const skillStateRepo              = require('../db/repositories/skillState.repo');
const checkinSessionsRepo         = require('../db/repositories/checkinSessions.repo');
const { recordActivity }          = require('./dashboard.service');
const llm                         = require('./llm');
const { buildCheckinPrompt, parseCheckinResponse, FALLBACK_QUESTIONS } =
  require('./llm/prompts/checkin.prompt');
const { NotFoundError, BadRequestError } = require('../lib/errors');
const { getRules }                = require('../config/rules');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSessionId() {
  return crypto.randomUUID();
}

/**
 * Opportunistically delete expired sessions from the DB.
 * Called on each submit; errors are swallowed so they never block the caller.
 */
async function purgeExpiredSessions() {
  try {
    await checkinSessionsRepo.purgeExpired();
  } catch {
    // Non-critical cleanup — don't let it surface to callers.
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
  const questions = await generateQuestions(learner, skill, proficiency);

  // 5. Persist session with correct answers
  const sessionId = generateSessionId();
  const ttlMs = getRules().checkin.sessionTtlMs;

  await checkinSessionsRepo.create({
    id: sessionId,
    learner_id: learnerId,
    skill_id: skill.id,
    skill_code: skill.code,
    questions: questions.map((q) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })),
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
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

  // 1. Opportunistically purge expired sessions (fire-and-forget)
  purgeExpiredSessions();

  // 2. Look up session (repo returns null if missing or expired)
  const session = await checkinSessionsRepo.findById(sessionId);
  if (!session) {
    throw new BadRequestError('Invalid or expired session. Start a new check-in.');
  }

  // 3. Verify session belongs to this learner and skill
  if (session.learner_id !== learnerId) {
    throw new BadRequestError('Session does not belong to this learner.');
  }
  if (session.skill_code !== skillCode) {
    throw new BadRequestError('Session does not match the requested skill.');
  }

  // 4. Score answers
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

  // 5. Update proficiency
  const { highScoreCutoff, midScoreCutoff, highScore, midScore, lowScore } =
    getRules().checkin.proficiencyDelta;
  const delta = score >= highScoreCutoff ? highScore
              : score >= midScoreCutoff  ? midScore
              :                            lowScore;
  const currentProficiency = await getCurrentProficiency(learnerId, session.skill_id);
  const newProficiency = Math.max(0, Math.min(1, currentProficiency + delta));

  await skillStateRepo.updateProficiency(learnerId, session.skill_id, {
    proficiency: newProficiency,
    last_assessed_at: new Date().toISOString(),
  });

  // 6. Record activity
  const signalsCreated = await recordActivityForCheckin(
    learnerId,
    session.skill_id,
    score,
  );

  // 7. Delete session from DB
  await checkinSessionsRepo.deleteById(sessionId);

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

// ─── Private helpers ──────────────────────────────────────────────────────────

async function generateQuestions(learner, skill, proficiency) {
  const { minQuestions, maxQuestions } = getRules().checkin;

  const prompt = buildCheckinPrompt({
    learner,
    skill,
    proficiency,
    backgroundType: learner.background_type,
  });

  try {
    const raw = await llm.generate(prompt);
    const parsed = parseCheckinResponse(raw);
    if (parsed && parsed.length >= minQuestions) {
      return parsed.slice(0, maxQuestions);
    }
  } catch {
    // LLM failed — fall through to retry then fallback
  }

  // Retry once
  try {
    const raw = await llm.generate(prompt);
    const parsed = parseCheckinResponse(raw);
    if (parsed && parsed.length >= minQuestions) {
      return parsed.slice(0, maxQuestions);
    }
  } catch {
    // Second failure — fall through to fallback
  }

  const fallback = FALLBACK_QUESTIONS[skill.code] ?? FALLBACK_QUESTIONS.sql;
  return fallback;
}

async function getCurrentProficiency(learnerId, skillId) {
  const state = await skillStateRepo.findByLearnerAndSkillId(learnerId, skillId);
  return state ? Number(state.proficiency) : 0;
}

async function recordActivityForCheckin(learnerId, skillId, score) {
  try {
    const result = await recordActivity(learnerId, skillId, {
      attempts: 1,
      score,
      timeSpentMinutes: getRules().checkin.activityTimeMinutes,
    });
    return result.signalsCreated ?? [];
  } catch {
    return [];
  }
}

module.exports = { startCheckin, submitCheckin };
