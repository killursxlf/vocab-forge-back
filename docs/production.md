# Production deployment

## Configuration

Use HTTPS and the pooled/direct TCP URLs for the same hosted Prisma Postgres database. Generate them in Prisma Console; editing an Accelerate URL does not create valid credentials. See [Prisma's connection guide](https://www.prisma.io/docs/postgres/database/connecting-to-your-database).

Store secrets in the deployment's secret manager. Set `NODE_ENV=production`, `DATABASE_URL`, `DIRECT_URL`, a random `JWT_SECRET` of at least 32 characters, HTTPS `FRONTEND_URL`, and explicit HTTPS `CORS_ORIGINS`. Google OAuth is optional; if enabled, register the exact HTTPS callback and set both credentials.

Behind an ingress, set `TRUST_PROXY` to only its IPs/CIDRs and restrict direct backend access. The ingress must replace forwarded client IP headers. Without proxy trust, clients share the ingress's auth quota; trusting arbitrary proxies lets clients spoof IPs. Never use `true`, `0.0.0.0/0`, or `::/0`.

## Release order

```sh
docker build --target migrations -t vocab-forge-migrations:RELEASE .
docker build -t vocab-forge-back:RELEASE .
```

1. Run CI and stage the release using the intended transport and proxy configuration.
2. Check migration status, take a verified backup, and confirm the restore procedure.
3. Run one migration job with production secrets:

   ```sh
   docker run --rm --env-file /secure/path/backend.env vocab-forge-migrations:RELEASE
   ```

4. Start the API behind the HTTPS ingress:

   ```sh
   docker run -d --name vocab-forge-back --restart unless-stopped --init \
     --env-file /secure/path/backend.env -p 127.0.0.1:3000:3000 \
     vocab-forge-back:RELEASE
   ```

5. Route traffic after `/health/ready` returns 200. Use `/health/live` for liveness. Allow graceful SIGTERM shutdown to release Prisma connections.
6. Smoke test registration/login/logout, Google login/linking if enabled, deletion, and card pagination from the real frontend.

The runtime does not migrate on startup. The migration image retains the Prisma CLI; the runtime prunes development dependencies. Build without production secrets and inject them when running containers.

The migration adds session versions, shared auth quotas, indexes, and cascading foreign keys. It does not delete existing data; subsequent account/set deletions remove dependents. Schedule DDL/index locks during maintenance for a large database. Never deploy with `migrate reset` or `db push`.

## Compatibility and rollout

- Existing JWTs require a new login because tokens now require version, issuer, and audience. Email/password changes and logout revoke all devices.
- Replace removed public account routes with `/users/me`. Email changes require the current password; use the dedicated password endpoint.
- Send JSON on mutations, including logout and deletion. Allow the actual frontend Origin in configuration.
- Consume paginated lists and cards; defaults return at most 100 entries.
- Existing local accounts sign in before explicitly linking Google. Automatic email-based linking is disabled.
- Replace the hosted Accelerate URL before production startup. This PR changes no cloud credentials and applies no production migrations.
- Review previously linked accounts if the old linking behavior was exposed. If the old public routes exposed account data/hashes, investigate logs and rotate affected credentials; a patch cannot repair prior exposure.

Coordinate this release so old unguarded replicas stop serving traffic. Retain the previous image for operational rollback, but rolling back restores its vulnerabilities. The migration is additive except for foreign-key behavior; use a verified backup for data recovery.

## Small-scale operation

Start with one or two replicas behind an HTTPS ingress and the same Prisma Postgres database. No sticky sessions are required: JWT secrets, OAuth state signatures, database session versions, and SQL-backed quotas are shared. Keep secrets/origins identical.

Authentication uses a fixed per-IP window: 20 attempts per 60 seconds by default across registration, login, profile/password edits, and Google initiation. Expired rows are cleaned up every minute. Shared NAT traffic may need a higher quota. Configure ingress request/concurrency limits for all routes; application quotas cover authentication rather than total traffic.

Budget Prisma connections deliberately, for example `connection_limit=5&pool_timeout=10` in each replica's pooled URL. Check the Prisma plan's current limits and leave room for deployment overlap and maintenance; replicas multiplied by connections per replica must fit the budget. Add replicas after measuring latency and database pressure.

Answer transactions retry serialization conflicts at most five times; persistent contention returns 409 and clients can retry with the same answer ID. Offset pages suit small datasets; move to cursors when users routinely approach offset 100000. Card column metadata still scans selected sets; profile before changing it.

## Monitoring and recovery

Forward JSON logs to your logging provider. `X-Request-Id` correlates requests with method, path without query strings, status, and duration. Passwords, cookies, request bodies, and connection strings are not logged.

Track request volume, latency percentiles, 4xx/5xx, auth 429s, readiness failures, PostgreSQL connections, slow queries, and storage growth. Alert on sustained errors and saturated connections. Health probes do not replace metrics or exception monitoring.

Enable appropriate Prisma backup/retention options and rehearse a restore into a separate database. Run a representative staging load test with two replicas before raising traffic; local integration tests verify consistency, not production throughput. Review review-event retention as usage grows.
