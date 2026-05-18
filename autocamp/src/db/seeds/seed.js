require('../../config/env');
const supabase = require('../../config/supabase');

// ─── SKILLS ───────────────────────────────────────────────────────────────────

const SKILLS = [
  { code: 'sql',            name: 'SQL & Databases',             domain: 'sql',    description: 'Querying, joins, aggregation, CTEs, window functions, database design' },
  { code: 'python',         name: 'Python Programming',          domain: 'python', description: 'Python syntax, data structures, pandas, numpy, scripting, OOP' },
  { code: 'excel',          name: 'Excel & Spreadsheets',        domain: 'tools',  description: 'Formulas, pivot tables, charts, data cleaning, VLOOKUP, Power Query' },
  { code: 'power_bi',       name: 'Power BI',                    domain: 'tools',  description: 'DAX, data modelling, relationships, interactive dashboards and reports' },
  { code: 'statistics',     name: 'Statistics & Probability',    domain: 'stats',  description: 'Descriptive stats, distributions, hypothesis testing, regression' },
  { code: 'machine_learning', name: 'Machine Learning',          domain: 'ml',     description: 'Supervised/unsupervised learning, sklearn, model evaluation and tuning' },
  { code: 'deep_learning',  name: 'Deep Learning',               domain: 'ml',     description: 'Neural networks, backpropagation, CNNs, RNNs, training dynamics, PyTorch' },
  { code: 'nlp',            name: 'Natural Language Processing', domain: 'ml',     description: 'Text processing, transformers, BERT, embeddings, text classification' },
  { code: 'computer_vision', name: 'Computer Vision',            domain: 'ml',     description: 'Image classification, object detection, segmentation, transfer learning' },
  { code: 'langchain',      name: 'LangChain & AI Agents',       domain: 'ml',     description: 'LangChain agents, tools, memory, RAG pipelines, multi-agent systems' },
  { code: 'generative_ai',  name: 'Generative AI & Prompting',   domain: 'ml',     description: 'LLM APIs, prompt engineering, RAG, structured outputs, LLM evaluation' },
  { code: 'mlops',          name: 'MLOps & Deployment',          domain: 'ml',     description: 'FastAPI, Docker, model serving, CI/CD for ML, drift monitoring' },
];

// ─── MODULES ──────────────────────────────────────────────────────────────────
// skillCodes are resolved to UUIDs after skills are seeded.

