'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { goalProgress } = require('../../src/services/rules/goalProgress');

// ---------------------------------------------------------------------------
// Persona fixtures
// ---------------------------------------------------------------------------

// Amna — weak SQL/Python, one module completed out of two touched
// percentage = round(50 × 0.6 + 21.17 × 0.4) = round(30 + 8.47) = 38
const AMNA = {
  skillState: [
    { skill_id: 'sk-1', skill_code: 'excel',      proficiency: 0.62 },
    { skill_id: 'sk-2', skill_code: 'sql',         proficiency: 0.20 },
    { skill_id: 'sk-3', skill_code: 'python',      proficiency: 0.10 },
    { skill_id: 'sk-4', skill_code: 'statistics',  proficiency: 0.35 },
    { skill_id: 'sk-5', skill_code: 'power_bi',    proficiency: 0.00 },
    { skill_id: 'sk-6', skill_code: 'ml',          proficiency: 0.00 },
  ],
  progress: [
    { module_id: 'mod-1', status: 'completed'  },
    { module_id: 'mod-2', status: 'in_progress' },
  ],
};

// Bilal — strong Python/ML/Statistics, two of three modules complete
// percentage = round(66.67 × 0.6 + 31.33 × 0.4) = round(40 + 12.53) = 53
const BILAL = {
  skillState: [
    { skill_id: 'sk-a', skill_code: 'python',       proficiency: 0.85 },
    { skill_id: 'sk-b', skill_code: 'ml',            proficiency: 0.75 },
    { skill_id: 'sk-c', skill_code: 'statistics',    proficiency: 0.72 },
    { skill_id: 'sk-d', skill_code: 'deep_learning', proficiency: 0.30 },
    { skill_id: 'sk-e', skill_code: 'nlp',           proficiency: 0.20 },
    { skill_id: 'sk-f', skill_code: 'cv',            proficiency: 0.00 },
    { skill_id: 'sk-g', skill_code: 'generative_ai', proficiency: 0.00 },
    { skill_id: 'sk-h', skill_code: 'langchain',     proficiency: 0.00 },
    { skill_id: 'sk-i', skill_code: 'mlops',         proficiency: 0.00 },
  ],
  progress: [
    { module_id: 'mod-a', status: 'completed'  },
    { module_id: 'mod-b', status: 'completed'  },
    { module_id: 'mod-c', status: 'in_progress' },
  ],
};

// Sadia — three of four modules complete, weak GenAI/NLP/LangChain
// percentage = round(75 × 0.6 + 36 × 0.4) = round(45 + 14.4) = 59
const SADIA = {
  skillState: [
    { skill_id: 'sk-p', skill_code: 'excel',         proficiency: 0.65 },
    { skill_id: 'sk-q', skill_code: 'python',         proficiency: 0.50 },
    { skill_id: 'sk-r', skill_code: 'generative_ai',  proficiency: 0.30 },
    { skill_id: 'sk-s', skill_code: 'nlp',            proficiency: 0.20 },
    { skill_id: 'sk-t', skill_code: 'langchain',      proficiency: 0.15 },
  ],
  progress: [
    { module_id: 'mod-p', status: 'completed'  },
    { module_id: 'mod-q', status: 'completed'  },
    { module_id: 'mod-r', status: 'completed'  },
    { module_id: 'mod-s', status: 'in_progress' },
  ],
};

// ---------------------------------------------------------------------------
// Tests — Amna
// ---------------------------------------------------------------------------
describe('goalProgress — Amna (not on track)', () => {
  test('percentage is 38', () => {
    // moduleScore = 1/2 × 100 = 50; skillScore = 1.27/6 × 100 = 21.17
    // 50 × 0.6 + 21.17 × 0.4 = 30 + 8.47 = 38.47 → 38
    assert.equal(goalProgress(AMNA).percentage, 38);
  });

  test('not on track (percentage < 50)', () => {
    assert.equal(goalProgress(AMNA).onTrack, false);
  });

  test('no strong areas — nothing at or above 0.7', () => {
    assert.deepEqual(goalProgress(AMNA).strongAreas, []);
  });

  test('weakAreas includes sql, python, statistics (> 0 and < 0.4)', () => {
    const { weakAreas } = goalProgress(AMNA);
    assert.ok(weakAreas.includes('sql'),        'sql should be weak');
    assert.ok(weakAreas.includes('python'),     'python should be weak');
    assert.ok(weakAreas.includes('statistics'), 'statistics should be weak');
  });

  test('weakAreas excludes power_bi and ml (proficiency exactly 0 — not yet started)', () => {
    const { weakAreas } = goalProgress(AMNA);
    assert.ok(!weakAreas.includes('power_bi'), 'power_bi should not appear — not yet started');
    assert.ok(!weakAreas.includes('ml'),       'ml should not appear — not yet started');
  });

  test('weakAreas excludes excel (0.62 — between weak and strong thresholds)', () => {
    const { weakAreas } = goalProgress(AMNA);
    assert.ok(!weakAreas.includes('excel'), 'excel is neutral, not weak');
  });
});

