'use strict';

/**
 * LLM provider index.
 *
 * Reads LLM_PROVIDER from env and exports whichever provider is active.
 * Supported values: 'gemini' | 'fallback'  (default: 'fallback')
 *
 * Both providers export: generate({ system, messages }) → Promise<string>
 *
 * If LLM_PROVIDER=gemini but GEMINI_API_KEY is absent, a warning is logged
 * and the deterministic fallback provider is used — the server never crashes
 * on a missing key.
 *
 * The LLMError class is re-exported from gemini.provider so the rest of the
 * codebase can import it from one place regardless of active provider.
 */

const { LLM_PROVIDER } = require('../../config/env');
const { LLMError }     = require('./gemini.provider');

let provider;

if (LLM_PROVIDER === 'gemini') {
  if (!process.env.GEMINI_API_KEY) {
    require('../../lib/logger').warn(
      'LLM_PROVIDER=gemini but GEMINI_API_KEY is not set — falling back to deterministic provider',
    );
    provider = require('./fallback.provider');
  } else {
    provider = require('./gemini.provider');
  }
} else {
  provider = require('./fallback.provider');
}

module.exports = {
  generate: provider.generate,
  LLMError,
};
