'use strict';

const supabase = require('../../config/supabase');

/**
 * Return the full skills catalog ordered by domain then name.
 * @returns {Promise<object[]>}
 */
async function findAll() {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .order('domain', { ascending: true })
    .order('name',   { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Find a skill by its primary key UUID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  if (!id) throw new Error('skills.findById: id is required');

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

/**
 * Find multiple skills by their machine-readable codes.
 * @param {string[]} codes - e.g. ['sql', 'python']
 * @returns {Promise<object[]>}
 */
async function findByCodes(codes) {
  if (!Array.isArray(codes) || codes.length === 0) {
    throw new Error('skills.findByCodes: codes must be a non-empty array');
  }

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .in('code', codes);

  if (error) throw error;
  return data ?? [];
}

/**
 * Find a skill by its machine-readable code.
 * @param {string} code - e.g. 'sql', 'python'
 * @returns {Promise<object|null>}
 */
async function findByCode(code) {
  if (!code) throw new Error('skills.findByCode: code is required');

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('code', code)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

module.exports = { findAll, findById, findByCodes, findByCode };