const MODULE_DEFS = [
  // ── Data Analytics Bootcamp ────────────────────────────────────────────────
  {
    code: 'da-excel-fundamentals',
    name: 'Excel Fundamentals',
    program: 'data-analytics-bootcamp',
    sequence: 1,
    skillCodes: ['excel', 'statistics'],
    description: 'Core Excel skills: formulas, pivot tables, charts, data cleaning for analysts',
  },
  {
    code: 'da-sql-analysis',
    name: 'SQL for Data Analysis',
    program: 'data-analytics-bootcamp',
    sequence: 2,
    skillCodes: ['sql'],
    description: 'SELECT, JOINs, GROUP BY, subqueries, CTEs, and window functions',
  },
  {
    code: 'da-python-analytics',
    name: 'Python for Analytics',
    program: 'data-analytics-bootcamp',
    sequence: 3,
    skillCodes: ['python', 'statistics'],
    description: 'pandas, numpy, matplotlib, seaborn, and exploratory data analysis',
  },
  {
    code: 'da-powerbi',
    name: 'Power BI Dashboards',
    program: 'data-analytics-bootcamp',
    sequence: 4,
    skillCodes: ['power_bi', 'excel'],
    description: 'Data modelling, DAX measures, and publishing interactive reports',
  },
  {
    code: 'da-ml-basics',
    name: 'Machine Learning Basics',
    program: 'data-analytics-bootcamp',
    sequence: 5,
    skillCodes: ['machine_learning', 'statistics', 'python'],
    description: 'Regression, classification, clustering with sklearn — intuition to code',
  },
  {
    code: 'da-capstone',
    name: 'Capstone Project',
    program: 'data-analytics-bootcamp',
    sequence: 6,
    skillCodes: ['sql', 'python', 'power_bi', 'machine_learning'],
    description: 'End-to-end analytics project on a real-world dataset with stakeholder presentation',
  },

  // ── AI Bootcamp ───────────────────────────────────────────────────────────
  {
    code: 'ai-python-refresher',
    name: 'Python Refresher',
    program: 'ai-bootcamp',
    sequence: 1,
    skillCodes: ['python'],
    description: 'OOP, comprehensions, file I/O, virtual environments, and key ML libraries',
  },
  {
    code: 'ai-ml-foundations',
    name: 'ML Foundations',
    program: 'ai-bootcamp',
    sequence: 2,
    skillCodes: ['machine_learning', 'statistics', 'python'],
    description: 'Supervised learning, cross-validation, feature engineering, model selection',
  },
  {
    code: 'ai-deep-learning',
    name: 'Deep Learning',
    program: 'ai-bootcamp',
    sequence: 3,
    skillCodes: ['deep_learning', 'python'],
    description: 'ANNs, CNNs, RNNs, training dynamics, regularisation, and PyTorch hands-on',
  },
  {
    code: 'ai-nlp-llms',
    name: 'NLP and LLMs',
    program: 'ai-bootcamp',
    sequence: 4,
    skillCodes: ['nlp', 'python', 'deep_learning'],
    description: 'Transformers, BERT, GPT architecture, embeddings, and fine-tuning',
  },
  {
    code: 'ai-computer-vision',
    name: 'Computer Vision',
    program: 'ai-bootcamp',
    sequence: 5,
    skillCodes: ['computer_vision', 'deep_learning', 'python'],
    description: 'Image classification, object detection, transfer learning, and YOLO',
  },
  {
    code: 'ai-generative-ai',
    name: 'Generative AI and Prompting',
    program: 'ai-bootcamp',
    sequence: 6,
    skillCodes: ['generative_ai', 'nlp'],
    description: 'LLM APIs, prompt engineering, RAG architecture, and LLM evaluation',
  },
  {
    code: 'ai-langchain',
    name: 'AI Agents with LangChain',
    program: 'ai-bootcamp',
    sequence: 7,
    skillCodes: ['langchain', 'generative_ai', 'python'],
    description: 'LangChain agents, tools, memory, RAG pipelines, multi-agent orchestration',
  },
  {
    code: 'ai-mlops',
    name: 'MLOps and Deployment',
    program: 'ai-bootcamp',
    sequence: 8,
    skillCodes: ['mlops', 'python'],
    description: 'FastAPI, Docker, model serving, CI/CD pipelines, and drift monitoring',
  },
  {
    code: 'ai-capstone',
    name: 'Capstone Project',
    program: 'ai-bootcamp',
    sequence: 9,
    skillCodes: ['python', 'machine_learning', 'deep_learning', 'mlops'],
    description: 'Production-grade AI project from ideation to deployment and monitoring',
  },

  // ── Automation with AI Bootcamp ───────────────────────────────────────────
  {
    code: 'auto-python',
    name: 'Python for Automation',
    program: 'automation-with-ai-bootcamp',
    sequence: 1,
    skillCodes: ['python'],
    description: 'Python scripting for automation: files, APIs, scheduling, error handling',
  },
  {
    code: 'auto-excel',
    name: 'Excel Automation',
    program: 'automation-with-ai-bootcamp',
    sequence: 2,
    skillCodes: ['excel', 'python'],
    description: 'Automating Excel workflows with openpyxl, xlwings, and report generation',
  },
  {
    code: 'auto-nocode-ai',
    name: 'No-Code AI Tools',
    program: 'automation-with-ai-bootcamp',
    sequence: 3,
    skillCodes: ['generative_ai'],
    description: 'ChatGPT, Microsoft Copilot, Make.com, Zapier for workplace automation',
  },
  {
    code: 'auto-prompt-engineering',
    name: 'Prompt Engineering',
    program: 'automation-with-ai-bootcamp',
    sequence: 4,
    skillCodes: ['generative_ai', 'nlp'],
    description: 'Prompting strategies, chain-of-thought, few-shot, and structured JSON output',
  },
  {
    code: 'auto-ai-agents',
    name: 'AI Agents and Workflows',
    program: 'automation-with-ai-bootcamp',
    sequence: 5,
    skillCodes: ['langchain', 'generative_ai'],
    description: 'Building AI agents and orchestrating multi-step LLM workflows',
  },
  {
    code: 'auto-process-automation',
    name: 'Process Automation with AI',
    program: 'automation-with-ai-bootcamp',
    sequence: 6,
    skillCodes: ['langchain', 'python'],
    description: 'End-to-end business process automation pipelines using LLMs and Python',
  },
  {
    code: 'auto-capstone',
    name: 'Capstone Project',
    program: 'automation-with-ai-bootcamp',
    sequence: 7,
    skillCodes: ['python', 'generative_ai', 'langchain'],
    description: 'Automate a real workplace process from design to live deployment',
  },
];

