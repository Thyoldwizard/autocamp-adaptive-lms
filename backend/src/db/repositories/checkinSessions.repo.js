'use strict';

const supabase = require('../../config/supabase');

/**
 * @param {object} row - { id, learner_id, skill_id, skill_code, questions, expires_at }
 * @returns {Promise<object>}
 */
async function create(row) {
  const { data, error } = await supabase
    .from('checkin_sessions')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Returns the session only if it has not expired.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const { data, error } = await supabase
    .from('checkin_sessions')
    .select('*')
    .eq('id', id)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * @param {string} id
 */
async function deleteById(id) {
  const { error } = await supabase
    .from('checkin_sessions')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/**
 * Delete all sessions whose expires_at is in the past.
 */
async function purgeExpired() {
  const { error } = await supabase
    .from('checkin_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString());
  if (error) throw error;
}

module.exports = { create, findById, deleteById, purgeExpired };
