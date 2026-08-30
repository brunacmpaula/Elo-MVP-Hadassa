---
name: Post persistence migrations
description: How to preserve legacy child records when adding durable post records and foreign keys.
---

When replacing in-memory parent records with PostgreSQL rows, backfill known legacy parents in the same migration before adding a foreign key from existing child records.

**Why:** Existing child rows may refer to identifiers that were valid only while the old process was running; adding the constraint first either fails or forces destructive cleanup of relationships that can still be recovered.

**How to apply:** Seed/backfill the known legacy parent identifiers, remove only rows that remain genuinely invalid, then add the FK; make runtime seed initialization conflict-safe for concurrent API starts.