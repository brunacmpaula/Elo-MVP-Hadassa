---
name: OpenAPI Zod compatibility
description: Constraints for OpenAPI schemas generated against this workspace's Zod version.
---

Keep OpenAPI schemas from generating Zod v4-only static helpers while the
workspace depends on Zod 3. In particular, avoid `format: email` and OpenAPI
`integer` response fields in generated validators; use plain strings and
non-integer numbers plus application-level validation where needed.

**Why:** The current Orval generator emits `zod.email()` and `zod.int()` for
those schema forms, but those static helpers do not exist in the installed Zod
version, so code generation succeeds and the chained library typecheck fails.

**How to apply:** After every contract change, run API code generation
immediately. If the generated validator references static Zod helpers, adjust
the source OpenAPI shape rather than editing generated files.