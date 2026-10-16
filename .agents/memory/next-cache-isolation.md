---
name: Next.js cache isolation
description: Why the running preview must not share output with production builds.
---

Keep Next.js development and production build outputs isolated.

**Why:** A production build performed while the preview was running produced a `__webpack_modules__[moduleId] is not a function` runtime error. Both processes were writing different webpack modules into the same output directory.

**How to apply:** Preserve the configured development/production separation. Validate build changes with the preview running, and confirm that the preview still serves pages afterward; do not treat a successful build alone as proof that the preview remains healthy.
