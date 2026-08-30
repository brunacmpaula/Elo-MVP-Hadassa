---
name: Offline sync state commits
description: Durable concurrency rules for queues that reconcile local entities with server responses.
---

Treat the offline queue, locally rendered entities, and local-to-server identifier mappings as one durable state transition. Serialize storage writes, and use a generation guard so clearing state invalidates both successful and failed in-flight continuations.

**Why:** Independent persistence calls can finish out of order, resurrect acknowledged work, or reapply failed local entities after a reset. A transient identifier mapping can also leave restored local detail routes unresolved.

**How to apply:** Any new offline operation or reset must use the same persistence chain. After each network await, verify the active generation before mutating memory. If work arrives during a sync, start a new round only for operations not processed by the current round.