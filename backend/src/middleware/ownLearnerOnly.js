const defaultSupabase = require('../config/supabase');
const { NotFoundError } = require('../lib/errors');

// Resolves the learner record that belongs to the authenticated user
// and attaches its id to req.learnerId.
//
// Student services read req.learnerId — they never trust a learner id
// from URL params or the request body, so a student cannot access
// another learner's data even if they craft a request with a different id.
//
// Must run after auth.js (depends on req.user.id).
function makeOwnLearnerOnly(supabase) {
  return async function ownLearnerOnly(req, _res, next) {
    try {
      const { data: learner, error } = await supabase
        .from('learners')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (error || !learner) {
        return next(new NotFoundError('Learner record not found for this user'));
      }

      req.learnerId = learner.id;
      next();
    } catch (err) {
      next(err);
    }
  };
}

const middleware = makeOwnLearnerOnly(defaultSupabase);
middleware.withClient = makeOwnLearnerOnly;

module.exports = middleware;
