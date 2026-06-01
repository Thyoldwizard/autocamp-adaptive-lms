'use strict';

/**
 * fallback.provider.js
 *
 * Rules-based response provider — same interface as gemini.provider but
 * requires no API call.  Used when LLM_PROVIDER=fallback (default in tests
 * and local dev without a key) or as a degradation path on LLM failure.
 *
 * The response is generated from the system prompt context that
 * companion.service already embeds, so the fallback is always relevant
 * to the learner's actual state.
 *
 * Interface (identical to gemini.provider):
 *   generate({ system, messages }) → Promise<string>
 */

// ── Response templates ────────────────────────────────────────────────────────
//
// We scan the last user message for intent keywords and return the most
// relevant canned response.  If nothing matches we give a generic encouragement.

const TEMPLATES = [
  {
    keywords: ['help', 'stuck', "don't understand", 'confused', "can't", 'struggling', 'lost'],
    response: (ctx) =>
      `I can see you're finding this challenging${ctx.module ? `, especially with ${ctx.module}` : ''}. That's completely normal — `
      + `${ctx.weakAreas?.length ? `${ctx.weakAreas.slice(0, 2).join(' and ')} take time to click` : 'learning takes time'}. `
      + `Try breaking the problem into smaller steps. What specific part is giving you trouble?`,
  },
  {
    keywords: ['quiz', 'test', 'assessment', 'score', 'exam'],
    response: (ctx) =>
      `For assessments${ctx.module ? ` like ${ctx.module}` : ''}, focus on understanding the concepts rather than memorising answers. `
      + `${ctx.weakAreas?.length ? `Your gaps in ${ctx.weakAreas[0]} are worth reviewing before you attempt it.` : 'Review the core concepts first.'} `
      + `Would you like me to walk you through the key ideas?`,
  },
  {
    keywords: ['next', 'what should i do', 'recommend', 'suggest', 'focus'],
    response: (ctx) =>
      ctx.nextModule
        ? `Based on your progress, I recommend focusing on **${ctx.nextModule}** next. `
          + `${ctx.weakAreas?.length ? `It directly addresses your gap in ${ctx.weakAreas[0]}.` : 'It aligns well with your current level.'}`
        : `You're making great progress! Keep working through ${ctx.module ?? 'your current module'} — `
          + `consistency is the most important factor at this stage.`,
  },
  {
    keywords: ['goal', 'progress', 'how am i doing', 'on track'],
    response: (ctx) =>
      ctx.goalPct !== undefined
        ? `You're at **${ctx.goalPct}% toward your goal**${ctx.onTrack ? ' — you\'re on track! 🎯' : '. There\'s room to accelerate.'}  `
          + `${ctx.strongAreas?.length ? `Your strengths in ${ctx.strongAreas.join(', ')} will carry you far.` : ''}`
        : `Keep focused on your goal. Every module you complete builds toward it.`,
  },
  {
    keywords: ['motivat', 'tired', 'burnout', 'hard', 'difficult', 'give up'],
    response: (_ctx) =>
      `Learning is hard — it's supposed to be. The struggle you feel right now is your brain forming new connections. `
      + `Take a short break, then come back to one small task. Small wins compound into big results.`,
  },
];

const DEFAULT_RESPONSE = (ctx) =>
  `Hi${ctx.name ? ` ${ctx.name}` : ''}! I'm your learning companion. `
  + `${ctx.module ? `I can see you're working on ${ctx.module}. ` : ''}`
  + `Feel free to ask me anything about the material, your progress, or what to study next.`;

// ── Context extractor ─────────────────────────────────────────────────────────
//
// The system prompt is plain text that companion.service builds.  We do a
// simple regex scan to pull out the salient facts so the fallback can use them.

function extractContext(system = '') {
  const name       = system.match(/Name:\s*([^\n]+)/i)?.[1]?.trim();
  const module     = system.match(/Current module:\s*([^\n]+)/i)?.[1]?.trim() || null;
  const nextModule = system.match(/Recommended next module:\s*([^\n]+)/i)?.[1]?.trim() || null;
  const goalPctRaw = system.match(/Goal progress:\s*(\d+)%/i)?.[1];
  const goalPct    = goalPctRaw !== undefined ? Number(goalPctRaw) : undefined;
  const onTrack    = /on track:\s*true/i.test(system);
  const weakRaw    = system.match(/Weak areas:\s*([^\n]+)/i)?.[1] ?? '';
  const weakAreas  = weakRaw ? weakRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const strongRaw  = system.match(/Strong areas:\s*([^\n]+)/i)?.[1] ?? '';
  const strongAreas = strongRaw ? strongRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

  return { name, module, nextModule, goalPct, onTrack, weakAreas, strongAreas };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return a rules-based response without any API call.
 *
 * @param {{ system?: string, messages: Array<{ role: string, content: string }> }} opts
 * @returns {Promise<string>}
 */
async function generate({ system = '', messages }) {
  const ctx = extractContext(system);

  // Find the last user message
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const text     = (lastUser?.content ?? '').toLowerCase();

  // Match first template whose keywords appear in the user message
  for (const template of TEMPLATES) {
    if (template.keywords.some((kw) => text.includes(kw))) {
      return template.response(ctx);
    }
  }

  return DEFAULT_RESPONSE(ctx);
}

module.exports = { generate };
