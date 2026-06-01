'use strict';

const { getRules } = require('../../config/rules');

/**
 * Scores a learner's at-risk level from their unresolved struggle signals.
 * Recent signals (within the recency window) are weighted up. Score caps at 100.
 * Signal weights, recency window/multiplier, and level cutoffs all come from
 * the rules config (config/rules.js → atRisk).
 *
 * @param {{
 *   signals: Array<{ signal_type: string, created_at: string|Date, resolved_at: string|Date|null }>,
 *   now?:    Date,
 * }} args
 * @returns {{ score: number, level: 'low'|'medium'|'high'|'critical', reasons: string[] }}
 */
function atRiskScore({ signals, now = new Date() }) {
  const { signalWeights, recencyWindowMs, recencyMultiplier, levels } = getRules().atRisk;

  const nowMs  = now.getTime();
  let rawScore = 0;
  const reasons = [];

  for (const signal of signals) {
    if (signal.resolved_at) continue;

    const baseWeight = signalWeights[signal.signal_type] ?? 0;
    if (baseWeight === 0) continue;

    const ageMs      = nowMs - new Date(signal.created_at).getTime();
    const multiplier = ageMs <= recencyWindowMs ? recencyMultiplier : 1;
    rawScore        += baseWeight * multiplier;

    const label       = signal.signal_type.replace(/_/g, ' ');
    const recencyNote = multiplier > 1 ? ' (recent)' : '';
    reasons.push(`${label}${recencyNote}`);
  }

  const score     = Math.min(100, Math.round(rawScore));
  const { level } = levels.find((l) => score >= l.threshold);

  return { score, level, reasons };
}

module.exports = { atRiskScore };
