# Contributing

## Fork attribution

This repository is a fork of [CodingButter/familywall-api](https://github.com/CodingButter/familywall-api).
Contributions should preserve the existing MIT license and this attribution.

## AI-assisted changes

AI-assisted work follows [`AGENTS.md`](./AGENTS.md). Use a fresh
`codex/<short-slug>` or `claude/<short-slug>` branch for every request and open
one focused PR per branch. Do not commit credentials, personal data, or AI
provider identity details. Existing Git identity and authentication are owned
by the contributor and must not be changed by automation.

Before opening a PR:

```sh
pnpm install --frozen-lockfile
pnpm run check
```

The package does not currently have a test suite; add or update tests when a
change introduces testable behavior.
