const defaultSupabase = require('../config/supabase');
const { ForbiddenError } = require('../lib/errors');

// Loads the cohorts this instructor is authorised to see and attaches
// them to req.allowedCohorts = ['da-2026-spring', ...].
//
// Instructor service functions accept a cohort string and verify it is
// present in req.allowedCohorts — they never trust cohort values from
// URL params alone.
//
// Must run after auth.js and requireRole('instructor').
function makeCohortScope(supabase) {
  return async function cohortScope(req, _res, next) {
    try {
      const { data, error } = await supabase
        .from('instructor_cohorts')
        .select('cohort')
        .eq('instructor_id', req.user.id);

      if (error) {
        return next(new ForbiddenError('Could not load cohort authorisation'));
      }

      req.instructorCohorts = (data ?? []).map((r) => r.cohort);
      next();
    } catch (err) {
      next(err);
    }
  };
}

const middleware = makeCohortScope(defaultSupabase);
middleware.withClient = makeCohortScope;

module.exports = middleware;
