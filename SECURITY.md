# Security Policy

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

If you discover a security issue — authentication bypass, injections, data leakage, or any other vulnerability — please report it privately:

**Email:** smhassan223@gmail.com  
**Subject line:** `[SECURITY] atomcamp-adaptive-lms — brief description`

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce (minimal proof of concept)
- Affected component(s) — backend route, frontend page, or configuration

We will acknowledge receipt within 72 hours and aim to release a fix within 14 days for critical issues.

---

## Scope

This policy covers:

- The Express backend (`autocamp/`)
- The Next.js frontend (`autocamp-frontend/`)
- The Supabase schema and migration scripts
- The authentication and authorization middleware

It does not cover:

- Supabase itself (report to Supabase directly)
- Third-party npm packages (report to the respective maintainer)
- Vulnerabilities that require physical access to a machine

---

## Warning: do not commit secrets

**Never commit real credentials to this repository.** This includes:

- Supabase URLs, service-role keys, or JWT secrets
- Gemini or any other API keys
- Database connection strings with real credentials
- `.env` files (they are `.gitignore`d — keep them that way)

Both `.env.example` files in this repository contain only safe placeholder values. Use them as a template.

If you accidentally commit a secret:
1. Rotate the key immediately in your provider's dashboard
2. Remove the secret from the commit history (`git filter-repo` or BFG)
3. Force-push only after rotating — the old key is already compromised

---

## Supported versions

This project is pre-1.0. Security fixes are applied to the `main` branch only. We do not maintain separate release branches.
