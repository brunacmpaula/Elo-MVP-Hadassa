---
name: Auth route ownership
description: Why authentication transitions should be owned by protected root routes rather than imperative navigation.
---

Authentication state changes should select the available root routes through protected route guards. Login and logout functions should update session state and persistence, not issue imperative navigation actions while the tab navigator is mounting or unmounting.

**Why:** An imperative replace during an authentication transition can be handled by the wrong navigator and collapse a qualified grouped route into an ambiguous `index` action.

**How to apply:** Keep public and authenticated screens in separate protected groups at the root layout. Preserve any explicit grouped Feed redirect at the route boundary, and let guard changes handle login, restored sessions, and logout.