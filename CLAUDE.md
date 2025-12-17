# Claude Code Project Notes

## Database Schema

**IMPORTANT:** Use the `domainfolio` schema (NOT `public`) for ALL database tables.

```sql
-- Correct schema usage
domainfolio.users
domainfolio.domains
domainfolio.registrars
domainfolio.alerts
domainfolio.alert_settings
domainfolio.registrar_connections
domainfolio.domain_history
```

The Supabase client is configured with `domainfolio` as the default schema in `lib/supabase.ts`.

## Project Overview

Domainfolio is a universal domain portfolio dashboard that tracks domains across multiple registrars.

**Tech Stack:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (shared project with bucketlist: uykxgbrzpfswbdxtyzlv)
- Zustand for state management

## Scripts

### Migrations

```bash
# Run a SQL migration
node scripts/run-migration.js supabase/migrations/001_initial_schema.sql
```

## Database Tables

| Table | Description |
|-------|-------------|
| `users` | User profiles (linked to auth.users) |
| `domains` | User's tracked domains |
| `registrars` | Supported registrars (Namecheap, Porkbun, etc.) |
| `registrar_connections` | User's API credentials per registrar |
| `alerts` | Expiration and status alerts |
| `alert_settings` | User notification preferences |
| `domain_history` | Audit log of domain changes |

## Key Files

- `lib/supabase.ts` - Supabase client (schema: domainfolio)
- `app/page.tsx` - Main dashboard
- `supabase/migrations/` - Database migrations

## Enum Values

**Domain Status:** active, expiring, expired, transferred, pending

**Alert Types:** expiring_soon, expired, ssl_expiring, dns_issue, sync_error, renewal_failed

**Alert Severity:** info, warning, critical

**User Plans:** free, pro, team
