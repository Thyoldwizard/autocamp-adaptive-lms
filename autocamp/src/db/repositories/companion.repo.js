'use strict';

const supabase = require('../../config/supabase');

/**
 * Return the full chat history for a learner, oldest first
 * (chronological order for LLM context rebuilding).
 * @param {string} learnerId
 * @returns {Promise<object[]>}
 */
async function findByLearnerId(learnerId) {
  if (!learnerId) throw new Error('companion.findByLearnerId: learnerId is required');

  const { data, error } = await supabase
    .from('companion_messages')
    .select('*')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Return the N most recent messages for a learner (for chat display / pagination).
 * @param {string} learnerId
 * @param {number} limit - maximum number of messages to return (default 20)
 * @returns {Promise<object[]>} in reverse-chronological order (newest first)
 */
async function findRecentByLearnerId(learnerId, limit = 20) {
  if (!learnerId) throw new Error('companion.findRecentByLearnerId: learnerId is required');

  const { data, error } = await supabase
    .from('companion_messages')
    .select('*')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Persist a single companion message (user turn or assistant reply).
 * @param {object} row - { learner_id, role, content, skill_id?, module_id?, context_snapshot?, model_used? }
 * @returns {Promise<object>} inserted row
 */
async function insert(row) {
  if (!row?.learner_id) throw new Error('companion.insert: learner_id is required');
  if (!row?.role)       throw new Error('companion.insert: role is required');
  if (!row?.content)    throw new Error('companion.insert: content is required');

  const { data, error } = await supabase
    .from('companion_messages')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { findByLearnerId, findRecentByLearnerId, insert };
