'use strict';

/**
 * signalSweep.js
 *
 * Periodic job that scans all learners for inactivity and writes inactivity
 * struggle signals.  NOT auto-scheduled — export only, caller decides when
 * to run (e.g. cron, node-cron, or manual trigger).
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
 * Export:
 *   runSweep() → Promise<{ learnersScanned, signalsCreated: object[] }>
 */

const learnersRepo   = require('../db/repositories/learners.repo');
const progressRepo   = require('../db/repositories/progress.repo');
const signalsRepo    = require('../db/repositories/signals.repo');

const STALLED_DAYS       = 7;   // in_progress module untouched for 7 days
const NO_PROGRESS_DAYS   = 3;   // enrolled > 3 days with no real progress
const DEDUP_WINDOW_DAYS  = 7;   // don't duplicate inactivity signals within 7 days

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function isOlderThan(isoString, days) {
  if (!isoString) return true;
  const cutoff = daysAgo(days);
  return isoString < cutoff;
}

/**
 * Check if the learner already has an unresolved inactivity signal
 * within the dedup window.
 */
async function hasRecentInactivitySignal(learnerId) {
  const recentSignals = await signalsRepo.findRecentByLearnerId(
    learnerId,
    DEDUP_WINDOW_DAYS,
  );
  return recentSignals.some(
    (s) => s.signal_type === 'inactivity' && !s.resolved_at,
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the inactivity sweep across all learners.
 *
 * @returns {Promise<{
 *   learnersScanned: number,
 *   signalsCreated: Array<{ learnerId, reason, signal }>,
 * }>}
 */
async function runSweep() {
  const learners = await learnersRepo.findAll();
  const signalsCreated = [];

  for (const learner of learners) {
    // Skip if learner already has a recent unresolved inactivity signal
    if (await hasRecentInactivitySignal(learner.id)) {
      continue;
    }

    const progressRows = await progressRepo.findByLearnerId(learner.id);

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
    const enrolledDaysAgo = isOlderThan(learner.enrolled_at, NO_PROGRESS_DAYS);
    const hasRealProgress = progressRows.some(
      (p) => p.status !== 'not_started',
    );

    if (enrolledDaysAgo && !hasRealProgress) {
      const signal = await signalsRepo.insert({
        learner_id:  learner.id,
        signal_type: 'inactivity',
        severity:    'medium',
        source:      'system',
        context: {
          reason:       'no_progress_after_enrollment',
          enrolled_at:  learner.enrolled_at,
          days_since_enrollment: NO_PROGRESS_DAYS,
        },
      });
      signalsCreated.push({ learnerId: learner.id, reason: 'no_progress_after_enrollment', signal });
    }
  }

  return {
    learnersScanned: learners.length,
    signalsCreated,
  };
}

module.exports = { runSweep };
