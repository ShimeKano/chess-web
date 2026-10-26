# AI Pull Request Playbook

This document is the default operating procedure for future requests to prepare, fix, or open a pull request in this repository. Treat a request to "make the PR" as responsibility for completing the engineering work, not merely creating a branch or pushing code for the user to finish.

## Required end-to-end workflow

1. **Clarify only real blockers.** Infer reasonable implementation details from the request and repository conventions. Ask a question only when an essential requirement cannot be safely inferred.
2. **Inspect before editing.** Read the relevant source, configuration, workflows, tests, recent commits, and the full PR diff. Check the existing PR before creating another one; update the existing PR when it is the right place for the work.
3. **Implement the whole agreed scope.** Connect new data and features to the actual user interface/runtime; do not count unused files, schemas, or documentation as a completed user-facing feature. Preserve existing behavior unless a change is required.
4. **Remove verified dead code and clutter.** Check for unused imports, unreachable/dead helpers, duplicate logic, stale comments, temporary debug code, and redundant files. Remove only items verified to be unused; do not perform risky cosmetic rewrites unrelated to the task.
5. **Test before handing off.** Run available lint, unit/integration tests, validators, and production builds. Add focused tests for new behavior when practical. Check edge cases and regressions, not only whether the code compiles.
6. **Test deployment realistically.** Inspect the actual deploy triggers, runtime versions, environment variables, permissions, and hosting constraints. If a live preview cannot be deployed before merge, provide a pre-merge build artifact or another reproducible local test path. Never claim a browser test, deployment, or runtime check that was not actually performed.
7. **Use the required runtime.** Respect repository-pinned versions (for this project, Node.js 24 LTS) across local guidance and CI. Keep workflows consistent with the package engine requirements.
8. **Review the final diff.** Inspect every changed file for scope, secrets, accidental generated files, unnecessary dependencies, accessibility, error handling, and misleading documentation. Verify the diff against the original request.
9. **Run checks again after the final edit.** Wait for CI to finish, inspect individual job/step results, and fix failures rather than reporting an earlier run as proof of the latest commit.
10. **Update the PR and report clearly.** Keep the PR description current with implementation details, checks run, known limitations, and any manual steps genuinely required. Link to the PR and workflow run. State what passed, what was not testable, and whether it is ready for review.

## Approval and safety boundaries

- Do **not** merge, release, publish, delete user data, or make other consequential production changes unless the user explicitly authorizes that action.
- Creating/updating a branch, commits, PR description, CI checks, and pre-merge test artifacts is part of preparing the PR when requested.
- Never offload work to the user merely because it involves several ordinary engineering steps. Complete all steps possible with available tools first.
- If a tool, permission, external secret, or environment prevents a step, try a safe alternative and explain the exact remaining blocker. Do not fabricate results or say "done" for an unverified step.
- Distinguish clearly between **build/CI success**, **automated behavioral tests**, **manual browser verification**, and **production deployment**; they are not interchangeable.

## Definition of done

A PR task is complete when the agreed code is implemented and integrated, verified dead code is cleaned up, applicable checks pass on the final commit, a reproducible pre-merge test path is available where practical, the PR is up to date, and the user receives a concise evidence-based report. If any criterion cannot be met, identify it explicitly instead of silently handing it back to the user.
