'use strict';

const { BadRequestError } = require('./errors');

/**
 * Express middleware factory. Validates request sections against Zod schemas.
 *
 * On failure: calls next(BadRequestError) with all field errors joined by '; '.
 * On success: replaces req.body / req.params / req.query with coerced Zod output.
 *
 * @param {{ body?: ZodSchema, params?: ZodSchema, query?: ZodSchema }} schemas
 * @returns {import('express').RequestHandler}
 *
 * @example
 *   router.post('/foo', validate({ body: mySchema, params: myParamsSchema }), handler);
 */
function validate({ body, params, query } = {}) {
  return (req, _res, next) => {
    const messages = [];

    if (body) {
      const result = body.safeParse(req.body ?? {});
      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path.length ? issue.path.join('.') : 'body';
          messages.push(`${field}: ${issue.message}`);
        }
      } else {
        req.body = result.data;
      }
    }

    if (params) {
      const result = params.safeParse(req.params ?? {});
      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path.length ? issue.path.join('.') : 'params';
          messages.push(`${field}: ${issue.message}`);
        }
      } else {
        req.params = result.data;
      }
    }

    if (query) {
      const result = query.safeParse(req.query ?? {});
      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path.length ? issue.path.join('.') : 'query';
          messages.push(`${field}: ${issue.message}`);
        }
      } else {
        req.query = result.data;
      }
    }

    if (messages.length > 0) {
      return next(new BadRequestError(messages.join('; ')));
    }

    next();
  };
}

module.exports = { validate };
