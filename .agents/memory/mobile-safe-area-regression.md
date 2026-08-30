---
name: Mobile safe-area regression
description: How to preserve safe-area coverage in the Expo app when CI has no native simulator runner.
---

The mobile package currently has no native simulator or screenshot runner. Its safe-area regression should therefore pair a deterministic geometry contract for iPhone, Android, and web with stable `testID` selectors on important controls.

**Why:** A source-level geometry contract runs in the existing lightweight `node:test` suite while still catching changes that remove the inset, tab-bar, or modal clearance. Stable selectors make the same scenarios easy to promote to device screenshots later.

**How to apply:** When changing navigation, tab bars, modal sheets, or screen-level safe-area handling, update the scenario matrix and keep both iPhone profiles (notch and Dynamic Island) plus Android and web in the checks.