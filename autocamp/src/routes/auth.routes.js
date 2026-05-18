'use strict';

const { Router } = require('express');
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');
const { BadRequestError, UnauthorizedError } = require('../lib/errors');

const router = Router();

// ─── POST /auth/register ──────────────────────────────────────────────────────
// Creates a Supabase Auth user (via admin API so we can set app_metadata.role),
// writes a profile row, then — for students only — inserts a row in learners.
// Finally signs the new user in so the frontend can continue without a second
// login request.
//
// Body: { email, password, role, name, background_type, program, cohort, goal }
// role must be 'student' | 'instructor'; anything else → 400.
router.post('/register', async (req, res, next) => {
  let createdUserId = null;

  async function rollbackCreatedUser() {
    if (!createdUserId) return;
    const { error } = await supabase.auth.admin.deleteUser(createdUserId);
    if (error) {
      console.warn('[register] rollback deleteUser failed:', error.message);
    }
  }

  try {
    const { email, password, role, name, background_type, program, cohort, goal } = req.body;

    // ── Validate role ────────────────────────────────────────────────────────
    if (!role || !['student', 'instructor'].includes(role)) {
      return next(new BadRequestError("role must be 'student' or 'instructor'"));
    }

    if (!email || !password || !name) {
      return next(new BadRequestError('email, password, and name are required'));
    }

    // ── Create Auth user (admin API — sets app_metadata so it's not user-editable) ─
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata:  { name },
      app_metadata:   { role },
    });

    if (authError) {
      // Supabase surfaces duplicate-email as a 422 with message containing "already registered"
      if (authError.message?.toLowerCase().includes('already registered') ||
          authError.status === 422) {
        return next(new BadRequestError('A user with that email already exists'));
      }
      return next(authError);
    }

    const user = authData.user;
    createdUserId = user.id;

    // ── Profile row (all roles) ──────────────────────────────────────────────
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        role,
        email,
        name,
      });

    if (profileError) {
      await rollbackCreatedUser();
      return next(profileError);
    }

    // ── Students: validate learner-specific fields ───────────────────────────
    if (role === 'student' && (!background_type || !program || !cohort)) {
      await rollbackCreatedUser();
      return next(new BadRequestError('background_type, program, and cohort are required for students'));
    }

    let learner = null;

    // ── Insert learner row ───────────────────────────────────────────────────
    if (role === 'student') {
      const { data: learners, error: learnerError } = await supabase
        .from('learners')
        .insert({
          user_id:         user.id,
          name,
          background_type,
          program,
          cohort,
          stated_goal:     goal ?? null,
          enrolled_at:     new Date().toISOString(),
        })
        .select();

      if (learnerError) {
        await rollbackCreatedUser();
        return next(learnerError);
      }

      learner = learners[0];
    }

    // ── Sign in newly-created user so register mirrors login for the frontend ─
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      await rollbackCreatedUser();
      return next(signInError);
    }

    res.status(201).json({
      access_token: signInData.session.access_token,
      user:         signInData.user,
      ...(learner && { learner }),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
// Signs in via Supabase Auth (password flow) and returns the access token.
// The client stores this token and sends it as "Authorization: Bearer <token>"
// on all subsequent requests.
//
// Body: { email, password }
// Returns: { access_token, user }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new BadRequestError('email and password are required'));
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Supabase returns 400 "Invalid login credentials" on wrong password/unknown email
      return next(new UnauthorizedError('Invalid email or password'));
    }

    res.json({
      access_token: data.session.access_token,
      user:         data.user,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
// Invalidates the current session in Supabase Auth.
// Requires a valid JWT (auth middleware populates req.user).
//
// The service-role client used here calls admin.signOut, which revokes
// all sessions for the user — appropriate for a server-managed LMS.
router.post('/logout', auth, async (req, res, next) => {
  try {
    // Sign out by user id using the admin API (service-role client has no active session)
    const { error } = await supabase.auth.admin.signOut(
      req.headers.authorization.slice(7), // raw JWT from header
    );

    if (error) {
      // Non-fatal: the token may already be expired; still return 200.
      console.warn('[logout] supabase signOut error (non-fatal):', error.message);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
