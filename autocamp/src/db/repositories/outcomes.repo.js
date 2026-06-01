'use strict';

const supabase = require('../../config/supabase');

/**
 * Return outcome rows for a learner, newest first.
 * @param {string} learnerId
 * @param {{ limit?: number, offset?: number }} [page]
 * @returns {Promise<object[]>}
 */
async function findByLearnerId(learnerId, { limit = 100, offset = 0 } = {}) {
  if (!learnerId) throw new Error('outcomes.findByLearnerId: learnerId is required');

  const { data, error } = await supabase
    .from('outcomes')
    .select('*')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}

/**
 * Insert a new outcome, or update an existing one when `id` is supplied.
 *
 * Without `id` → INSERT (Postgres generates the id). A caller can never
 * overwrite an existing row by accidentally supplying a colliding id.
 *
 * With `id` → UPDATE that row scoped to its owning `learner_id`, so a caller
 * can only modify their own outcomes and cannot clobber another learner's row
 * by guessing an id. (The previous `upsert({ onConflict: 'id' })` allowed a
 * caller-supplied id to silently overwrite any existing outcome.)
 *
 * @param {object} row - { learner_id, outcome_type, title, status?, id?, ... }
 * @returns {Promise<object>} inserted or updated row
 */
async function upsert(row) {
  if (!row?.learner_id)    throw new Error('outcomes.upsert: learner_id is required');
  if (!row?.outcome_type)  throw new Error('outcomes.upsert: outcome_type is required');
  if (!row?.title)         throw new Error('outcomes.upsert: title is required');

  if (row.id) {
    const { id, ...fields } = row;
    const { data, error } = await supabase
      .from('outcomes')
      .update(fields)
      .eq('id', id)
      .eq('learner_id', row.learner_id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('outcomes')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { findByLearnerId, upsert };
