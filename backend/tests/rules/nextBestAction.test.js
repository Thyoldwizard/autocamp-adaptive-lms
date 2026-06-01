'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { nextBestAction } = require('../../src/services/rules/nextBestAction');

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

// Amna Malik — data-analytics-bootcamp
// Excel 0.62, SQL 0.20, Python 0.10, Statistics 0.35, Power BI 0.0, ML 0.0
// Progress: Excel complete, SQL in-progress
const AMNA = {
  skillState: [
    { skill_id: 'sk-excel', skill_code: 'excel',      proficiency: 0.62 },
    { skill_id: 'sk-sql',   skill_code: 'sql',         proficiency: 0.20 },
    { skill_id: 'sk-py',    skill_code: 'python',      proficiency: 0.10 },
    { skill_id: 'sk-stat',  skill_code: 'statistics',  proficiency: 0.35 },
    { skill_id: 'sk-pbi',   skill_code: 'power_bi',    proficiency: 0.00 },
    { skill_id: 'sk-ml',    skill_code: 'ml',          proficiency: 0.00 },
  ],
  modules: [
    { id: 'mod-excel', name: 'Excel Fundamentals',      skill_ids: ['sk-excel'] },
    { id: 'mod-sql',   name: 'SQL for Data Analysis',   skill_ids: ['sk-sql'] },
    { id: 'mod-py',    name: 'Python for Data Analysis', skill_ids: ['sk-py', 'sk-stat'] },
    { id: 'mod-pbi',   name: 'Power BI Essentials',     skill_ids: ['sk-pbi'] },
  ],
  progress: [
    { module_id: 'mod-excel', status: 'completed'  },
    { module_id: 'mod-sql',   status: 'in_progress' },
  ],
};

// Bilal Ahmed — ai-bootcamp
// Python 0.85, ML 0.75, Statistics 0.72 (mastered), Deep Learning 0.30, NLP 0.20
// CV/GenAI/LangChain/MLOps 0.0 (not yet started)
// Progress: Python Refresher complete, ML Foundations complete, Deep Learning in-progress
const BILAL = {
  skillState: [
    { skill_id: 'sk-bpy',  skill_code: 'python',       proficiency: 0.85 },
    { skill_id: 'sk-bml',  skill_code: 'ml',            proficiency: 0.75 },
    { skill_id: 'sk-bst',  skill_code: 'statistics',    proficiency: 0.72 },
    { skill_id: 'sk-bdl',  skill_code: 'deep_learning', proficiency: 0.30 },
    { skill_id: 'sk-bnlp', skill_code: 'nlp',           proficiency: 0.20 },
    { skill_id: 'sk-bcv',  skill_code: 'cv',            proficiency: 0.00 },
    { skill_id: 'sk-bga',  skill_code: 'generative_ai', proficiency: 0.00 },
    { skill_id: 'sk-blc',  skill_code: 'langchain',     proficiency: 0.00 },
    { skill_id: 'sk-bops', skill_code: 'mlops',         proficiency: 0.00 },
  ],
  modules: [
    { id: 'mod-bpy',  name: 'Python Refresher',  skill_ids: ['sk-bpy'] },
    { id: 'mod-bml',  name: 'ML Foundations',     skill_ids: ['sk-bml', 'sk-bst'] },
    { id: 'mod-bdl',  name: 'Deep Learning',      skill_ids: ['sk-bdl', 'sk-bml'] },
    { id: 'mod-bnlp', name: 'NLP Fundamentals',   skill_ids: ['sk-bnlp'] },
    { id: 'mod-bga',  name: 'Generative AI',       skill_ids: ['sk-bga', 'sk-blc'] },
  ],
  progress: [
    { module_id: 'mod-bpy', status: 'completed'  },
    { module_id: 'mod-bml', status: 'completed'  },
    { module_id: 'mod-bdl', status: 'in_progress' },
  ],
};

// Sadia Hussain — automation-with-ai-bootcamp
// Excel 0.65, Python 0.50, GenAI 0.30, NLP 0.20, LangChain 0.15
// Progress: Python Auto, Excel Auto, No-Code all complete; Prompt Eng in-progress
const SADIA = {
  skillState: [
    { skill_id: 'sk-sexcel', skill_code: 'excel',         proficiency: 0.65 },
    { skill_id: 'sk-spy',    skill_code: 'python',         proficiency: 0.50 },
    { skill_id: 'sk-sga',    skill_code: 'generative_ai',  proficiency: 0.30 },
    { skill_id: 'sk-snlp',   skill_code: 'nlp',            proficiency: 0.20 },
    { skill_id: 'sk-slc',    skill_code: 'langchain',      proficiency: 0.15 },
  ],
  modules: [
    { id: 'mod-spy',  name: 'Python for Automation',  skill_ids: ['sk-spy'] },
    { id: 'mod-sex',  name: 'Excel Automation',        skill_ids: ['sk-sexcel'] },
    { id: 'mod-snc',  name: 'No-Code AI Tools',        skill_ids: ['sk-sga'] },
    { id: 'mod-spe',  name: 'Prompt Engineering',      skill_ids: ['sk-sga', 'sk-snlp'] },
    { id: 'mod-slc',  name: 'LangChain Automation',    skill_ids: ['sk-slc', 'sk-snlp'] },
  ],
  progress: [
    { module_id: 'mod-spy', status: 'completed'  },
    { module_id: 'mod-sex', status: 'completed'  },
    { module_id: 'mod-snc', status: 'completed'  },
    { module_id: 'mod-spe', status: 'in_progress' },
  ],
};

