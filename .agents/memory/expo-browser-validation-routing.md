---
name: Expo browser validation routing
description: How to interpret conflicting browser-test and appPreview results for Expo artifacts.
---

For Expo artifacts, a browser testing session can resolve the shared artifact path and show a blank root even while the direct Expo preview is healthy. Treat a successful `appPreview` capture and clean Metro logs as stronger evidence that the Expo web bundle is serving than a shared-route-only blank page.

**Why:** The shared proxy path and Expo’s direct development domain are separate routing surfaces; a tester can be blocked by the former without the application bundle being broken.

**How to apply:** Retry the tester against the Expo base route once. If it still cannot mount but `appPreview` renders and Metro is clean, classify the interactive run as an environment limitation and rely on deterministic UI tests plus direct preview evidence rather than changing application code.