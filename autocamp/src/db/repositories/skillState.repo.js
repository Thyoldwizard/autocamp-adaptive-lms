'use strict';

const supabase = require('../../config/supabase');

/**
 * Return all skill_state rows for a learner, joined with the skill catalog.
 * @param {string} learnerId
 * @returns {Promise<object[]>}
 */
async function findByLearnerId(learnerId) {
  if (!learnerId) throw new Error('skillState.findByLearnerId: learnerId is required');

  const { data, error } = await supabase
    .from('skill_state')
    .select('*, skill:skills(id, code, name, domain)')
    .eq('learner_id', learnerId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Insert or update a single skill_state row for a learner.
 * Conflicts on (learner_id, skill_id) → update in place.
 * @param {object} row - { learner_id, skill_id, proficiency, confidence, last_assessed_at? }
 * @returns {Promise<object>} upserted row
 */
async function upsertSkill(row) {
  if (!row?.learner_id) throw new Error('skillState.upsertSkill: learner_id is required');
  if (!row?.skill_id)   throw new Error('skillState.upsertSkill: skill_id is required');

  const { data, error } = await supabase
    .from('skill_state')
    .upsert(row, { onConflict: 'learner_id,skill_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update the proficiency (and optionally confidence) for a specific
 * (learner, skill) pair. Row must already exist.
 * @param {string} learnerId
 * @param {string} skillId
 * @param {object} fields - { proficiency, confidence?, last_assessed_at? }
 * @returns {Promise<object>} updated row
 */
async function updateProficiency(learnerId, skillId, fields) {
  if (!learnerId) throw new Error('skillState.updateProficiency: learnerId is required');
  if (!skillId)   throw new Error('skillState.updateProficiency: skillId is required');

  const { data, error } = await supabase
    .from('skill_state')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('learner_id', learnerId)
    .eq('skill_id', skillId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Find a single skill_state row for a learner + skill pair.
 * @param {string} learnerId
 * @param {string} skillId
 * @returns {Promise<object|null>}
 */
async function findByLearnerAndSkillId(learnerId, skillId) {
  if (!learnerId) throw new Error('skillState.findByLearnerAndSkillId: learnerId is required');
  if (!skillId)   throw new Error('skillState.findByLearnerAndSkillId: skillId is required');

  const { data, error } = await supabase
    .from('skill_state')
    .select('*, skill:skills(id, code, name, domain)')
    .eq('learner_id', learnerId)
    .eq('skill_id', skillId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

module.exports = { findByLearnerId, findByLearnerAndSkillId, upsertSkill, updateProficiency };
