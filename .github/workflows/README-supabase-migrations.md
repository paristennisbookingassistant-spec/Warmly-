# Auto-apply Supabase migrations — one-time setup

This workflow (`.github/workflows/supabase-migrations.yml`) auto-applies any new SQL file under `supabase/migrations/` to production Supabase whenever it lands on `main`. After this is configured, you never need to paste SQL into Supabase's dashboard again.

## Required GitHub secrets

Three secrets need to be added to the repo. **One-time setup, then forever.**

| Secret name | What it is | Where to find it |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Personal access token for Supabase CLI auth | Supabase account settings → Access Tokens → Generate new token |
| `SUPABASE_PROJECT_REF` | The project ID (looks like `abcdefghijklmnop`) | In your Supabase project URL: `https://supabase.com/dashboard/project/<PROJECT_REF>` |
| `SUPABASE_DB_PASSWORD` | The database password used by `supabase db push` | Supabase project → Settings → Database → "Database password". You set this when the project was created. |

## Steps

### 1. Get `SUPABASE_ACCESS_TOKEN`
1. Open https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Name it `github-actions-migrations` (or anything you remember)
4. Copy the token. **It's only shown once.**

### 2. Get `SUPABASE_PROJECT_REF`
1. Open your Warmly project in Supabase
2. Look at the URL: `https://supabase.com/dashboard/project/<this-is-the-ref>`
3. Copy that string

### 3. Get `SUPABASE_DB_PASSWORD`
1. Open your Warmly project → Settings → Database
2. Find "Database password"
3. If you remember it: just paste it. If not: hit "Reset database password" (note: this requires updating any other places that hold it — Vercel `DATABASE_URL` etc.)

### 4. Add all three as GitHub secrets
1. Open your GitHub repo → Settings → Secrets and variables → Actions
2. Click **"New repository secret"** three times
3. Add each one with the exact name above

### 5. Trigger the first run
After saving all three secrets, you have two options:
- **Wait for the next migration push** — next time a file under `supabase/migrations/` changes, it auto-runs
- **Trigger manually now** — Actions tab → "Apply Supabase Migrations" → Run workflow → main. This applies any already-committed but unapplied migrations.

## What if a migration was already applied manually?

If you applied a migration via the SQL editor BEFORE this workflow existed, then the CLI doesn't know it's already done. When the workflow runs `supabase db push`, it'll try to apply the migration again and fail with "column already exists" (or similar).

**Fix:** mark the already-applied migration as done in the CLI's tracker:

```bash
# Locally (one-time, then commit nothing — this just updates the
# remote tracking table):
supabase login
supabase link --project-ref <PROJECT_REF>
supabase migration repair --status applied <timestamp>
```

Where `<timestamp>` is the prefix of the migration file (e.g., `20260512000000` for `20260512000000_add_company_id_to_slug_cache.sql`).

For Warmly: the **only** migration in this state is `20260512000000_add_company_id_to_slug_cache.sql`, mentioned in `docs/PROJECT_MEMORY.md` as never applied. If you have NOT yet applied it manually, the workflow will apply it on first run and there's nothing to repair. If you have, run the `migration repair` command above.

## Audit trail

Every migration run shows up in the Actions tab with the full SQL output, what was applied, and (if it failed) why. So even when migrations apply automatically, there's full visibility on what changed and when.

## What if a migration fails?

The workflow fails loudly:
- The GitHub Actions run goes red
- A comment is added to the failing commit explaining where to look
- The migration that failed stays unapplied — no half-state

Fix the migration file, push the fix, the workflow re-runs and applies it.

## Common failure modes

| Error | Cause | Fix |
|---|---|---|
| `Authentication failed` | Wrong access token or token expired | Regenerate `SUPABASE_ACCESS_TOKEN` |
| `connection refused` | Wrong DB password | Reset DB password in Supabase, update secret |
| `column "X" already exists` | Migration was applied manually | Run `supabase migration repair --status applied <ts>` once |
| `permission denied for table` | Migration touches a table you don't have privileges on | Use the service-role connection (workflow already does) |
| `relation "X" does not exist` | Migration references a table that hasn't been created in any prior migration | Check that migrations apply in order; add missing `CREATE TABLE` |

## Future: previews / staging

If we ever add a staging Supabase project (e.g., for PR preview deploys), we can extend this workflow to apply migrations to staging first, then production. For now, single environment = simpler.
