---
name: Post persistence migrations
description: How to preserve legacy child records when adding durable post records and foreign keys.
---

When replacing in-memory parent records with PostgreSQL rows, backfill known legacy parents in the same versioned migration before adding a foreign key from existing child records. A Drizzle schema push alone only updates the current development database; it does not make a fresh environment reproducible.

**Why:** Existing child rows may refer to identifiers that were valid only while the old process was running; adding the constraint first either fails or forces destructive cleanup of relationships that can still be recovered.

**How to apply:** Add the SQL migration, journal entry, and next snapshot; seed/backfill known legacy identifiers, remove only rows that remain genuinely invalid, then add the FK. Make runtime seed initialization conflict-safe for concurrent API starts.