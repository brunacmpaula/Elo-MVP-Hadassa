---
name: Live database schema validation
description: Why development schema checks query PostgreSQL catalogs instead of relying on Drizzle migration validation.
---

Validate required development tables and columns with read-only PostgreSQL catalog queries before starting services that depend on them.

**Why:** Drizzle's migration consistency check validates migration files and snapshots, not whether the connected development database actually contains the required tables. A live schema mismatch can otherwise remain hidden until an endpoint returns HTTP 500.

**How to apply:** Extend the existing read-only schema gate whenever a new essential Drizzle table is added, and keep its remediation message pointing to the normal non-forced schema push command.