// ---------------------------------------------------------------------------
// Tests — Amna
// ---------------------------------------------------------------------------
describe('nextBestAction — Amna (weak SQL + Python)', () => {
  test('returns SQL for Data Analysis — in-progress boost beats larger raw Python gap', () => {
    // SQL in-progress: gap 0.50 + 0.30 boost = 0.80
    // Python for DA:   gap 0.60 (no boost)
    const result = nextBestAction(AMNA);

    assert.ok(result, 'result is not null');
    assert.equal(result.moduleId,   'mod-sql');
    assert.equal(result.moduleName, 'SQL for Data Analysis');
    assert.equal(result.skillGap,   0.50); // 0.7 - 0.20
    assert.match(result.reason, /sql/i);
    assert.match(result.reason, /20%/);
  });

  test('completed modules are never returned', () => {
    const result = nextBestAction(AMNA);
    assert.notEqual(result?.moduleId, 'mod-excel');
  });

  test('zero-proficiency Power BI module is excluded — learner has not started it', () => {
    const result = nextBestAction(AMNA);
    assert.notEqual(result?.moduleId, 'mod-pbi');
  });
});

// ---------------------------------------------------------------------------
// Tests — Bilal
// ---------------------------------------------------------------------------
describe('nextBestAction — Bilal (strong foundations, weak deep learning)', () => {
  test('returns Deep Learning — in-progress boost beats larger raw NLP gap', () => {
    // Deep Learning in-progress: gap 0.40 + 0.30 boost = 0.70
    // NLP:                        gap 0.50 (no boost)
    const result = nextBestAction(BILAL);

    assert.ok(result, 'result is not null');
    assert.equal(result.moduleId,   'mod-bdl');
    assert.equal(result.moduleName, 'Deep Learning');
    assert.equal(result.skillGap,   0.40);
    assert.match(result.reason, /deep_learning/i);
    assert.match(result.reason, /30%/);
  });

  test('Generative AI module is excluded — all covered skills are at 0.0', () => {
    const result = nextBestAction(BILAL);
    assert.notEqual(result?.moduleId, 'mod-bga');
  });

  test('mastered modules (Python Refresher, ML Foundations) are not returned', () => {
    const result = nextBestAction(BILAL);
    assert.notEqual(result?.moduleId, 'mod-bpy');
    assert.notEqual(result?.moduleId, 'mod-bml');
  });
});

// ---------------------------------------------------------------------------
// Tests — Sadia
// ---------------------------------------------------------------------------
describe('nextBestAction — Sadia (automation bootcamp, multiple weak skills)', () => {
  test('returns Prompt Engineering — in-progress module with NLP driving the gap', () => {
    // Prompt Eng in-progress: NLP gap 0.50 + 0.30 boost = 0.80
    // LangChain Automation:   LangChain gap 0.55 (no boost)
    const result = nextBestAction(SADIA);

    assert.ok(result, 'result is not null');
    assert.equal(result.moduleId,   'mod-spe');
    assert.equal(result.moduleName, 'Prompt Engineering');
    assert.equal(result.skillGap,   0.50);
    assert.match(result.reason, /nlp/i);
    assert.match(result.reason, /20%/);
  });

  test('driving skill is nlp (lower proficiency than generative_ai)', () => {
    // NLP 0.20 < GenAI 0.30, so nlp drives even though the module covers both
    const result = nextBestAction(SADIA);
    assert.match(result.reason, /nlp/i);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('nextBestAction — edge cases', () => {
  test('returns null when all modules are completed', () => {
    const allComplete = {
      skillState: [{ skill_id: 'sk-x', skill_code: 'sql', proficiency: 0.20 }],
      modules:    [{ id: 'mod-x', name: 'SQL', skill_ids: ['sk-x'] }],
      progress:   [{ module_id: 'mod-x', status: 'completed' }],
    };
    assert.equal(nextBestAction(allComplete), null);
  });

  test('returns null when skillState is empty', () => {
    assert.equal(
      nextBestAction({ skillState: [], modules: AMNA.modules, progress: AMNA.progress }),
      null
    );
  });

  test('returns null when all skills above threshold — no active gaps', () => {
    const allMastered = {
      skillState: [{ skill_id: 'sk-y', skill_code: 'python', proficiency: 0.95 }],
      modules:    [{ id: 'mod-y', name: 'Python', skill_ids: ['sk-y'] }],
      progress:   [],
    };
    assert.equal(nextBestAction(allMastered), null);
  });

  test('returns null when all non-completed modules cover only 0-proficiency skills', () => {
    const onlyFuture = {
      skillState: [{ skill_id: 'sk-z', skill_code: 'genai', proficiency: 0.00 }],
      modules:    [{ id: 'mod-z', name: 'GenAI', skill_ids: ['sk-z'] }],
      progress:   [],
    };
    assert.equal(nextBestAction(onlyFuture), null);
  });
});
