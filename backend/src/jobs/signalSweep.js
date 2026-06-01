'use strict';

/**
 * signalSweep.js
 *
 * Periodic job that scans all learners for inactivity and writes inactivity
 * struggle signals.  Can be triggered via setInterval (server.js) or via
 * the POST /api/instructor/jobs/sweep endpoint.
 *
 * Two rules:
 *   1. Stalled in-progress module: any module with status 'in_progress' or
 *      'stalled' whose updated_at is older than 7 days → inactivity signal.
 *   2. No progress after enrollment: learner enrolled more than 3 days ago
 *      with NO progress rows that are anything other than 'not_started'
 *      → inactivity signal.
 *
 * Signals are deduplicated: if an unresolved inactivity signal already exists
 * for the same learner within the last 7 days, no new signal is written.
 *
 * The N+1 is eliminated by batch-fetching all progress and recent signals
 * for the full learner list before entering the per-learner loop.
 *
 * Export:
 *   runSweep() → Promise<{ learnersScanned, signalsCreated: object[] }>
 */

const learnersRepo = require('../db/repositories/learners.repo');
const progressRepo = require('../db/repositories/progress.repo');
const signalsRepo  = require('../db/repositories/signals.repo');
const logger       = require('../lib/logger');

const STALLED_DAYS      = 7;
const NO_PROGRESS_DAYS  = 3;
const DEDUP_WINDOW_DAYS = 7;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function isOlderThan(isoString, days) {
  if (!isoString) return true;
  return isoString < daysAgo(days);
}

function groupBy(rows, key) {
  const map = Object.create(null);
  for (const row of rows) {
    const k = row[key];
    if (!map[k]) map[k] = [];
    map[k].push(row);
  }
  return map;
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function runSweep() {
  const learners = await learnersRepo.findAll();

  if (!learners.length) {
    logger.info('signalSweep complete', { learnersScanned: 0, signalsCreated: 0, signalsSkipped: 0 });
    return { learnersScanned: 0, signalsCreated: [] };
  }

  const learnerIds = learners.map((l) => l.id);

  // Single batch fetch for both datasets — kills the N+1
  const [allProgress, recentSignals] = await Promise.all([
    progressRepo.findByLearnerIds(learnerIds),
    signalsRepo.findRecentByLearnerIds(learnerIds, DEDUP_WINDOW_DAYS),
  ]);

  const progressByLearner = groupBy(allProgress, 'learner_id');

  // Set of learner IDs that already have an unresolved inactivity signal
  const alreadyFlagged = new Set(
    recentSignals
      .filter((s) => s.signal_type === 'inactivity' && !s.resolved_at)
      .map((s) => s.learner_id),
  );

  const signalsCreated = [];
  let skipped = 0;

  for (const learner of learners) {
    if (alreadyFlagged.has(learner.id)) {
      skipped++;
      continue;
    }

    const progressRows = progressByLearner[learner.id] ?? [];

    // Rule 1: Stalled in-progress module
    const stalledModules = progressRows.filter(
      (p) =>
        (p.status === 'in_progress' || p.status === 'stalled') &&
        isOlderThan(p.updated_at, STALLED_DAYS),
    );

    for (const stalled of stalledModules) {
      const moduleName = stalled.module?.name ?? stalled.module_id;
      const signal = await signalsRepo.insert({
        learner_id:  learner.id,
        signal_type: 'inactivity',
        severity:    'medium',
        source:      'system',
        context: {
          reason:       'stalled_module',
          module_id:    stalled.module_id,
          module_name:  moduleName,
          status:       stalled.status,
          last_updated: stalled.updated_at,
          days_stalled: STALLED_DAYS,
        },
      });
      signalsCreated.push({ learnerId: learner.id, reason: 'stalled_module', signal });
    }

    // Rule 2: No progress after enrollment
    const enrolledLongEnough = isOlderThan(learner.enrolled_at, NO_PROGRESS_DAYS);
    const hasRealProgress    = progressRows.some((p) => p.status !== 'not_started');

    if (enrolledLongEnough && !hasRealProgress) {
      const signal = await signalsRepo.insert({
        learner_id:  learner.id,
        signal_type: 'inactivity',
        severity:    'medium',
        source:      'system',
        context: {
          reason:                'no_progress_after_enrollment',
          enrolled_at:           learner.enrolled_at,
          days_since_enrollment: NO_PROGRESS_DAYS,
        },
      });
      signalsCreated.push({ learnerId: learner.id, reason: 'no_progress_after_enrollment', signal });
    }
  }

  logger.info('signalSweep complete', {
    learnersScanned: learners.length,
    signalsCreated:  signalsCreated.length,
    signalsSkipped:  skipped,
  });

  return { learnersScanned: learners.length, signalsCreated };
}

module.exports = { runSweep };
