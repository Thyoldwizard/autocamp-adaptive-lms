'use strict';

/**
 * checkin.prompt.js
 *
 * Builds the system prompt and user message for generating MCQ check-in questions.
 *
 * The LLM is instructed to return STRICT JSON — an array of 4 MCQ objects.
 * A few-shot example is embedded so the model knows the exact shape.
 *
 * Exported:
 *   buildCheckinPrompt({ learner, skill, proficiency, backgroundType })
 *     → { system: string, messages: Array<{role, content}> }
 *
 *   FALLBACK_QUESTIONS[skillCode] → hardcoded 2-question fallback
 */

// ─── Hardcoded fallback questions (used when LLM fails or returns bad JSON) ──

const FALLBACK_QUESTIONS = {
  sql: [
    {
      question: 'Which SQL clause is used to filter rows before grouping?',
      options: ['HAVING', 'WHERE', 'GROUP BY', 'ORDER BY'],
      correctIndex: 1,
      explanation: 'WHERE filters individual rows before GROUP BY creates aggregates.',
    },
    {
      question: 'What does an INNER JOIN return?',
      options: [
        'All rows from the left table',
        'All rows from both tables',
        'Only rows with matching values in both tables',
        'All rows from the right table',
      ],
      correctIndex: 2,
      explanation: 'An INNER JOIN keeps only rows where the join keys match in both tables.',
    },
  ],
  python: [
    {
      question: 'Which Python data structure is mutable and ordered?',
      options: ['tuple', 'list', 'string', 'frozenset'],
      correctIndex: 1,
      explanation: 'Lists preserve order and can be changed after creation.',
    },
    {
      question: 'What does the len() function return when called on a dictionary?',
      options: [
        'The sum of all values',
        'The number of key-value pairs',
        'The list of all keys',
        'The maximum value',
      ],
      correctIndex: 1,
      explanation: 'For dictionaries, len() counts the number of stored key-value pairs.',
    },
  ],
  statistics: [
    {
      question: 'Which measure of central tendency is most affected by outliers?',
      options: ['Median', 'Mode', 'Mean', 'Range'],
      correctIndex: 2,
      explanation: 'The mean uses every value, so extreme values pull it up or down.',
    },
    {
      question: 'A p-value of 0.03 at α = 0.05 means:',
      options: [
        'Fail to reject the null hypothesis',
        'Reject the null hypothesis',
        'The result is not statistically significant',
        'The sample size is too small',
      ],
      correctIndex: 1,
      explanation: 'A p-value below the alpha threshold is considered statistically significant.',
    },
  ],
  excel: [
    {
      question: 'Which Excel function looks up a value in the first column and returns a value from another column?',
      options: ['INDEX', 'MATCH', 'VLOOKUP', 'SUMIF'],
      correctIndex: 2,
      explanation: 'VLOOKUP searches the first column and returns a value from another column in the same row.',
    },
    {
      question: 'What does a pivot table do?',
      options: [
        'Sorts data alphabetically',
        'Summarises and aggregates data from a larger table',
        'Creates charts automatically',
        'Removes duplicate rows',
      ],
      correctIndex: 1,
      explanation: 'Pivot tables summarize larger tables by grouping and aggregating fields.',
    },
  ],
  ml: [
    {
      question: 'Which of the following is a supervised learning task?',
      options: ['K-means clustering', 'Principal Component Analysis', 'Linear regression', 't-SNE'],
      correctIndex: 2,
      explanation: 'Linear regression learns from labeled examples to predict a numeric target.',
    },
    {
      question: 'What does overfitting mean?',
      options: [
        'The model performs well on training data but poorly on unseen data',
        'The model performs poorly on both training and test data',
        'The model has too few parameters',
        'The training data is too small',
      ],
      correctIndex: 0,
      explanation: 'Overfitting means the model memorized training patterns that do not generalize well.',
    },
  ],
  'power-bi': [
    {
      question: 'In Power BI, what is DAX used for?',
      options: [
        'Connecting to data sources',
        'Creating calculated columns and measures',
        'Designing report layouts',
        'Scheduling data refreshes',
      ],
      correctIndex: 1,
      explanation: 'DAX is Power BI’s formula language for measures and calculated fields.',
    },
    {
      question: 'Which Power BI visual is best for showing trends over time?',
      options: ['Pie chart', 'Card', 'Line chart', 'Treemap'],
      correctIndex: 2,
      explanation: 'Line charts make changes across time easy to compare.',
    },
  ],
  'deep-learning': [
    {
      question: 'Which activation function is most commonly used in hidden layers of deep neural networks?',
      options: ['Sigmoid', 'ReLU', 'Step', 'Linear'],
      correctIndex: 1,
      explanation: 'ReLU is widely used because it is simple and helps deep networks train efficiently.',
    },
    {
      question: 'What is the purpose of a loss function?',
      options: [
        'To initialise weights',
        'To measure how far predictions are from actual values',
        'To prevent overfitting',
        'To normalise input data',
      ],
      correctIndex: 1,
      explanation: 'The loss function quantifies prediction error so training can reduce it.',
    },
  ],
  nlp: [
    {
      question: 'What does TF-IDF stand for?',
      options: [
        'Term Frequency — Inverse Document Frequency',
        'Text Feature — Indexed Data Format',
        'Token Frequency — Integrated Data Filter',
        'Term Form — Internal Document Framework',
      ],
      correctIndex: 0,
      explanation: 'TF-IDF weights words by how common they are in a document and how rare they are across documents.',
    },
    {
      question: 'Which NLP task converts spoken language to text?',
      options: ['Named Entity Recognition', 'Sentiment Analysis', 'Speech Recognition', 'Machine Translation'],
      correctIndex: 2,
      explanation: 'Speech recognition is the NLP/audio task of transcribing spoken language into text.',
    },
  ],
  'generative-ai': [
    {
      question: 'What is a "prompt" in the context of generative AI?',
      options: [
        'A type of neural network architecture',
        'An input instruction or question given to an AI model',
        'A training dataset',
        'A model evaluation metric',
      ],
      correctIndex: 1,
      explanation: 'A prompt is the instruction or input the model uses to generate a response.',
    },
    {
      question: 'Which technique reduces hallucination in LLM responses?',
      options: [
        'Increasing temperature',
        'Retrieval-Augmented Generation (RAG)',
        'Using a larger context window only',
        'Removing system prompts',
      ],
      correctIndex: 1,
      explanation: 'RAG grounds generation in retrieved sources, reducing unsupported answers.',
    },
  ],
  langchain: [
    {
      question: 'What is a "chain" in LangChain?',
      options: [
        'A blockchain-based data structure',
        'A sequence of calls to LLMs, tools, or other components',
        'A type of prompt template',
        'A memory storage mechanism',
      ],
      correctIndex: 1,
      explanation: 'A chain coordinates multiple model, prompt, parser, or tool calls in sequence.',
    },
    {
      question: 'What does a LangChain "agent" do?',
      options: [
        'Trains a model from scratch',
        'Dynamically decides which tools to call based on user input',
        'Stores conversation history',
        'Generates embeddings',
      ],
      correctIndex: 1,
      explanation: 'Agents choose tools or actions dynamically based on the task and context.',
    },
  ],
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Build the system prompt and user message for check-in question generation.
 *
 * @param {{
 *   learner:         { name, background_type, program },
 *   skill:           { code, name, domain },
 *   proficiency:     number  (0–1),
 *   backgroundType:  string,
 * }} ctx
 * @returns {{ system: string, messages: Array<{role: string, content: string}> }}
 */
function buildCheckinPrompt({ learner, skill, proficiency, backgroundType }) {
  // Map proficiency 0–1 to a difficulty label
  let difficulty;
  if (proficiency < 0.2)      difficulty = 'beginner';
  else if (proficiency < 0.5) difficulty = 'intermediate';
  else if (proficiency < 0.7) difficulty = 'upper-intermediate';
  else                        difficulty = 'advanced';

  // Map background_type to a context note
  const bgNote = {
    technical:      'This learner has a technical background — you can use precise terminology.',
    semi_technical: 'This learner has some technical exposure — explain jargon briefly.',
    non_technical:  'This learner is non-technical — avoid jargon, use concrete analogies.',
  }[backgroundType] ?? '';

  const system = [
    'You are an assessment designer for the autocamp adaptive LMS.',
    `Generate exactly 4 multiple-choice questions (MCQs) for the skill "${skill.name}" (${skill.code}).`,
    `Difficulty level: ${difficulty} (proficiency ${Math.round(proficiency * 100)}%).`,
    bgNote,
    `Program: ${learner.program}.`,
    '',
    'RULES:',
    '1. Each question must have exactly 4 options (A, B, C, D).',
    '2. Only ONE option is correct per question.',
    '3. Questions must be at the specified difficulty level.',
    '4. Options must be plausible — distractors should reflect common misconceptions.',
    '5. Return ONLY valid JSON — no markdown, no explanation, no code fences.',
    '6. The JSON must be an array of objects with keys: question, options, correctIndex, explanation.',
    '7. correctIndex is 0-based (0 = first option, 1 = second, etc.).',
    '8. explanation must be 1 short sentence that teaches why the correct option is correct.',
    '',
    'FEW-SHOT EXAMPLE:',
    JSON.stringify([
      {
        question: 'What is the primary key in a relational database?',
        options: [
          'A column that allows duplicate values',
          'A column or set of columns that uniquely identifies each row',
          'A foreign reference to another table',
          'An index for faster queries',
        ],
        correctIndex: 1,
        explanation: 'A primary key is the field or fields that uniquely identify each row.',
      },
      {
        question: 'Which normal form eliminates transitive dependencies?',
        options: ['1NF', '2NF', '3NF', 'BCNF'],
        correctIndex: 2,
        explanation: 'Third normal form removes non-key fields depending on other non-key fields.',
      },
    ]),
  ].filter(Boolean).join('\n');

  const userMessage = `Generate 4 MCQ questions for skill "${skill.code}" at ${difficulty} level for a ${backgroundType} learner.`;

  return {
    system,
    messages: [{ role: 'user', content: userMessage }],
  };
}

/**
 * Parse LLM response into a questions array.
 * Returns null if the response cannot be parsed as valid MCQ JSON.
 *
 * @param {string} raw
 * @returns {Array|null}
 */
function parseCheckinResponse(raw) {
  if (!raw || typeof raw !== 'string') return null;

  // Strip markdown code fences if present
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/, '');
  cleaned = cleaned.replace(/\s*```$/, '');

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return null;
    if (parsed.length === 0) return null;

    // Validate each question has required shape
    for (const q of parsed) {
      if (
        typeof q.question !== 'string' ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        !q.options.every((o) => typeof o === 'string') ||
        typeof q.correctIndex !== 'number' ||
        q.correctIndex < 0 ||
        q.correctIndex > 3
      ) {
        return null;
      }
      if (q.explanation !== undefined && typeof q.explanation !== 'string') {
        return null;
      }
      if (!q.explanation?.trim()) {
        q.explanation = `The correct answer is option ${String.fromCharCode(65 + q.correctIndex)}.`;
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

module.exports = { buildCheckinPrompt, parseCheckinResponse, FALLBACK_QUESTIONS };
