'use strict';

const supabase = require('../../config/supabase');

/**
 * Find a learner by their primary key (learners.id).
 * @param {string} id - learner UUID
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  if (!id) throw new Error('learners.findById: id is required');

  const { data, error } = await supabase
    .from('learners')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data ?? null;
}

/**
 * Find all learners belonging to a cohort string.
 * @param {string} cohort - e.g. 'da-2026-spring'
 * @param {{ limit?: number, offset?: number }} [page]
 * @returns {Promise<object[]>}
 */
async function findByCohort(cohort, { limit = 100, offset = 0 } = {}) {
  if (!cohort) throw new Error('learners.findByCohort: cohort is required');

  const { data, error } = await supabase
    .from('learners')
    .select('*')
    .eq('cohort', cohort)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}

/**
 * Find the learner record linked to a Supabase auth user.
 * @param {string} userId - auth.users UUID (stored in learners.user_id)
 * @returns {Promise<object|null>}
 */
async function findByUserId(userId) {
  if (!userId) throw new Error('learners.findByUserId: userId is required');

  const { data, error } = await supabase
    .from('learners')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

/**
 * Update mutable learner fields.
 * Only allowed fields are applied; the caller must not pass id/user_id.
 * @param {string} id - learner UUID
 * @param {object} fields - e.g. { stated_goal, cohort }
 * @returns {Promise<object>} updated learner record
 */
async function update(id, fields) {
  if (!id)     throw new Error('learners.update: id is required');
  if (!fields) throw new Error('learners.update: fields are required');

  const { data, error } = await supabase
    .from('learners')
    .update(fields)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Return all learner records.
 * @param {{ limit?: number, offset?: number }} [page]
 * @returns {Promise<object[]>}
 */
async function findAll({ limit = 500, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('learners')
    .select('*')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}

module.exports = { findAll, findById, findByCohort, findByUserId, update };
