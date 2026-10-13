# Vocab Forge Backend

NestJS 11 API for vocabulary sets, custom flashcards, and learning progress. Authentication uses HttpOnly JWT cookies or Google OAuth. Prisma ORM 6.19 connects to your hosted **Prisma Postgres** database; a separate PostgreSQL server is optional for local testing.

## Setup

Use Node.js 22 LTS (22.12+) or Node.js 24 and npm. `package-lock.json` is the dependency source for CI and Docker.

1. Copy `.env.example` to `.env`.
2. Generate pooled and direct TCP connection strings for the existing database in Prisma Console. Set `DATABASE_URL` to pooled and `DIRECT_URL` to direct; both must point to the same database.
3. Generate a JWT secret locally and save it in `JWT_SECRET`:

   ```sh
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

4. Install dependencies, generate the client, and migrate the intended development database:

   ```sh
   npm ci --ignore-scripts
   npm run db:generate
   npm run db:migrate
   npm run start:dev
   ```

The API defaults to `http://localhost:3000`; the frontend defaults to `http://localhost:8080`. Adjust `FRONTEND_URL` and `CORS_ORIGINS` together. [.env.example](.env.example) documents Google credentials, proxy trust, auth quotas, and learning thresholds. Leave both Google credentials empty to disable Google sign-in.

Your database stays on Prisma's servers. Replacing the old hosted `prisma+postgres://accelerate.prisma-data.net` URL changes the transport, not the database or its data. That connection retires on **December 1, 2026**; see the [official migration guide](https://www.prisma.io/docs/postgres/database/switch-from-accelerate). Production requires TCP URLs. Legacy URLs are temporarily accepted in development, but the SQL-based rate limiter requires TCP before authentication routes can work.

Never commit `.env`, connection strings, or JWT secrets. `dist/` is generated and ignored.

## API

Authenticated requests need the `access_token` cookie; browsers must use `credentials: 'include'`. Mutations use JSON and an allowed frontend Origin; JSON clients without an Origin are also supported. Production cookies are HttpOnly/Secure/SameSite=None; development uses SameSite=Lax.

| Endpoint                          | Behavior                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `POST /users/register`            | Creates an account from `name`, `email`, `password`; returns public fields.           |
| `POST /auth/login`                | Sets a one-day authentication cookie.                                                 |
| `GET /auth/profile`               | Returns `userId`, `email`, `name`.                                                    |
| `GET/PATCH /users/me`             | Reads or edits the authenticated account. An email change requires `currentPassword`. |
| `POST /users/change-password`     | Accepts `currentPassword`, `newPassword`; revokes all sessions.                       |
| `POST /auth/logout`               | Revokes all sessions and clears the cookie; send JSON `{}`.                           |
| `DELETE /users/me`                | Deletes the account and dependents; send JSON `{}`.                                   |
| `GET /auth/google`                | Starts Google sign-in with signed, expiring OAuth state.                              |
| `GET /auth/google/link`           | Requires login; explicitly links Google to the current account.                       |
| `GET /auth/google/callback`       | Verifies state and Google email before setting a cookie.                              |
| `GET/POST /word-sets`             | Lists owned sets or creates one.                                                      |
| `GET/PATCH/DELETE /word-sets/:id` | Reads, edits, or deletes an owned set.                                                |
| `POST /word-sets/:id/words`       | Creates a word in an owned set.                                                       |
| `PATCH/DELETE /words/:id`         | Edits or deletes an owned word.                                                       |
| `POST /words/:id/answer`          | Accepts `knows: boolean`, optional UUID `answerId`; records progress atomically.      |
| `GET/PUT /card-settings`          | Reads or updates the user's card setup.                                               |
| `POST /card-settings/count`       | Returns due count, matching total, and earliest future review for selected filters.   |
| `GET /card-settings/cards`        | Returns due cards in review order with selected front, back, and hint values.          |
| `GET /health/live`                | Process liveness.                                                                     |
| `GET /health/ready`               | Database readiness, or 503 when unavailable.                                          |

Public `/users` and `/users/:id` routes have been removed. Profile patches reject `password`, `googleId`, and unknown fields. Passwords must be 6–72 characters and no more than 72 UTF-8 bytes.

Google login does not automatically merge accounts by email: ordinary Google sign-in returns 409 if the email belongs to an existing local account. Sign in locally first, then use `/auth/google/link`. Google-only accounts cannot change email or set a password through profile patches.

Retry an answer using the same `answerId` after a network failure; reuse with different contents returns 409. Requests without an ID each count as new answers. Custom field patches merge keys; `customFields: null` clears the object. Deleting a set/account cascades through associated words and review events.

### Spaced repetition

Training uses a two-answer Leitner schedule. Each word stores `reviewBox` (0–6) and `nextReviewAt`. A successful answer advances the box and schedules the next review after 1, 3, 7, 14, 30, or 90 days. Box 6 stays at 90 days. A miss returns the word to box 0 for a review in 10 minutes. Intervals use elapsed UTC time; the frontend displays dates in the user's locale.

`GET /card-settings/cards` returns only due cards (`nextReviewAt <= now`), ordered by the oldest due date and then ID. The selected sets, statuses and filled card sides still apply. Learned words remain eligible for later review when their status is selected.

`POST /card-settings/count` returns `{ data: { count, total, nextReviewAt } }`: due cards, all matching words, and the earliest future review (or `null`). Answers persist scheduling, progress and history in the same transaction. Retrying the same answer ID does not advance the schedule again. Explicit status changes reset the box and make the word due immediately; ordinary text/custom-field edits preserve its schedule.

Migration `20261011150000_spaced_repetition` makes existing words due once without changing their counters or history. Deploy that migration and the backend before the frontend that reads the extended count response. This is a fixed-box schedule, not Anki's FSRS model or a personalized retention prediction.

### Pagination and errors

Training clients should page by the returned last cards `nextReviewAt` and `id`: send them as `afterReviewAt` (UTC ISO timestamp with milliseconds) and `afterId` on the next request. This remains valid if that card is rescheduled or deleted between requests. Both cursor fields are required together; do not combine them with a nonzero offset. Continue until a page contains fewer than `limit` cards.

Lists, set-detail words, and training cards accept `offset` (default 0, maximum 100000) and `limit` (default/maximum 100). Lists/cards keep array responses and expose `X-Next-Offset` for full pages; continue until absent, allowing a final empty page. Set details include `words`, `total`, `hasMore` and optional `search`/`status`.

Table selectors accept `all` or positive IDs; statuses accept `all`, `NEW`, `LEARNING`, `LEARNED`. Invalid IDs/filters, unknown fields, and null nonnullable values return 400. JSON bodies over 64 KB return 413. Missing/inaccessible resources return 404 and database conflicts return 409. Internal errors hide database details.

## Verification

```sh
npm run lint:check
npm run typecheck
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm audit
npm run build
```

Unit/HTTP tests use fixtures and never connect to your real database. Integration tests require an explicitly configured local PostgreSQL 16 database ending in `_test`. Apply migrations with its `DATABASE_URL`/`DIRECT_URL`, set `TEST_DATABASE_URL` to the same database, and run `npm run test:integration`.

Integration tests cover concurrent answers, duplicate IDs, custom field patches, ownership, cascades, shared quotas, and session revocation across independent Prisma clients. GitHub Actions also checks migration/schema drift, dependency advisories, and Docker startup.

## Deployment

See the [production runbook](docs/production.md) for release order, Docker images, frontend changes, connection budgets, backups, and monitoring. The runtime image runs as `node` with compiled code, a generated Linux Prisma client, and production dependencies. Run migrations separately once per release.
