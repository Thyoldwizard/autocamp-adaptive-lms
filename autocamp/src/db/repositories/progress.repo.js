'use strict';

const supabase = require('../../config/supabase');

/**
 * Return progress rows for a learner, joined with the module catalog.
 * @param {string} learnerId
 * @param {{ limit?: number, offset?: number }} [page]
 * @returns {Promise<object[]>}
 */
async function findByLearnerId(learnerId, { limit = 200, offset = 0 } = {}) {
  if (!learnerId) throw new Error('progress.findByLearnerId: learnerId is required');

  const { data, error } = await supabase
    .from('progress')
    .select('*, module:modules(id, code, name, program, sequence)')
    .eq('learner_id', learnerId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}

/**
 * Return the progress row for a specific (learner, module) pair, or null.
 * @param {string} learnerId
 * @param {string} moduleId
 * @returns {Promise<object|null>}
 */
async function findByLearnerAndModule(learnerId, moduleId) {
  if (!learnerId) throw new Error('progress.findByLearnerAndModule: learnerId is required');
  if (!moduleId)  throw new Error('progress.findByLearnerAndModule: moduleId is required');

  const { data, error } = await supabase
    .from('progress')
    .select('*, module:modules(id, code, name, program, sequence)')
    .eq('learner_id', learnerId)
    .eq('module_id', moduleId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

/**
 * Insert or update a progress row. Conflicts on (learner_id, module_id) → merge.
 * @param {object} row - { learner_id, module_id, status, completion_pct, ... }
 * @returns {Promise<object>} upserted row
 */
async function upsert(row) {
  if (!row?.learner_id) throw new Error('progress.upsert: learner_id is required');
  if (!row?.module_id)  throw new Error('progress.upsert: module_id is required');

  const { data, error } = await supabase
    .from('progress')
    .upsert(row, { onConflict: 'learner_id,module_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Change the status column (and optionally completed_at) for a progress row.
 * @param {string} learnerId
 * @param {string} moduleId
 * @param {string} status - 'not_started'|'in_progress'|'completed'|'stalled'
 * @param {object} [extra] - additional fields to merge (e.g. { completed_at })
 * @returns {Promise<object>} updated row
 */
async function updateStatus(learnerId, moduleId, status, extra = {}) {
  if (!learnerId) throw new Error('progress.updateStatus: learnerId is required');
  if (!moduleId)  throw new Error('progress.updateStatus: moduleId is required');
  if (!status)    throw new Error('progress.updateStatus: status is required');

  const { data, error } = await supabase
    .from('progress')
    .update({ status, ...extra })
    .eq('learner_id', learnerId)
    .eq('module_id', moduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Return all progress rows for a list of learner IDs in one query.
 * @param {string[]} learnerIds
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<object[]>}
 */
async function findByLearnerIds(learnerIds, { limit = 2000 } = {}) {
  if (!learnerIds?.length) return [];

  const { data, error } = await supabase
    .from('progress')
    .select('*, module:modules(id, code, name, program, sequence)')
    .in('learner_id', learnerIds)
    .range(0, limit - 1);

  if (error) throw error;
  return data ?? [];
}

module.exports = { findByLearnerId, findByLearnerIds, findByLearnerAndModule, upsert, updateStatus };
