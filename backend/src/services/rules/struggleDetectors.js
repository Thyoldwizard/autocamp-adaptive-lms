'use strict';

const { getRules } = require('../../config/rules');

/**
 * Given a progress event, returns the signal types that should be written
 * to struggle_signals. Returns an empty array when no thresholds are crossed.
 *
 * Thresholds come from config/rules.js → struggle:
 *   lowScoreThreshold         — score strictly below this → low_score
 *   repeatedAttemptsThreshold — attempts strictly above this → repeated_attempts
 *   inactivityTimeRatio       — timeSpent < expected * this → inactivity
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
  const { lowScoreThreshold, repeatedAttemptsThreshold, inactivityTimeRatio } =
    getRules().struggle;

  const signals = [];

  if (score !== undefined && score !== null && score < lowScoreThreshold) {
    signals.push('low_score');
  }

  if (attempts > repeatedAttemptsThreshold) {
    signals.push('repeated_attempts');
  }

  if (
    timeSpentMinutes   !== undefined &&
    expectedTimeMinutes !== undefined &&
    expectedTimeMinutes > 0 &&
    timeSpentMinutes < expectedTimeMinutes * inactivityTimeRatio
  ) {
    signals.push('inactivity');
  }

  return signals;
}

module.exports = { detectSignals };
