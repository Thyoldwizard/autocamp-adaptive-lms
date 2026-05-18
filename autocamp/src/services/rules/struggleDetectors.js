'use strict';

const LOW_SCORE_THRESHOLD        = 60;  // below this → low_score signal
const REPEATED_ATTEMPTS_THRESHOLD = 3;  // strictly above this → repeated_attempts
const INACTIVITY_TIME_RATIO       = 0.2; // time < 20% of expected → inactivity signal

/**
 * Given a progress event, returns the signal types that should be written
 * to struggle_signals. Returns an empty array when no thresholds are crossed.
 *
 * @param {{
 *   score?:               number,
 *   attempts:             number,
 *   timeSpentMinutes?:    number,
 *   expectedTimeMinutes?: number,
 * }} event
 * @returns {string[]}
 */
function detectSignals({ score, attempts, timeSpentMinutes, expectedTimeMinutes }) {
  const signals = [];

  if (score !== undefined && score !== null && score < LOW_SCORE_THRESHOLD) {
    signals.push('low_score');
  }

  if (attempts > REPEATED_ATTEMPTS_THRESHOLD) {
    signals.push('repeated_attempts');
  }

  if (
    timeSpentMinutes   !== undefined &&
    expectedTimeMinutes !== undefined &&
    expectedTimeMinutes > 0 &&
    timeSpentMinutes < expectedTimeMinutes * INACTIVITY_TIME_RATIO
  ) {
    signals.push('inactivity');
  }

  return signals;
}

module.exports = { detectSignals };
