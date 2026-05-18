'use strict';

/**
 * LLM provider index.
 *
 * Reads LLM_PROVIDER from env and exports whichever provider is active.
 * Supported values: 'gemini' | 'fallback'  (default: 'fallback')
 *
 * Both providers export: generate({ system, messages }) → Promise<string>
 *
 * The LLMError class is re-exported from gemini.provider so the rest of the
 * codebase can import it from one place regardless of active provider.
 */

const { LLM_PROVIDER } = require('../../config/env');
const { LLMError }     = require('./gemini.provider');

let provider;

if (LLM_PROVIDER === 'gemini') {
  provider = require('./gemini.provider');
} else {
  // Default / fallback — safe for tests and local dev without an API key
  provider = require('./fallback.provider');
}

module.exports = {
  generate: provider.generate,
  LLMError,
};
