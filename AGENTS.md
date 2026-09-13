# AI development contract

This is the shared operating contract for Codex, Claude Code, and any
subagents working in this repository. `CLAUDE.md` points here so the tools do
not drift apart.

## Repository context

- This is a TypeScript package published as `familywall-api`.
- The project is a fork of [CodingButter/familywall-api](https://github.com/CodingButter/familywall-api).
- Preserve that attribution and the MIT license. Do not rewrite history or
  remove original copyright notices.
- The default branch is `main`. Treat it as protected even if GitHub branch
  protection is not enabled.

## Required change workflow

Every change must be isolated in a new branch and delivered as its own PR:

1. Start from an up-to-date `main` and inspect the worktree first. Never
   commit directly to `main`.
2. Create one branch for this request using `codex/<short-slug>` or
   `claude/<short-slug>`. Do not reuse a branch from another task.
3. Keep the branch focused and run `pnpm run check` before committing.
4. Review the diff for secrets, personal data, generated output, and accidental
   attribution changes.
5. Push the branch and open one PR against `main` using the repository PR
   template. Pushing requires the user's already-configured GitHub access; do
   not create, copy, print, or persist credentials or tokens.
6. Do not merge the PR unless the user explicitly asks. Completion means the
   PR is open and checks are green, or the exact blocker is reported.

If subagents are available, use lower-cost models for read-only reconnaissance,
documentation lookup, diff review, and test-output summarization. Keep
implementation, security decisions, and final review on the primary model.
Subagents must not push, create PRs, change Git identity, or handle secrets.

## Security and identity rules

- Never put passwords, session cookies, API keys, access tokens, private keys,
  `.env` contents, or real FamilyWall account data in the repository, commits,
  PR text, logs, examples, or screenshots.
- Use placeholders such as `email@example.com` and `yourpassword` only.
- Never change `user.name`, `user.email`, commit signing, remotes, or GitHub
  credentials. Do not add AI co-author trailers or provider usernames.
- Do not print environment variables, credential stores, or authenticated
  remote URLs.
- Do not claim original authorship for forked code.

## Validation

The minimum validation command is:

```sh
pnpm run check
```

Changes to authentication, request serialization, or calendar mutations need
extra tests or a clear explanation of why tests cannot exercise the live API.
Never call the live FamilyWall API during automated validation.
