# SEO Strategy

## In scope
- Thai-language GBLOC marketing home, pricing, public legal/cookie pages, and public `/@username` personal profiles (legacy `/{username}` URLs redirect).
- Source-detectable WCAG 2.2 A/AA accessibility on public pages, including public authentication entry points.

## Out of scope
- Authenticated profile editing, account management, administration, moderation, and internal mockup sandbox.

## Target audience
- Thai-speaking creators and individuals building a customizable link-in-bio profile with social links and media.

## Primary topics
- Link in bio, personal profiles, social link aggregation, customizable creator pages.

## Crawler assumptions
- Public pages should be discoverable, shareable, and readable by search and AI retrieval crawlers.
- The canonical origin is configured per installation with `GBLOC_PUBLIC_ORIGIN`.
- Vite React frontend now server-renders marketing, pricing and legal content through entry-server.tsx; Express returns static profile content and sharing metadata for `/@username` via the frontend proxy.
- `/api/sitemap.xml` enumerates public routes/profiles; `/terms` and `/privacy` permanently redirect to sections on `/legal`.

## Dismissed categories
- None recorded.
