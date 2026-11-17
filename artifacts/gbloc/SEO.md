# Search indexing

The API generates `/api/sitemap.xml` from the installation's configured public
origin. It includes public pages and eligible profiles, but excludes account
and profile-management routes.

After deploying on a domain you control:

1. Set `GBLOC_PUBLIC_ORIGIN` to the canonical HTTPS origin.
2. Verify that the app and `/api/sitemap.xml` load on that domain.
3. Add the domain to your search-console provider and complete ownership
   verification.
4. Submit the sitemap URL and check its status.

The sitemap is generated from current profile records when requested. Page
titles and descriptions are maintained in `src/lib/seo-pages.json`; public
profile sharing uses the profile owner's username, description, and image.