// ---------------------------------------------------------------------------
// Tests — Bilal
// ---------------------------------------------------------------------------
describe('goalProgress — Bilal (on track)', () => {
  test('percentage is 53', () => {
    // moduleScore = 2/3 × 100 = 66.67; skillScore = 2.82/9 × 100 = 31.33
    // 66.67 × 0.6 + 31.33 × 0.4 = 40 + 12.53 = 52.53 → 53
    assert.equal(goalProgress(BILAL).percentage, 53);
  });

  test('on track (percentage >= 50)', () => {
    assert.equal(goalProgress(BILAL).onTrack, true);
  });

  test('strongAreas includes python, ml, statistics (all >= 0.7)', () => {
    const { strongAreas } = goalProgress(BILAL);
    assert.ok(strongAreas.includes('python'),     'python should be strong');
    assert.ok(strongAreas.includes('ml'),         'ml should be strong');
    assert.ok(strongAreas.includes('statistics'), 'statistics should be strong');
  });

  test('weakAreas includes deep_learning and nlp (> 0 and < 0.4)', () => {
    const { weakAreas } = goalProgress(BILAL);
    assert.ok(weakAreas.includes('deep_learning'), 'deep_learning should be weak');
    assert.ok(weakAreas.includes('nlp'),           'nlp should be weak');
  });

  test('zero-proficiency skills (cv, generative_ai, langchain, mlops) are not in weakAreas', () => {
    const { weakAreas } = goalProgress(BILAL);
    for (const code of ['cv', 'generative_ai', 'langchain', 'mlops']) {
      assert.ok(!weakAreas.includes(code), `${code} should not be in weakAreas`);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests — Sadia
// ---------------------------------------------------------------------------
describe('goalProgress — Sadia (on track despite low scores)', () => {
  test('percentage is 59', () => {
    // moduleScore = 3/4 × 100 = 75; skillScore = 1.80/5 × 100 = 36
    // 75 × 0.6 + 36 × 0.4 = 45 + 14.4 = 59.4 → 59
    assert.equal(goalProgress(SADIA).percentage, 59);
  });

  test('on track (percentage >= 50)', () => {
    assert.equal(goalProgress(SADIA).onTrack, true);
  });

  test('no strong areas — no skill at or above 0.7', () => {
    assert.deepEqual(goalProgress(SADIA).strongAreas, []);
  });

  test('weakAreas includes generative_ai, nlp, langchain (> 0 and < 0.4)', () => {
    const { weakAreas } = goalProgress(SADIA);
    assert.ok(weakAreas.includes('generative_ai'), 'generative_ai should be weak');
    assert.ok(weakAreas.includes('nlp'),           'nlp should be weak');
    assert.ok(weakAreas.includes('langchain'),     'langchain should be weak');
  });

  test('excel (0.65) and python (0.50) are not in weakAreas — they are in the neutral band', () => {
    const { weakAreas } = goalProgress(SADIA);
    assert.ok(!weakAreas.includes('excel'),  'excel is neutral');
    assert.ok(!weakAreas.includes('python'), 'python is neutral');
  });
});

// ---------------------------------------------------------------------------
// Persona comparison
// ---------------------------------------------------------------------------
describe('goalProgress — cross-persona comparisons', () => {
  test('percentages differ meaningfully: Amna < Bilal < Sadia', () => {
    const amna  = goalProgress(AMNA).percentage;
    const bilal = goalProgress(BILAL).percentage;
    const sadia = goalProgress(SADIA).percentage;
    assert.ok(amna < bilal, `Amna (${amna}) should be < Bilal (${bilal})`);
    assert.ok(bilal < sadia, `Bilal (${bilal}) should be < Sadia (${sadia})`);
  });

  test('only Bilal has strongAreas', () => {
    assert.equal(goalProgress(AMNA).strongAreas.length,  0);
    assert.ok(goalProgress(BILAL).strongAreas.length  > 0);
    assert.equal(goalProgress(SADIA).strongAreas.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('goalProgress — edge cases', () => {
  test('empty skillState — percentage driven purely by module completion', () => {
    const result = goalProgress({
      skillState: [],
      progress:   [{ module_id: 'm1', status: 'completed' }],
    });
    // skillScore = 0; moduleScore = 100; 100 × 0.6 + 0 × 0.4 = 60
    assert.equal(result.percentage, 60);
    assert.deepEqual(result.strongAreas, []);
    assert.deepEqual(result.weakAreas, []);
  });

  test('empty progress — percentage driven purely by skill average', () => {
    const result = goalProgress({
      skillState: [{ skill_id: 'x', skill_code: 'sql', proficiency: 0.50 }],
      progress:   [],
    });
    // moduleScore = 0; skillScore = 50; 0 × 0.6 + 50 × 0.4 = 20
    assert.equal(result.percentage, 20);
    assert.equal(result.onTrack, false);
  });

  test('perfect learner — all modules complete, all skills mastered', () => {
    const result = goalProgress({
      skillState: [{ skill_id: 'x', skill_code: 'sql', proficiency: 1.0 }],
      progress:   [{ module_id: 'm', status: 'completed' }],
    });
    assert.equal(result.percentage, 100);
    assert.equal(result.onTrack, true);
    assert.deepEqual(result.weakAreas, []);
    assert.deepEqual(result.strongAreas, ['sql']);
  });
});
