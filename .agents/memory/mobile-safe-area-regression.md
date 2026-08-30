---
name: Mobile safe-area regression
description: How to preserve safe-area coverage in the Expo app when CI has no native simulator runner.
---

The mobile package currently has no native simulator or screenshot runner. Its safe-area regression should therefore pair a deterministic geometry contract for iPhone, Android, and web with stable `testID` selectors on important controls.

**Why:** A source-level geometry contract runs in the existing lightweight `node:test` suite while still catching changes that remove the inset, tab-bar, or modal clearance. Stable selectors make the same scenarios easy to promote to device screenshots later.

**How to apply:** When changing navigation, tab bars, modal sheets, or screen-level safe-area handling, update the scenario matrix and keep both iPhone profiles (notch and Dynamic Island) plus Android and web in the checks.

For iOS NativeTabs, treat the visible tab controls as a separate 50pt clearance
above the device bottom inset. A scrollable view using automatic inset adjustment
should add only that 50pt; fixed footers and manually adjusted content must reserve
the bottom inset plus the tab height.

**Why:** NativeTabs does not reliably keep translucent Liquid Glass controls out of
scrollable content, while adding the full bottom inset to an automatically adjusted
scroll view creates duplicated space.

**How to apply:** Keep automatic and manual callers explicit when using the shared
tab-padding policy, and leave the classic-tab formula unchanged for Android, web,
and older iOS.

NativeTabs dependency upgrades must update the declared supported-stack policy and
the deterministic geometry matrix in the same change; do not silently change the
50pt clearance.

**Why:** The visible native tab controls are supplied by Expo/iOS rather than by
the app, so an upstream geometry change can hide controls without producing a
TypeScript or JavaScript error.

**How to apply:** Treat Expo SDK, Expo Router, and Liquid Glass package changes as
safe-area changes. Reconfirm the iOS support floor and visible tab-bar height
before accepting the upgrade.