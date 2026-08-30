---
name: Video artifact registration
description: How to handle a delegated video build that produced files without registering a managed artifact.
---

After a delegated video build completes, confirm that it appears in `listArtifacts` and has an artifact-owned workflow before treating it as deliverable. A populated folder alone is not sufficient.

**Why:** A design worker can produce a valid composition in an unregistered folder. Without managed metadata, the preview workflow, injected `PORT`/`BASE_PATH`, export settings, and artifact presentation are absent or inconsistent.

**How to apply:** If registration is missing, preserve the composition outside the target path, bootstrap the official video artifact with `createArtifact`, then restore only composition files without overwriting managed metadata. Revalidate the recording lifecycle, build, workflow port, and preview assets afterward.