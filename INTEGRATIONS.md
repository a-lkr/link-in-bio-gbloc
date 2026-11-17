# Connecting external services

GBLOC keeps service credentials on the server in environment variables. Never
put provider secrets in frontend code, commit them, or share one installation's
credentials with another.

## Existing integration points

| Capability | Current provider(s) | Configuration |
| --- | --- | --- |
| Sign-in | Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| File storage | Local disk, S3-compatible storage | `STORAGE_PROVIDER`, `LOCAL_STORAGE_DIR`, `S3_*` |
| Payments | Stripe | `BILLING_ENABLED`, `STRIPE_*` |
| Database | PostgreSQL | `DATABASE_URL` |

Billing is disabled by default. Google sign-in can be left unconfigured while
testing public pages, but users cannot sign in until the OAuth client and
callback URL are configured. Use
`http://localhost:5173/api/auth/google/callback` for local development.

## Adding another provider

Add integrations behind the capability they serve instead of spreading
provider-specific API calls throughout routes and UI:

1. Define a small provider interface for the capability (for example, storage,
   authentication, billing, or email).
2. Keep one adapter per provider and select it through server-side environment
   configuration.
3. Validate required settings at startup or when the capability is enabled.
4. Add tests for success, missing credentials, provider errors, and safe
   fallback/disabled behavior.
5. Document setup, callback/webhook URLs, data retention, and required scopes.

Current extension points are the storage provider service, the provider identity
records used by authentication, and the Stripe billing service. No email
delivery provider is configured yet; add one only when a provider is selected.