// Returns an ISO timestamp N days before the current time.
// Used in signal created_at values so they always fall within the 7-day
// recency window when the seed is run, keeping atRiskScore multipliers active.
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

// ─── PERSONA DEFINITIONS ──────────────────────────────────────────────────────

const PERSONAS = [
  // ── Persona 1: Amna Malik ─────────────────────────────────────────────────
  // Non-technical career-changer from finance. Two weeks in. Comfortable with
  // Excel (used it daily at work), struggling hard with SQL and Python.
  // Already missed one SQL assignment deadline.
  {
    email: 'amna.malik@atomcamp.test',
    password: 'AtomCamp2026!',
    learner: {
      name: 'Amna Malik',
      background_type: 'non_technical',
      program: 'data-analytics-bootcamp',
      cohort: 'da-2026-spring',
      enrolled_at: '2026-05-02T09:00:00Z',
      stated_goal: 'Get a data analyst job at a bank or fintech company within 6 months',
    },
    skills: [
      { code: 'excel',           proficiency: 0.620, confidence: 0.700 },
      { code: 'statistics',      proficiency: 0.350, confidence: 0.300 },
      { code: 'sql',             proficiency: 0.200, confidence: 0.150 },
      { code: 'python',          proficiency: 0.100, confidence: 0.100 },
      { code: 'power_bi',        proficiency: 0.000, confidence: 0.000 },
      { code: 'machine_learning', proficiency: 0.000, confidence: 0.000 },
    ],
    progress: [
      {
        moduleCode: 'da-excel-fundamentals',
        status: 'completed',
        completion_pct: 100,
        time_spent_minutes: 280,
        attempts: 1,
        last_score: 82,
        started_at: '2026-05-02T09:30:00Z',
        completed_at: '2026-05-07T18:00:00Z',
      },
      {
        moduleCode: 'da-sql-analysis',
        status: 'stalled',
        completion_pct: 35,
        time_spent_minutes: 145,
        attempts: 2,
        last_score: 48,
        started_at: '2026-05-08T10:00:00Z',
        completed_at: null,
      },
    ],
    signals: [
      {
        signal_type: 'missed_deadline',
        severity: 'medium',
        source: 'system',
        context: {
          module_code: 'da-sql-analysis',
          assignment: 'SQL Joins Practice Set',
          deadline_missed_by_days: 3,
        },
        created_at: '2026-05-14T08:00:00Z',
      },
    ],
    messages: [
      {
        role: 'user',
        content: "I keep failing the SQL joins quiz. I just don't understand how INNER JOIN and LEFT JOIN are different. Can you help me?",
        created_at: '2026-05-15T14:22:00Z',
        moduleCode: 'da-sql-analysis',
        skillCode: 'sql',
      },
      {
        role: 'assistant',
        content: "Joins are one of the trickiest parts of SQL when you're starting out — let's break it down simply.\n\nThink of two tables: **Customers** and **Orders**.\n\n**INNER JOIN** only returns rows that have a match in *both* tables. A customer with no orders won't appear. An order with no matching customer won't appear either.\n\n**LEFT JOIN** keeps *all* rows from the left table and fills in NULL wherever there's no match on the right. Every customer appears — even those with zero orders.\n\nMental model: INNER = intersection. LEFT = keep everything on the left.\n\nTry this on the practice dataset:\n```sql\nSELECT c.name, o.order_date\nFROM customers c\nLEFT JOIN orders o ON c.id = o.customer_id;\n```\nYou'll see NULL in `order_date` for customers with no orders. Replace LEFT with INNER and those rows vanish.\n\nWhich part is catching you — writing the ON condition, or making sense of the output?",
        created_at: '2026-05-15T14:23:00Z',
        moduleCode: 'da-sql-analysis',
        skillCode: 'sql',
      },
    ],
  },

  // ── Persona 2: Bilal Ahmed ────────────────────────────────────────────────
  // STEM graduate (CS background). Six weeks into the AI Bootcamp.
  // Breezes through Python and classical ML. Hitting a wall on deep learning —
  // loss plateaus, confused by training dynamics. No struggle signals yet.
  {
    email: 'bilal.ahmed@atomcamp.test',
    password: 'AtomCamp2026!',
    learner: {
      name: 'Bilal Ahmed',
      background_type: 'stem_grad',
      program: 'ai-bootcamp',
      cohort: 'ai-2026-spring',
      enrolled_at: '2026-04-04T09:00:00Z',
      stated_goal: 'Build and deploy production ML models and get hired as an ML engineer at a top tech company',
    },
    skills: [
      { code: 'python',          proficiency: 0.850, confidence: 0.900 },
      { code: 'statistics',      proficiency: 0.720, confidence: 0.750 },
      { code: 'machine_learning', proficiency: 0.750, confidence: 0.800 },
      { code: 'deep_learning',   proficiency: 0.300, confidence: 0.250 },
      { code: 'nlp',             proficiency: 0.200, confidence: 0.200 },
      { code: 'computer_vision', proficiency: 0.000, confidence: 0.000 },
      { code: 'generative_ai',   proficiency: 0.000, confidence: 0.000 },
      { code: 'langchain',       proficiency: 0.000, confidence: 0.000 },
      { code: 'mlops',           proficiency: 0.000, confidence: 0.000 },
    ],
    progress: [
      {
        moduleCode: 'ai-python-refresher',
        status: 'completed',
        completion_pct: 100,
        time_spent_minutes: 210,
        attempts: 1,
        last_score: 95,
        started_at: '2026-04-04T10:00:00Z',
        completed_at: '2026-04-09T17:00:00Z',
      },
      {
        moduleCode: 'ai-ml-foundations',
        status: 'completed',
        completion_pct: 100,
        time_spent_minutes: 480,
        attempts: 1,
        last_score: 88,
        started_at: '2026-04-10T09:00:00Z',
        completed_at: '2026-04-20T16:00:00Z',
      },
      {
        moduleCode: 'ai-deep-learning',
        status: 'in_progress',
        completion_pct: 40,
        time_spent_minutes: 310,
        attempts: 3,
        last_score: 62,
        started_at: '2026-04-21T09:00:00Z',
        completed_at: null,
      },
    ],
    signals: [],
    messages: [
      {
        role: 'user',
        content: "My neural network training loss keeps plateauing after epoch 5 and won't go lower. I'm using Adam with lr=0.001. What am I doing wrong?",
        created_at: '2026-05-12T19:45:00Z',
        moduleCode: 'ai-deep-learning',
        skillCode: 'deep_learning',
      },
      {
        role: 'assistant',
        content: "A plateau after a few epochs is a classic training issue — here's a structured checklist:\n\n**1. Learning rate scheduling** — 0.001 is a fine Adam default, but try decaying it when progress stalls:\n```python\nscheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(\n    optimizer, patience=3, factor=0.5, verbose=True\n)\n```\n\n**2. Vanishing gradients** — Deep networks without batch normalisation can die early. Add `nn.BatchNorm1d` after linear layers, and prefer ReLU over Sigmoid in hidden layers.\n\n**3. Data sanity check** — Print a batch and verify labels are correct. Mislabelled data creates a noise floor no architecture can break through.\n\n**4. Model capacity** — Is the network large enough? Temporarily double a hidden layer to see if the plateau is a capacity ceiling.\n\n**5. Overfitting in disguise** — Check your *validation* loss too. If training loss drops but val loss is flat, you're overfitting — not plateauing.\n\nWhat does your val loss curve look like relative to training loss? That one data point usually narrows it down immediately.",
        created_at: '2026-05-12T19:46:00Z',
        moduleCode: 'ai-deep-learning',
        skillCode: 'deep_learning',
      },
    ],
  },

  // ── Persona 3: Sadia Hussain ──────────────────────────────────────────────
  // Working professional (HR manager). Four weeks in. Good attendance and
  // consistent effort, but quiz scores on the last two modules are below
  // threshold — conceptual gap on AI tools and prompt construction.
  {
    email: 'sadia.hussain@atomcamp.test',
    password: 'AtomCamp2026!',
    learner: {
      name: 'Sadia Hussain',
      background_type: 'working_professional',
      program: 'automation-with-ai-bootcamp',
      cohort: 'auto-2026-spring',
      enrolled_at: '2026-04-18T09:00:00Z',
      stated_goal: 'Automate repetitive tasks at my job using AI tools and reduce manual work by at least 50%',
    },
    skills: [
      { code: 'excel',         proficiency: 0.650, confidence: 0.700 },
      { code: 'python',        proficiency: 0.500, confidence: 0.550 },
      { code: 'generative_ai', proficiency: 0.300, confidence: 0.350 },
      { code: 'nlp',           proficiency: 0.200, confidence: 0.250 },
      { code: 'langchain',     proficiency: 0.150, confidence: 0.200 },
    ],
    progress: [
      {
        moduleCode: 'auto-python',
        status: 'completed',
        completion_pct: 100,
        time_spent_minutes: 320,
        attempts: 2,
        last_score: 78,
        started_at: '2026-04-18T10:00:00Z',
        completed_at: '2026-04-24T17:00:00Z',
      },
      {
        moduleCode: 'auto-excel',
        status: 'completed',
        completion_pct: 100,
        time_spent_minutes: 280,
        attempts: 1,
        last_score: 72,
        started_at: '2026-04-25T09:00:00Z',
        completed_at: '2026-05-01T16:00:00Z',
      },
      {
        moduleCode: 'auto-nocode-ai',
        status: 'completed',
        completion_pct: 100,
        time_spent_minutes: 240,
        attempts: 2,
        last_score: 55,
        started_at: '2026-05-02T09:00:00Z',
        completed_at: '2026-05-08T18:00:00Z',
      },
      {
        moduleCode: 'auto-prompt-engineering',
        status: 'in_progress',
        completion_pct: 60,
        time_spent_minutes: 180,
        attempts: 2,
        last_score: 52,
        started_at: '2026-05-10T09:00:00Z',
        completed_at: null,
      },
    ],
    signals: [
      {
        signal_type: 'low_score',
        severity: 'medium',
        source: 'system',
        context: {
          module_code: 'auto-nocode-ai',
          score: 55,
          passing_threshold: 70,
          attempts: 2,
        },
        created_at: daysAgo(3),
      },
      {
        signal_type: 'low_score',
        severity: 'medium',
        source: 'system',
        context: {
          module_code: 'auto-prompt-engineering',
          score: 52,
          passing_threshold: 70,
          attempts: 2,
        },
        created_at: daysAgo(1),
      },
    ],
    messages: [
      {
        role: 'user',
        content: "I'm stuck on the Prompt Engineering exercises. My prompts keep giving vague or wrong outputs. How do I make them more reliable?",
        created_at: '2026-05-14T20:10:00Z',
        moduleCode: 'auto-prompt-engineering',
        skillCode: 'generative_ai',
      },
      {
        role: 'assistant',
        content: "Unreliable outputs almost always trace back to one of three things — let's fix them in order:\n\n**1. Specify the output format explicitly**\nVague prompts get vague answers. Add a format constraint:\n```\nBad:  \"Summarise this email.\"\nGood: \"Summarise this email in exactly 3 bullet points. Each bullet under 20 words. Start each with a verb.\"\n```\n\n**2. Give the model a role and context**\nLLMs perform better when they know who they're playing:\n```\n\"You are an office administrator. Extract the meeting date, attendees, \nand action items from this email. Return JSON with keys: date, attendees (list), actions (list).\"\n```\n\n**3. Use a few-shot example**\nShow one correct input→output pair before your real task:\n```\nExample input:  \"Hi team, let's meet Thursday 3pm. John and Sara please prepare slides.\"\nExample output: {\"date\": \"Thursday 3pm\", \"attendees\": [\"John\", \"Sara\"], \"actions\": [\"prepare slides\"]}\n\nNow extract from this email:\n[paste your email here]\n```\n\nFor workplace automation, always request structured output (JSON) rather than prose — it feeds directly into your next automation step without parsing.\n\nPaste one of your failing prompts and I'll help you rewrite it.",
        created_at: '2026-05-14T20:11:00Z',
        moduleCode: 'auto-prompt-engineering',
        skillCode: 'generative_ai',
      },
    ],
  },
];

