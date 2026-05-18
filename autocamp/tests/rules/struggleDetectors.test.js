'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { detectSignals } = require('../../src/services/rules/struggleDetectors');

// ---------------------------------------------------------------------------
// score threshold (< 60 → low_score)
// ---------------------------------------------------------------------------
describe('detectSignals — score threshold', () => {
  test('score 48 → low_score (Amna: SQL attempt)', () => {
    assert.deepEqual(detectSignals({ score: 48, attempts: 2 }), ['low_score']);
  });

  test('score 55 → low_score (Sadia: No-Code AI Tools)', () => {
    assert.deepEqual(detectSignals({ score: 55, attempts: 1 }), ['low_score']);
  });

  test('score 52 → low_score (Sadia: Prompt Engineering)', () => {
    assert.deepEqual(detectSignals({ score: 52, attempts: 2 }), ['low_score']);
  });

  test('score 60 → no signal (boundary: 60 is not below threshold)', () => {
    assert.deepEqual(detectSignals({ score: 60, attempts: 1 }), []);
  });

  test('score 62 → no signal (Bilal: Deep Learning — above threshold)', () => {
    assert.deepEqual(detectSignals({ score: 62, attempts: 3 }), []);
  });

  test('score 80 → no signal', () => {
    assert.deepEqual(detectSignals({ score: 80, attempts: 1 }), []);
  });
});

// ---------------------------------------------------------------------------
// attempts threshold (> 3 → repeated_attempts)
// ---------------------------------------------------------------------------
describe('detectSignals — attempts threshold', () => {
  test('attempts 3 → no signal (Bilal: boundary — 3 is not strictly above 3)', () => {
    assert.deepEqual(detectSignals({ score: 62, attempts: 3 }), []);
  });

  test('attempts 4 → repeated_attempts', () => {
    assert.deepEqual(detectSignals({ score: 75, attempts: 4 }), ['repeated_attempts']);
  });

  test('attempts 10 → repeated_attempts', () => {
    assert.deepEqual(detectSignals({ score: 75, attempts: 10 }), ['repeated_attempts']);
  });
});

// ---------------------------------------------------------------------------
// inactivity (timeSpent < 20% of expected)
// ---------------------------------------------------------------------------
describe('detectSignals — inactivity detection', () => {
  test('5 min spent of 30 min expected → inactivity (5 < 6 = 30 × 0.2)', () => {
    assert.deepEqual(
      detectSignals({ score: 80, attempts: 1, timeSpentMinutes: 5, expectedTimeMinutes: 30 }),
      ['inactivity']
    );
  });

  test('exactly at 20% threshold → no signal (7 < 30 × 0.2 = 6 is false; 6 = 6 is not strictly less)', () => {
    // 6 >= 6 → no inactivity
    assert.deepEqual(
      detectSignals({ score: 80, attempts: 1, timeSpentMinutes: 6, expectedTimeMinutes: 30 }),
      []
    );
  });

  test('10 min spent of 30 min expected → no signal (10 >= 6)', () => {
    assert.deepEqual(
      detectSignals({ score: 80, attempts: 1, timeSpentMinutes: 10, expectedTimeMinutes: 30 }),
      []
    );
  });

  test('0 expectedTimeMinutes → no inactivity (guard against divide-by-zero)', () => {
    assert.deepEqual(
      detectSignals({ score: 80, attempts: 1, timeSpentMinutes: 0, expectedTimeMinutes: 0 }),
      []
    );
  });

  test('missing expectedTimeMinutes → no inactivity check', () => {
    assert.deepEqual(
      detectSignals({ score: 80, attempts: 1, timeSpentMinutes: 1 }),
      []
    );
  });

  test('missing timeSpentMinutes → no inactivity check', () => {
    assert.deepEqual(
      detectSignals({ score: 80, attempts: 1, expectedTimeMinutes: 30 }),
      []
    );
  });
});

// ---------------------------------------------------------------------------
// Multiple signals at once
// ---------------------------------------------------------------------------
describe('detectSignals — multiple signals', () => {
  test('score 45, attempts 5 → low_score + repeated_attempts', () => {
    const signals = detectSignals({ score: 45, attempts: 5 });
    assert.deepEqual(signals, ['low_score', 'repeated_attempts']);
  });

  test('score 45, attempts 5, time 2 of 30 → all three signals', () => {
    const signals = detectSignals({
      score: 45, attempts: 5,
      timeSpentMinutes: 2, expectedTimeMinutes: 30,
    });
    assert.deepEqual(signals, ['low_score', 'repeated_attempts', 'inactivity']);
  });

  test('score 80, attempts 1, time 20 of 30 → empty (no thresholds crossed)', () => {
    assert.deepEqual(
      detectSignals({ score: 80, attempts: 1, timeSpentMinutes: 20, expectedTimeMinutes: 30 }),
      []
    );
  });
});

// ---------------------------------------------------------------------------
// Persona integration snapshots
// ---------------------------------------------------------------------------
describe('detectSignals — persona snapshots', () => {
  test('Amna SQL attempt: score 48, 2 attempts → [low_score] only', () => {
    // 2 attempts ≤ 3, no time data → only low_score
    assert.deepEqual(detectSignals({ score: 48, attempts: 2 }), ['low_score']);
  });

  test('Bilal Deep Learning: score 62, 3 attempts → no signals', () => {
    // 62 >= 60, 3 is not > 3
    assert.deepEqual(detectSignals({ score: 62, attempts: 3 }), []);
  });

  test('Sadia No-Code AI Tools: score 55, 1 attempt → [low_score]', () => {
    assert.deepEqual(detectSignals({ score: 55, attempts: 1 }), ['low_score']);
  });
});
