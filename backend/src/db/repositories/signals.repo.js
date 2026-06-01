'use strict';

const supabase = require('../../config/supabase');

/**
 * Return struggle_signals for a learner, newest first.
 * @param {string} learnerId
 * @param {{ limit?: number, offset?: number }} [page]
 * @returns {Promise<object[]>}
 */
async function findByLearnerId(learnerId, { limit = 100, offset = 0 } = {}) {
  if (!learnerId) throw new Error('signals.findByLearnerId: learnerId is required');

  const { data, error } = await supabase
    .from('struggle_signals')
    .select('*')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}

/**
 * Return signals created within the last `days` days for a learner.
 * Unresolved signals are returned first.
 * @param {string} learnerId
 * @param {number} days - look-back window (default 30)
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<object[]>}
 */
async function findRecentByLearnerId(learnerId, days = 30, { limit = 200 } = {}) {
  if (!learnerId) throw new Error('signals.findRecentByLearnerId: learnerId is required');

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('struggle_signals')
    .select('*')
    .eq('learner_id', learnerId)
    .gte('created_at', since)
    .order('resolved_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Insert a new struggle signal.
 * @param {object} row - { learner_id, signal_type, severity, source, context?, notes? }
 * @returns {Promise<object>} inserted row
 */
async function insert(row) {
  if (!row?.learner_id)   throw new Error('signals.insert: learner_id is required');
  if (!row?.signal_type)  throw new Error('signals.insert: signal_type is required');
  if (!row?.severity)     throw new Error('signals.insert: severity is required');
  if (!row?.source)       throw new Error('signals.insert: source is required');

  const { data, error } = await supabase
    .from('struggle_signals')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark a signal as resolved by setting resolved_at to now.
 * @param {string} signalId - struggle_signals.id UUID
 * @returns {Promise<object>} updated row
 */
async function resolve(signalId) {
  if (!signalId) throw new Error('signals.resolve: signalId is required');

  const { data, error } = await supabase
    .from('struggle_signals')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', signalId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Return recent signals for a list of learner IDs in one query (dedup sweep).
 * @param {string[]} learnerIds
 * @param {number} days
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<object[]>}
 */
async function findRecentByLearnerIds(learnerIds, days = 30, { limit = 2000 } = {}) {
  if (!learnerIds?.length) return [];

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('struggle_signals')
    .select('*')
    .in('learner_id', learnerIds)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

module.exports = { findByLearnerId, findRecentByLearnerId, findRecentByLearnerIds, insert, resolve };
