---
name: Expo browser preview limitation
description: Why browser-based checks may not represent the Expo Go artifact in this workspace.
---

The Expo artifact is routed for Expo Go rather than as a normal web app. Browser automation against the shared `/elo-mobile/` proxy can load the HTML shell but return 404 for the absolute Expo Router bundle, leaving a blank page. The artifact screenshot path may still show the landing/login screen, so do not treat a browser blank page alone as a native bundle failure.

**Why:** The generated HTML requests the Metro bundle from an absolute `/node_modules/...` path while the artifact is mounted under a path prefix; the native iOS/Android bundles can build successfully even when that browser route cannot resolve the script.

**How to apply:** For native-flow release checks, prioritize the iOS/Android Expo bundle build and source-level contracts. Use the browser only for incidental visual checks, and report native picker interaction as unverified unless a physical device or a real native simulator is available.