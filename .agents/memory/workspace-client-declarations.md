---
name: Workspace client declarations
description: Why generated API source can appear current while Expo consumers still report missing exports.
---

When generated API source has the expected hooks and schemas but a referencing app still reports missing exports or fields, rebuild the workspace library declarations before changing consumer code.

**Why:** TypeScript project references can resolve the library's emitted declarations, which remain stale even though the generated source files are current. This makes valid API fields look absent in the Expo app.

**How to apply:** Run the workspace library typecheck/build after API code generation or task merges that update generated clients, then rerun the consumer's typecheck. Only edit imports or types if errors remain after declarations are refreshed.