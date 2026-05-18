const supabase = require('../config/supabase');
const { UnauthorizedError } = require('../lib/errors');

// Verifies the Supabase JWT using the Supabase API.
// Populates req.user = { id, role, email } on success.
// Role is read from app_metadata.role (admin-only claim, not user-editable).
module.exports = async function auth(req, _res, next) {
  try {
    const header = req.headers.authorization ?? '';

    if (!header.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Missing or malformed Authorization header'));
    }

    const token = header.slice(7);

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }

    req.user = {
      id:    data.user.id,
      role:  data.user.app_metadata?.role ?? null,
      email: data.user.email ?? null,
    };

    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};
