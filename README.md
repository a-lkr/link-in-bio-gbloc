# GBLOC

GBLOC is a profile builder with public profile pages, social links, optional
media, and an account dashboard.

## Run locally

Requirements: Node.js 22.12 or newer, pnpm 10 or newer, and Docker Desktop (or
an existing PostgreSQL 16 database).

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Create local configuration and a private session secret:

   ```sh
   cp .env.example .env
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```

   In PowerShell, use `Copy-Item .env.example .env` instead of `cp`. Copy the
   generated value into `SESSION_SECRET` in `.env`.

3. Start the local PostgreSQL database:

   ```sh
   pnpm db:up
   ```

   If PostgreSQL is already installed locally, skip this and set `DATABASE_URL`
   in `.env` to that database.

4. Create the database tables and start the web app plus API:

   ```sh
   pnpm db:push
   pnpm dev
   ```

5. Open `http://localhost:5173`.

The local setup stores profile uploads under `./var/gbloc-storage`. That folder
and the local database are not committed to Git. Use a fresh local database;
do not point this setup at an existing production database. Existing uploads
must be copied to the chosen storage provider before connecting an existing
database to this installation.

## Sign-in and optional services

Google sign-in requires your own Google OAuth client. Add the client ID and
secret to `.env` and register this callback URL with Google:

```text
http://localhost:5173/api/auth/google/callback
```

Public pages can be explored without configuring sign-in, but account features
require it. Stripe billing is disabled by default. Configure your own Stripe
keys, webhook secret, and Price IDs only if you want to test payments.

See [INTEGRATIONS.md](./INTEGRATIONS.md) for the current providers and how to
add another service. See [BILLING_SETUP.md](./BILLING_SETUP.md) and
[STORAGE_MIGRATION.md](./STORAGE_MIGRATION.md) for provider-specific details.

## Development checks

```sh
pnpm run typecheck
pnpm --filter @workspace/gbloc run test:seo
pnpm --filter @workspace/api-server run test
```

The OpenAPI document is the API contract source. After changing it, regenerate
the client hooks and server validators:

```sh
pnpm --filter @workspace/api-spec run codegen
```

## License

GBLOC is released under the MIT License. See [LICENSE](./LICENSE).

## Local-only deployment warning

This quick-start is for development on your own computer. Before exposing an
installation to the internet, replace every example credential, use HTTPS,
configure durable private storage and database backups, and review the default
terms and privacy documents for your own service.
