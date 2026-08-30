---
name: Expo stale preview process
description: How to handle an Expo preview that keeps serving an old bundle after a workflow restart.
---

If restarting the Expo workflow reports that its assigned port is already running the same app and waits for permission to use another port, treat the existing listener as an orphaned process rather than accepting a new port.

**Why:** A stale Expo process can continue serving an older bundle while the managed workflow remains blocked on an interactive port prompt, making source changes appear ineffective.

**How to apply:** Inspect the reported process and port, terminate only the orphaned Expo process, then restart the exact managed workflow once and verify the affected route in the app preview.