export const demoInstructorOverview = {
  cohorts: [
    {
      cohort: 'da-2026-spring',
      totalLearners: 4,
      averageGoalProgress: 64,
      atRiskCounts: { low: 1, medium: 2, high: 1, critical: 0 },
      learners: [
        {
          learnerId: 'demo-amna',
          name: 'Amna Malik',
          atRisk: { level: 'medium', score: 42, reasons: ['SQL practice is moving slower than expected.'] },
          goalProgress: { percentage: 58, onTrack: false },
          nextBestAction: {
            moduleName: 'SQL Joins Practice Set',
            reason: 'Rebuild confidence on joins before moving deeper into analytics projects.',
          },
        },
        {
          learnerId: 'demo-bilal',
          name: 'Bilal Ahmed',
          atRisk: { level: 'low', score: 12, reasons: [] },
          goalProgress: { percentage: 78, onTrack: true },
          nextBestAction: {
            moduleName: 'Deep Learning Foundations',
            reason: 'Strong foundations, ready for applied model evaluation work.',
          },
        },
        {
          learnerId: 'demo-sadia',
          name: 'Sadia Hussain',
          atRisk: { level: 'high', score: 71, reasons: ['Low scores in prompt engineering and no-code AI tools.'] },
          goalProgress: { percentage: 41, onTrack: false },
          nextBestAction: {
            moduleName: 'Prompt Engineering Retry Lab',
            reason: 'Needs a focused retry before automation workflows become reliable.',
          },
        },
      ],
    },
  ],
};

export const demoInstructorAtRisk = {
  cohorts: [
    {
      cohort: 'da-2026-spring',
      totalLearners: 2,
      requiresAction: true,
      atRiskCounts: { low: 0, medium: 1, high: 1, critical: 0 },
      learners: demoInstructorOverview.cohorts[0].learners.filter((learner) =>
        ['medium', 'high', 'critical'].includes(learner.atRisk.level),
      ),
    },
  ],
};

export const demoInstructorHeatmap = {
  cohorts: [
    {
      cohort: 'da-2026-spring',
      skills: [
        {
          skillId: 'sql',
          skillCode: 'sql',
          skillName: 'SQL',
          averageProficiency: 0.38,
          learnersStruggling: 2,
          learnersStrong: 1,
        },
        {
          skillId: 'prompt_engineering',
          skillCode: 'prompt_engineering',
          skillName: 'Prompt Engineering',
          averageProficiency: 0.46,
          learnersStruggling: 1,
          learnersStrong: 1,
        },
        {
          skillId: 'python',
          skillCode: 'python',
          skillName: 'Python',
          averageProficiency: 0.62,
          learnersStruggling: 1,
          learnersStrong: 2,
        },
      ],
    },
  ],
};

export const demoStudentDashboard = {
  learner: {
    name: 'Amna Malik',
    program: 'data-analytics-bootcamp',
    cohort: 'da-2026-spring',
    goal: 'Get a data analyst job within 6 months.',
    enrolledAt: '2026-05-02T00:00:00.000Z',
  },
  journey: {
    currentModule: {
      moduleName: 'SQL for Data Analysis',
      completionPct: 35,
      status: 'stalled',
    },
    nextBestAction: {
      moduleCode: 'sql_joins',
      moduleName: 'SQL Joins Practice Set',
      reason: 'Your learner model shows SQL joins as the highest leverage area this week.',
    },
    progressSummary: { completed: 1, inProgress: 1, notStarted: 4 },
  },
  skills: {
    strong: [
      { skillId: 'excel', code: 'excel', name: 'Excel', domain: 'tools', proficiency: 0.72 },
    ],
    developing: [
      { skillId: 'statistics', code: 'statistics', name: 'Statistics', domain: 'analytics', proficiency: 0.46 },
    ],
    weak: [
      { skillId: 'sql', code: 'sql', name: 'SQL', domain: 'data', proficiency: 0.28 },
      { skillId: 'python', code: 'python', name: 'Python', domain: 'programming', proficiency: 0.18 },
    ],
    notStarted: [
      { skillId: 'power_bi', code: 'power_bi', name: 'Power BI', domain: 'tools', proficiency: 0 },
    ],
  },
  atRisk: {
    level: 'medium',
    reasons: ['SQL module is stalled and one deadline was missed.'],
  },
  goalProgress: {
    percentage: 58,
    onTrack: false,
    strongAreas: ['Excel'],
    weakAreas: ['SQL', 'Python'],
  },
  recentActivity: [
    {
      role: 'user',
      content: 'I understand INNER JOIN but LEFT JOIN still confuses me.',
      createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    },
    {
      role: 'assistant',
      content: 'Think of LEFT JOIN as keeping every row from the first table, then matching what it can from the second.',
      createdAt: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
    },
  ],
};

export const demoSkills = {
  strong: demoStudentDashboard.skills.strong,
  developing: demoStudentDashboard.skills.developing,
  weak: [...demoStudentDashboard.skills.weak, ...demoStudentDashboard.skills.notStarted],
};

export const demoCheckin = {
  sessionId: 'demo-session',
  skillCode: 'sql',
  skillName: 'SQL',
  questions: [
    {
      question: 'Which join keeps all rows from the left table?',
      options: ['INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'FULL JOIN'],
    },
    {
      question: 'What does GROUP BY usually pair with?',
      options: ['Aggregate functions', 'CSS selectors', 'Image uploads', 'JWT headers'],
    },
    {
      question: 'Which clause filters grouped results?',
      options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'],
    },
    {
      question: 'What should you check first when a join duplicates rows?',
      options: ['Table relationship keys', 'Font size', 'Browser cache', 'Button color'],
    },
  ],
  answers: [1, 0, 1, 0],
};
