# Remaining FamilyWall API support: delivery sequencing

Status: Tier A implemented in this PR. Tier B remains blocked.

The original intent was to plan here and implement across separate PRs. At the
repository owner's direction the Tier A implementation was folded into this same
PR instead, so the sequencing below is a record of how the work was ordered
rather than a forecast of PRs still to come.

## Purpose

[`expanded-api-support.md`](./expanded-api-support.md) already specifies the six
outstanding areas in detail. That specification is not superseded here and
remains the authority on per-operation requirements, validation rules, and test
obligations.

What that document does not provide is a delivery order. It presents six areas
as peers, which obscures the fact that roughly half of the remaining work is
blocked on unknown server contracts rather than on implementation effort.
Sequencing the work by evidence strength lets the source-backed operations ship
without waiting on the ones that cannot responsibly be written yet.

This document therefore records: what shipped, what is implementable now, what
is blocked, and the PR sequence that follows from that split.

## Baseline

Merged as of `dfdd8f8`. The first messaging slice landed read-only access:

- `getThreads()` — `src/client.ts`
- `getThreadMessages(threadId, options?)` — `src/client.ts`, one bounded page

Everything else from the expanded plan remains unimplemented: list-item
mutations, message sending, message pagination and ordering, attachment
downloads, planned meals, recipes, and calendar date-range filtering.

## Evidence tiers

Tiering follows the reference evidence already recorded in the expanded plan:
the Snowsand FamilyWall skill v1.3.0, reviewed 2026-09-13. "Source-backed" means
an operation is implemented in that client's Python source. It does not mean the
contract is validated against a live FamilyWall account, and it does not remove
any verification gate the expanded plan sets for that operation.

### Tier A — source-backed, implementable now

| Operation | Reference evidence |
| --- | --- |
| Add list item | `taskcreate`; `a00taskListId`, `a00text`, optional `a00quantity` |
| Complete/uncomplete item | `taskmark`; `a00taskId`, `a00complete=true/false` |
| Calendar date range | `evtlistinterval`; `a00from`, `a00to` |
| Send text message | `imsend`; `a00threadId`, `a00text` |
| Attachment download | message `medias`, authenticated GET of `pictureUrl` |

### Tier B — blocked pending contract evidence

| Operation | Evidence gap |
| --- | --- |
| Edit/delete list item | Absent from the reference client; no endpoint name exists to work from |
| Planned meals | Page names `mplistinterval`, `mpcreate`, `mpmealput` only; the CLI calls client methods that are not present in the versioned source |
| Recipe create/import | Page names `mprecipeput`, `mprecipeputbyurl` only |
| Recipe categories | Page name `mpcategorylist` only; create/edit/delete and assignment contracts absent entirely |
| Ingredients to shopping list | Page name `mpadditemtolist` only; unresolved whether it accepts a recipe directly or requires a planned meal |

Tier B covers the majority of the originally requested scope. A page name or a
CLI command name does not establish a working API. Per the expanded plan, these
operations stay blocked rather than being implemented against guessed endpoints.

## Delivered

All five Tier A operations shipped, together with their Family facade methods,
exported types, README examples, and tests:

| Method | Endpoint |
| --- | --- |
| `addListItem(listId, input)` | `taskcreate` |
| `setListItemCompleted(itemId, completed)` | `taskmark` |
| `getCalendarEventsInRange(calendarId, options)` | `evtlistinterval` |
| `sendMessage(threadId, input)` | `imsend` |
| `downloadAttachment(attachment, options?)` | authenticated GET |

Two signatures diverged from the names proposed in the expanded plan, in both
cases to follow the wire contract rather than the proposal:

`setListItemCompleted` takes no list identifier. `taskmark` is documented only
with `a00taskId`, and accepting a `listId` the client would never send would
imply a scoping guarantee that does not exist.

