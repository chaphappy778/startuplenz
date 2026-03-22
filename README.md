# StartupLenz

StartupLenz is a SaaS platform for surfacing real-time startup intelligence — tracking funding rounds, team changes, product launches, and market signals across verticals.

## Monorepo Structure

| Path | Description |
|---|---|
| `apps/web/` | Next.js front-end application |
| `services/sync/` | Data ingestion and sync service |
| `services/alerts/` | Alerting and notification service |
| `packages/vertical-models/` | Shared data models across verticals |
| `supabase/migrations/` | Supabase database migration files |
| `docs/` | Project documentation |

## Tech Stack

- **Frontend:** Next.js, TypeScript
- **Backend:** Node.js microservices
- **Database:** Supabase (PostgreSQL)
- **Monorepo tooling:** Turborepo (recommended)

## Getting Started

> Setup instructions will be added as services are scaffolded.
