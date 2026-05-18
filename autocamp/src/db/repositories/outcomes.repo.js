'use strict';

const supabase = require('../../config/supabase');

/**
 * Return all outcome rows for a learner, newest first.
 * @param {string} learnerId
 * @returns {Promise<object[]>}
 */
async function findByLearnerId(learnerId) {
  if (!learnerId) throw new Error('outcomes.findByLearnerId: learnerId is required');

  const { data, error } = await supabase
    .from('outcomes')
    .select('*')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Insert or update an outcome. Conflicts on id → merge all provided fields.
 * When inserting new outcomes omit the id field — Postgres generates it.
 * @param {object} row - { learner_id, outcome_type, title, status?, ... }
 * @returns {Promise<object>} upserted row
 */
async function upsert(row) {
  if (!row?.learner_id)    throw new Error('outcomes.upsert: learner_id is required');
  if (!row?.outcome_type)  throw new Error('outcomes.upsert: outcome_type is required');
  if (!row?.title)         throw new Error('outcomes.upsert: title is required');

  const { data, error } = await supabase
    .from('outcomes')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { findByLearnerId, upsert };