Ranged calendar reads became `getCalendarEventsInRange` rather than an optional
argument on `getCalendar`. The interval endpoint returns an event collection
instead of a sync payload, so overloading `getCalendar` would have meant either
breaking its return contract or fabricating sync metadata around the result.
`Family.getCalendarEvents()` keeps its no-argument behavior exactly and routes
to the new method only when a range is supplied.

## PR sequence

Each item below is one branch and one PR, per `AGENTS.md`. Per-operation
requirements are not restated here; the referenced section of the expanded plan
governs. PR 1, PR 2, and PR 5 have no interdependencies and may run in parallel.

### PR 1 — List-item add and completion

Governed by expanded plan section 1. Scope limited to `addListItem` and
`setListItemCompleted`; edit and delete are deferred to Tier B.

Completion takes an explicit boolean so that repeating a request cannot invert
state. No blind toggle. Ships the largest practical gap in the lists feature and
establishes the item-write path that Tier B's ingredient transfer will need.

The PR must record the deferral of edit/delete and its evidence gap, so the
omission reads as a decision rather than an oversight.

### PR 2 — Calendar date-range filtering

Governed by expanded plan section 2. Routes to `evtlistinterval` when range
options are supplied and preserves the existing `evtsync` request for no-argument
calls, keeping the current return contract intact.

`src/client.ts` hardcodes `Europe/London` in two calendar mutation helpers. Range
handling must interpret date-only and day-count inputs through the client's
configured timezone instead, established in the constructor. Inheriting the
hardcoded zone would silently shift range boundaries for every other locale.

### PR 3 — Message sending and pagination

Governed by expanded plan section 3. Adds `sendMessage(threadId, input)` and
implements pagination and ordering to the extent evidence supports.

This PR owns the README correction. The README currently states that messaging
is read-only and that the library does not send messages. Both statements are
accurate today and must stop being accurate only in the same change that makes
sending real, so documentation never leads the implementation.

Writes are not retried automatically. A lost response may follow a successful
send, and the resulting ambiguity is documented rather than papered over with a
retry that risks duplicate delivery.

### PR 4 — Attachment downloads

Governed by expanded plan section 4. Attachment metadata parsing already exists;
the remaining work is resolution and retrieval of the underlying bytes.

The substance of this PR is its security envelope rather than its transport.
Downloads use a dedicated binary GET path that does not reuse the API form body
or blindly forward cookie and CSRF headers to third-party hosts. Origins and
redirect targets are validated before any credential is forwarded. Downloads are
bounded while reading, including when `Content-Length` is absent or wrong, and
video is streamed rather than buffered by default.

Depends on PR 3 only where locating a message requires history continuation.

### PR 5 — Contract-discovery spike for Tier B

Not an implementation PR. Investigates a newer reference client version or
public first-party web-client code to resolve the Tier B contracts: item edit and
delete, planned meals, recipes, categories, and ingredient transfer.

The deliverable is an evidence record in the expanded plan, updating its
reference table with exact findings. Either outcome is a real result: resolved
contracts spawn implementation PRs 6 and beyond, and unresolved ones are recorded
as formally blocked with the gap stated.

Worth running early and in parallel with PRs 1 through 4, because a positive
result reshapes the entire back half of this roadmap and a negative one settles
the scope question that currently sits over it.

### PRs 6+ — Tier B implementation

Conditional on PR 5. Governed by expanded plan sections 1 (edit/delete), 5
(planned meals), and 6 (recipes and shopping-list integration).

Known ordering constraints within this group: recipe-linked meal creation depends
on recipe ID retrieval, and ingredient transfer to a shopping list depends on the
item-write path from PR 1. Free-text meal creation can land ahead of recipes if
the contract supports it.

## Constraints

All automated validation stays offline with mocked fetch; the live FamilyWall
API is never called during automated checks. Every PR runs `pnpm run check`
before commit. Any manual protocol verification requires separate authorization
and leaves no account data, credentials, or raw captures in the repository, logs,
or PR text. Original fork attribution and MIT licensing are preserved throughout.
