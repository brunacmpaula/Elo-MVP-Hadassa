# Elo

Aplicativo mobile offline-first que conecta missionários e apoiadores.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/elo-mobile run dev` — run the Expo app through its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo, React Native, Expo Router, TanStack Query
- API: Express 5
- Persistence: local offline repository on mobile; in-memory MVP API store
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Mobile app: `artifacts/elo-mobile`
- API server: `artifacts/api-server`
- API contract: `lib/api-spec/openapi.yaml`
- Generated API client: `lib/api-client-react`
- Brand tokens: `artifacts/elo-mobile/constants/colors.ts`

## Architecture decisions

- The local repository is authoritative for missionary writes so offline work never blocks on HTTP.
- Sync operations have unique IDs and remain queued until an acknowledgement is received.
- The app includes a connectivity simulation switch so the offline demo is reproducible.
- The first server store is intentionally small and in memory; PostgreSQL is the next persistence adapter.

## Product

Missionaries create and edit updates, prayer requests, and needs while offline.
Supporters discover and follow missionaries, read posts, and mark that they are praying.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
