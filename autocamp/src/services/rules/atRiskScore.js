'use strict';

const SIGNAL_WEIGHTS = {
  missed_deadline:   20,
  low_score:         15,
  repeated_attempts: 10,
  inactivity:        25,
  help_requested:     5,
  instructor_flag:   30,
};

const RECENCY_WINDOW_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const RECENCY_MULTIPLIER = 1.5;

// Ordered highest to lowest so .find() returns the right level immediately.
const LEVELS = [
  { threshold: 75, level: 'critical' },
  { threshold: 50, level: 'high'     },
  { threshold: 25, level: 'medium'   },
  { threshold:  0, level: 'low'      },
];

/**
 * Scores a learner's at-risk level from their unresolved struggle signals.
 * Recent signals (within 7 days) are weighted 1.5×. Score caps at 100.
 *
 * @param {{
 *   signals: Array<{ signal_type: string, created_at: string|Date, resolved_at: string|Date|null }>,
 *   now?:    Date,
 * }} args
 * @returns {{ score: number, level: 'low'|'medium'|'high'|'critical', reasons: string[] }}
 */
function atRiskScore({ signals, now = new Date() }) {
  const nowMs  = now.getTime();
  let rawScore = 0;
  const reasons = [];

  for (const signal of signals) {
    if (signal.resolved_at) continue;

    const baseWeight = SIGNAL_WEIGHTS[signal.signal_type] ?? 0;
    if (baseWeight === 0) continue;

    const ageMs      = nowMs - new Date(signal.created_at).getTime();
    const multiplier = ageMs <= RECENCY_WINDOW_MS ? RECENCY_MULTIPLIER : 1;
    rawScore        += baseWeight * multiplier;

    const label       = signal.signal_type.replace(/_/g, ' ');
    const recencyNote = multiplier > 1 ? ' (recent)' : '';
    reasons.push(`${label}${recencyNote}`);
  }

  const score     = Math.min(100, Math.round(rawScore));
  const { level } = LEVELS.find((l) => score >= l.threshold);

  return { score, level, reasons };
}

module.exports = { atRiskScore };
