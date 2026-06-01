'use strict';

const supabase = require('../../config/supabase');

/**
 * Return all modules ordered by program then sequence.
 * @returns {Promise<object[]>}
 */
async function findAll() {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .order('program',  { ascending: true })
    .order('sequence', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Find a module by its primary key UUID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  if (!id) throw new Error('modules.findById: id is required');

  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

/**
 * Return all modules for a program, in sequence order.
 * @param {string} program - e.g. 'data-analytics-bootcamp'
 * @returns {Promise<object[]>}
 */
async function findByProgram(program) {
  if (!program) throw new Error('modules.findByProgram: program is required');

  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('program', program)
    .order('sequence', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Return modules whose skill_ids array contains the given skill UUID.
 * Uses Postgres array overlap (@>) via the `cs` (contains) filter.
 * @param {string} skillId - skill UUID
 * @returns {Promise<object[]>}
 */
async function findBySkillId(skillId) {
  if (!skillId) throw new Error('modules.findBySkillId: skillId is required');

  // PostgREST syntax for array-contains: cs={"<uuid>"}
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .contains('skill_ids', [skillId])
    .order('program',  { ascending: true })
    .order('sequence', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

module.exports = { findAll, findById, findByProgram, findBySkillId };