const DEMO_INSTRUCTOR = {
  email: 'instructor@atomcamp.test',
  password: 'AtomCamp2026!',
  name: 'Demo Instructor',
  cohorts: ['da-2026-spring', 'ai-2026-spring', 'auto-2026-spring'],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function check(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function findAuthUserByEmail(email) {
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  return users.find((u) => u.email === email) ?? null;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function seed() {
  // 1. Skills
  console.log('── Skills ────────────────────────────────────────────');
  const skillRows = check(
    await supabase.from('skills').upsert(SKILLS, { onConflict: 'code' }).select(),
    'skills upsert',
  );
  const skillId = Object.fromEntries(skillRows.map((s) => [s.code, s.id]));
  console.log(`   ${skillRows.length} skills ready`);

  // 2. Modules
  console.log('── Modules ───────────────────────────────────────────');
  const moduleRows = check(
    await supabase
      .from('modules')
      .upsert(
        MODULE_DEFS.map(({ skillCodes, ...m }) => ({
          ...m,
          skill_ids: skillCodes.map((c) => skillId[c]),
        })),
        { onConflict: 'code' },
      )
      .select(),
    'modules upsert',
  );
  const moduleId = Object.fromEntries(moduleRows.map((m) => [m.code, m.id]));
  console.log(`   ${moduleRows.length} modules ready`);

  // 3. Personas
  for (const persona of PERSONAS) {
    console.log(`\n── ${persona.learner.name} ${'─'.repeat(40 - persona.learner.name.length)}`);

    // Clean up existing user (cascades to learner → all child rows)
    const existing = await findAuthUserByEmail(persona.email);
    if (existing) {
      const { error } = await supabase.auth.admin.deleteUser(existing.id);
      if (error) throw new Error(`deleteUser(${persona.email}): ${error.message}`);
      console.log(`   Removed existing user`);
    }

    // Create auth user
    const { data: { user }, error: createErr } = await supabase.auth.admin.createUser({
      email: persona.email,
      password: persona.password,
      email_confirm: true,
      user_metadata: { name: persona.learner.name },
      app_metadata:  { role: 'student' },
    });
    if (createErr) throw new Error(`createUser(${persona.email}): ${createErr.message}`);
    console.log(`   Auth user: ${user.id}`);

    check(
      await supabase.from('profiles').insert({
        id: user.id,
        role: 'student',
        email: persona.email,
        name: persona.learner.name,
      }),
      'profile insert',
    );
    console.log(`   Profile:   student`);

    // Learner
    const [learner] = check(
      await supabase.from('learners').insert({ ...persona.learner, user_id: user.id }).select(),
      'learner insert',
    );
    console.log(`   Learner:   ${learner.id}`);

    // skill_state
    const skillStateRows = persona.skills.map((s) => ({
      learner_id: learner.id,
      skill_id: skillId[s.code],
      proficiency: s.proficiency,
      confidence: s.confidence,
      last_assessed_at: persona.learner.enrolled_at,
    }));
    check(await supabase.from('skill_state').insert(skillStateRows), 'skill_state');
    console.log(`   skill_state: ${skillStateRows.length} rows`);

    // progress
    const progressRows = persona.progress.map(({ moduleCode, ...rest }) => ({
      ...rest,
      learner_id: learner.id,
      module_id: moduleId[moduleCode],
    }));
    check(await supabase.from('progress').insert(progressRows), 'progress');
    console.log(`   progress:    ${progressRows.length} rows`);

    // struggle_signals
    if (persona.signals.length > 0) {
      const signalRows = persona.signals.map((s) => ({ ...s, learner_id: learner.id }));
      check(await supabase.from('struggle_signals').insert(signalRows), 'struggle_signals');
      console.log(`   signals:     ${signalRows.length} rows`);
    }

    // companion_messages
    const msgRows = persona.messages.map(({ moduleCode, skillCode, ...rest }) => ({
      ...rest,
      learner_id: learner.id,
      module_id: moduleCode ? moduleId[moduleCode] : null,
      skill_id:  skillCode  ? skillId[skillCode]   : null,
    }));
    check(await supabase.from('companion_messages').insert(msgRows), 'companion_messages');
    console.log(`   messages:    ${msgRows.length} rows`);
  }

  // 4. Demo instructor
  console.log(`\n── ${DEMO_INSTRUCTOR.name} ${'─'.repeat(40 - DEMO_INSTRUCTOR.name.length)}`);

  const existingInstructor = await findAuthUserByEmail(DEMO_INSTRUCTOR.email);
  if (existingInstructor) {
    const { error } = await supabase.auth.admin.deleteUser(existingInstructor.id);
    if (error) throw new Error(`deleteUser(${DEMO_INSTRUCTOR.email}): ${error.message}`);
    console.log(`   Removed existing user`);
  }

  const { data: { user: instructor }, error: instructorCreateErr } =
    await supabase.auth.admin.createUser({
      email: DEMO_INSTRUCTOR.email,
      password: DEMO_INSTRUCTOR.password,
      email_confirm: true,
      user_metadata: { name: DEMO_INSTRUCTOR.name },
      app_metadata:  { role: 'instructor' },
    });

  if (instructorCreateErr) {
    throw new Error(`createUser(${DEMO_INSTRUCTOR.email}): ${instructorCreateErr.message}`);
  }
  console.log(`   Auth user: ${instructor.id}`);

  check(
    await supabase.from('profiles').insert({
      id: instructor.id,
      role: 'instructor',
      email: DEMO_INSTRUCTOR.email,
      name: DEMO_INSTRUCTOR.name,
    }),
    'instructor profile insert',
  );
  console.log(`   Profile:   instructor`);

  const cohortRows = DEMO_INSTRUCTOR.cohorts.map((cohort) => ({
    instructor_id: instructor.id,
    cohort,
  }));
  check(await supabase.from('instructor_cohorts').insert(cohortRows), 'instructor_cohorts');
  console.log(`   cohorts:   ${DEMO_INSTRUCTOR.cohorts.join(', ')}`);

  // 5. Demo credentials
  console.log('\n── Demo credentials ───────────────────────────────────');
  console.log(`   Instructor: ${DEMO_INSTRUCTOR.email} / ${DEMO_INSTRUCTOR.password}`);
  for (const persona of PERSONAS) {
    console.log(`   Student:    ${persona.email} / ${persona.password}`);
  }

  // 6. Row counts
  console.log('\n── Row counts ────────────────────────────────────────');
  const tables = [
    'skills', 'modules', 'profiles', 'instructor_cohorts', 'learners',
    'skill_state', 'progress', 'struggle_signals', 'outcomes', 'companion_messages',
  ];
  for (const table of tables) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`   ${table.padEnd(24)} ${count}`);
  }
}

seed().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
