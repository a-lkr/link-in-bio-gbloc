# Stripe Basic one-time purchase setup

The app uses Stripe's server-side SDK. Each installation connects its own
Stripe account and supplies credentials through its hosting platform's secret
manager or environment variables.

## Current state

- Basic uses a one-time THB 35 Checkout payment and grants one calendar month
  after a signed Stripe webhook confirms payment. Renewals are manual; there is
  no automatic monthly charge.
- Pro remains a preview-only plan and cannot be purchased.
- Billing is off by default. The API refuses checkout unless billing is
  explicitly enabled and all required test or live settings are present.

## Required configuration

Set these values in your private local `.env` for development, or in the secret
manager used by your host. Keep development and production credentials separate:

- `STRIPE_SECRET_KEY` — use a Stripe test key during development.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the matching test or live
  webhook endpoint.
- `STRIPE_PRICE_BASIC` — active one-time THB 35 Price ID for Basic.
- `STRIPE_PRICE_PRO` — leave unset; Pro is preview-only.
- `GBLOC_PUBLIC_ORIGIN` — canonical HTTPS origin, such as `https://example.com`.
- `BILLING_ENABLED` — keep unset or `false` until a matching key, price, origin,
  and webhook secret are configured and tested.

The remaining Google sign-in and database variables are listed in `.env.example`.
Never commit real credentials or copy them into `.env.example`.

## Stripe dashboard configuration

1. In Stripe Test mode, create an active Basic price for THB 35 and choose
   one-time payment, not recurring billing.
2. Add a test webhook endpoint at
   `https://YOUR_DOMAIN/api/billing/stripe/webhook` (for local testing, use
   Stripe CLI to forward events to `http://localhost:8080/api/billing/stripe/webhook`).
3. Subscribe it to `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, and `charge.refunded`.
4. Copy that endpoint's signing secret into the development
   `STRIPE_WEBHOOK_SECRET`; use the test secret with the test API key.
5. Set `STRIPE_PRICE_BASIC` to the matching test Price ID and keep
   `STRIPE_PRICE_PRO` unset.
6. Apply the database schema before enabling checkout. For the local setup,
   use `pnpm db:push` against the local database. For a remote database, set
   `ALLOW_REMOTE_DB_PUSH=true` only after reviewing the schema changes.
7. Test successful checkout, canceled/failed payments, duplicate webhook events,
   renewals, full refunds, and membership expiry before switching to live keys.
8. Before enabling paid checkout in a hosted environment, set matching live
   credentials, webhook secret, and live Basic Price ID in that host's secret
   manager. Keep Pro unset.

The API exposes `GET /api/billing/config`, `POST /api/billing/checkout`,
`POST /api/billing/portal` for legacy subscriptions, and the Stripe webhook
endpoint. Checkout stays disabled unless Basic billing is explicitly enabled
and all required credentials, price, and public origin are configured.
