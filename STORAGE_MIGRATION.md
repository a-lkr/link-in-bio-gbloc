# Portable profile-file storage

GBLOC supports local disk storage by default and an optional private
S3-compatible bucket. Both providers preserve the `/objects/...` paths stored
in PostgreSQL.

## Local disk

Set `STORAGE_PROVIDER=local` and `LOCAL_STORAGE_DIR` to a writable, persistent
directory. Uploads pass through the API using short-lived signed links. Do not
use an ephemeral filesystem for production or autoscaling deployments. Back up
the storage directory together with the database.

## S3-compatible storage

Set `STORAGE_PROVIDER=s3` and configure:

- `S3_BUCKET`
- `S3_REGION` (use the provider's region; `auto` works with some providers)
- `S3_ENDPOINT` when not using AWS S3
- `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE=true` if the provider requires path-style requests

Keep the bucket private. Configure its CORS policy to allow the app's exact
origin, `PUT` requests, the `Content-Type` header, and the required preflight
response headers. GBLOC serves profile assets through its API and does not
require public bucket access.

## Moving an existing installation

There is no automatic cross-provider migration command. Before changing
providers, make a verified copy of every object referenced by `profile_assets`
and preserve each `/objects/...` path. Compare file sizes and checksums, test
the destination with a backup database, and only then point the installation
at the new provider. Keep the original files until the destination and account
deletion behavior have been verified. Never connect a new local installation
to a production database as a migration shortcut.
