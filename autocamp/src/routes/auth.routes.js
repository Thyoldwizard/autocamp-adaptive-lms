'use strict';

const { Router } = require('express');
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');
const { BadRequestError, UnauthorizedError } = require('../lib/errors');
const { validate } = require('../lib/validate');
const { register: registerSchema, login: loginSchema } = require('../schemas/auth.schemas');

const router = Router();

// ─── POST /auth/register ──────────────────────────────────────────────────────
// Body: { email, password, role, name, background_type?, program?, cohort?, goal? }
router.post('/register', validate({ body: registerSchema }), async (req, res, next) => {
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

    // ── Create Auth user ─────────────────────────────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata:  { name },
      app_metadata:   { role },
    });

    if (authError) {
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
      .insert({ id: user.id, role, email, name });

    if (profileError) {
      await rollbackCreatedUser();
      return next(profileError);
    }

    let learner = null;

    // ── Insert learner row (students only) ───────────────────────────────────
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

    // ── Sign in so register mirrors login for the frontend ───────────────────
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
// Body: { email, password }
router.post('/login', validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
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
router.post('/logout', auth, async (req, res, next) => {
  try {
    const { error } = await supabase.auth.admin.signOut(
      req.headers.authorization.slice(7),
    );

    if (error) {
      console.warn('[logout] supabase signOut error (non-fatal):', error.message);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
