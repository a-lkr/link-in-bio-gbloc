<div align="center">
  <h1>GBLOC</h1>
  <p><strong>Your link in bio. Your own space.</strong></p>
  <p>A self-hosted profile builder for public pages, social links, optional media, and account management.</p>
  <p>
    <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-9b6bdb?style=flat-square">
    <img alt="Node.js 22.12+" src="https://img.shields.io/badge/Node.js-22.12%2B-9b6bdb?style=flat-square">
    <img alt="pnpm 10+" src="https://img.shields.io/badge/pnpm-10%2B-9b6bdb?style=flat-square">
  </p>
</div>

## In this guide

[Run locally](#run-locally) · [Sign-in and optional services](#sign-in-and-optional-services) · [Development checks](#development-checks) · [License](#license)

## Run locally

> [!NOTE]
> This quick start is for local development. Use a fresh local database; never point it at a production database.

### Requirements

| Tool | Version |
| --- | --- |
| Node.js | 22.12 or newer |
| pnpm | 10 or newer |
| PostgreSQL | 16, or Docker Desktop to run it locally |

### 1. Install dependencies

```sh
pnpm install
```

### 2. Create your local environment

Copy the example settings and generate a private session secret:

```sh
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

In PowerShell, use `Copy-Item .env.example .env` instead of `cp`. Put the generated value in `SESSION_SECRET` inside `.env`.

### 3. Start PostgreSQL

```sh
pnpm db:up
```

If PostgreSQL is already installed, skip this command and set `DATABASE_URL` in `.env`.

### 4. Create tables and start GBLOC

```sh
pnpm db:push
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

### Local files and data

Profile uploads are stored in `./var/gbloc-storage`. The local database and this folder are not committed to Git.

> [!WARNING]
> If you connect an existing database, copy its uploads to your chosen storage provider first. Do not point a local setup at production data.

## Sign-in and optional services

Public pages work without sign-in configuration. Account features require Google sign-in, which uses your own Google OAuth client. Add its client ID and secret to `.env`, then register this callback URL with Google:

```text
http://localhost:5173/api/auth/google/callback
```

Stripe billing is disabled by default. Add your own Stripe keys, webhook secret, and Price IDs only if you want to test payments.

| Guide | What it covers |
| --- | --- |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Current providers and how to add another service |
| [BILLING_SETUP.md](./BILLING_SETUP.md) | Optional Stripe billing setup |
| [STORAGE_MIGRATION.md](./STORAGE_MIGRATION.md) | Storage-provider details |

## Development checks

Run these before sending a change:

```sh
pnpm run typecheck
pnpm --filter @workspace/gbloc run test:seo
pnpm --filter @workspace/api-server run test
```

The OpenAPI document is the source of truth for the API contract. After changing it, regenerate the client hooks and server validators:

```sh
pnpm --filter @workspace/api-spec run codegen
```

## License

GBLOC is released under the [MIT License](./LICENSE).

## Before going online

> [!IMPORTANT]
> This quick start is for development on your own computer. Before exposing an installation to the internet, replace all example credentials, use HTTPS, configure durable private storage and database backups, and review the default terms and privacy documents for your service.
