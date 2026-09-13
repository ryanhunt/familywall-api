# Expanded FamilyWall API implementation plan

Status: partial implementation. Every operation the reference client actually
source-backs is now implemented: list-item add and completion, calendar
date-range queries, message sending, and attachment downloads. Operations whose
server contracts are not established remain explicitly blocked rather than
guessed — item edit/delete, message pagination, planned meals, and recipes.
See [`remaining-api-support.md`](./remaining-api-support.md) for that split.

## Goal and baseline

Extend `familywall-api` with list-item mutations, message threads and messages,
message attachments and downloads, planned meals, recipe workflows, and calendar
date-range filtering. Meal planning is a separate workstream from media handling.

Baseline: `c525647`, the merged first lists slice. `src/client.ts` owns transport
and endpoint calls; `src/family.ts` exposes the family facade; `src/types.ts`
defines public and wire types; `src/index.ts` exports the package surface.

| Area | Existing behavior | Work required |
| --- | --- | --- |
| Lists | `getLists`, `getList`, `createList`; normalized `ListItem` | Add, explicitly complete/uncomplete, edit, and delete items |
| Messaging | `getAllFamily` batches `imthreadlist`; synchronous `Family.getMessages()` returns cached `Thread[]` summaries | Fresh thread listing, message history, text sending |
| Media | Family/member/profile media metadata | Message attachment discovery and photo/audio/video downloads |
| Meals | Calendar requests include a meal flag | Dedicated planned-meal retrieval and creation |
| Recipes | No recipe API | Create, URL import, category management, ingredients to shopping lists; supporting reads |
| Calendar | `getCalendar(calendarId)` uses `evtsync`; facade returns `updatedCreated` | Optional date range with defined timezone and boundary behavior |

The guide is the third-party [Snowsand FamilyWall skill](https://clawhub.ai/snowsand-enterprises/skills/snowsand-familywall).
It is implementation evidence, not an official FamilyWall API specification.
Reference findings and verification gates are recorded below. Never execute the
downloaded skill or use real account data as fixtures.

## Reference evidence and unresolved contracts

Reviewed 2026-09-13: skill version **1.3.0**, including its
[Python client](https://clawhub.ai/api/v1/skills/snowsand-familywall/file?path=scripts%2Fclient.py&ownerHandle=snowsand-enterprises&version=1.3.0)
and [CLI](https://clawhub.ai/api/v1/skills/snowsand-familywall/file?path=scripts%2Ffamilywall.py&ownerHandle=snowsand-enterprises&version=1.3.0).
“Source” below means implemented in that client, not validated against a live
FamilyWall account. The reference client uses form POST with
`partnerScope=Family`; binary media uses GET. Success is generally under `a00.r.r`.

| Capability | Reference evidence | Remaining verification |
| --- | --- | --- |
| Add item | Source: `taskcreate`, `a00taskListId`, `a00text`, optional `a00quantity` | Result shape; other editable fields |
| Complete/uncomplete | Source: `taskmark`, `a00taskId`, `a00complete=true/false` | Acknowledgement shape; family/list ownership |
| Edit/delete item | Absent from reference client | Endpoint, fields, clear semantics, deletion result; do not infer endpoint names |
| Thread listing | Source: `imthreadlist`, `a00isLoggedFamily=false` | Family scope and pagination |
| Message history | Source: `immessagelist2`, `a00threadId`, `a00limit`; result may contain `datas`, `size`, `count`, `start` | Request-side continuation and ordering; read-state side effects |
| Send text | Source: `imsend`, `a00threadId`, `a00text` | Returned message/acknowledgement and send restrictions |
| Attachments | Source: message `medias`, authenticated GET of `pictureUrl` | Original versus preview URL, allowed origins, redirects, readiness and expiry |
| Calendar interval | Source: `evtlistinterval`, `a00from`, `a00to`; CLI has `--start`, `--end`, `--days` | Calendar/family scope, result adaptation, exact boundary/recurrence semantics |
| Planned meals | Page names `mplistinterval`, `mpcreate`, `mpmealput`; CLI exposes range and name/date/type | Client methods missing; required fields, create-versus-put workflow, response shapes |
| Recipe creation/import | Page names `mprecipeput`, `mprecipeputbyurl`; CLI advertises creation/import | Client methods missing; payloads, import lifecycle and supporting reads |
| Categories | Page names `mpcategorylist`; CLI advertises listing | Client method missing; category create/edit/delete and assignment contracts absent |
| Ingredients to lists | Page names `mpadditemtolist` for meal ingredients | Whether it accepts recipes directly or requires a meal; destination/selection/servings fields and result |

The page lists `evtlist`, `tasklistlist`, `tasklistadd`, and `tasklistcheck`, while
the downloadable source uses `evtlistinterval`, `taskgettasklists`, `taskcreate`,
and `taskmark`. Prefer source-backed candidates, retaining explicit uncertainty.
The CLI calls `get_meal_plan`, `add_meal`, `create_recipe`,
`create_recipe_from_url`, and `get_recipe_categories`, but those methods are absent
from the versioned client. A CLI command alone does not establish a working API.

Attachment fields in the source include `mediaId`/`metaId`, `name`, `mimeType`,
`datasize`, `pictureUrl`, `resolutionX`/`resolutionY`, `durationMs`, and `readystate`.
The page advertises meal slots `BREAKFAST`, `LUNCH`, `DINNER`, and `SNACK`; treat
these as candidate values pending the meal contract investigation.

For missing contracts, inspect a newer versioned client or public first-party
web-client code where available. Record exact evidence in this document and add
synthetic fixtures. If evidence still does not establish an operation, report
that operation as blocked; do not substitute guessed endpoints or mark its
checkbox complete. Any account-based investigation follows the validation
boundary below.

## Compatibility and shared design

- Preserve every existing public signature and no-argument behavior. In
  particular, do not change `Family.getMessages()` into asynchronous message
  history; document it as the legacy summary accessor.
- Add typed methods to the client and matching thin Family facade methods.
  Keep raw response types separate from stable normalized public types, and
  export new types through the existing package entry point.
- Reuse injected `fetch`, URL-encoded forms, `FamilyWallValidationError`, and
  `FamilyWallApiError`. Verify endpoint-specific fields rather than assuming all
  operations use the same `a00` prefix or result shape. Omit undefined fields;
  preserve explicit `false`, zero, empty-to-clear values, and required sentinels.
- Fail malformed successful responses explicitly. Distinguish HTTP, API-envelope,
  invalid-JSON, and network failures. Do not include message text, imported recipe
  content, download URLs with secrets, or credentials in diagnostic messages.
- Validate identifiers, required text, enums, and date ranges before fetching.
  Verify family/session scoping for each endpoint; a facade call must not silently
  fall back to a different family's data.
- Do not automatically retry writes. A lost response may follow a successful
  creation/send; document this ambiguity rather than risk duplicate side effects.
- Keep optional refactoring limited to shared helpers needed by these features;
  authentication rewrites and unrelated calendar mutation changes are out of scope.

## Implementation sequence and acceptance gates

The method names below are proposed public API names. Final request/return types
must follow the verified wire contract; do not fabricate complete objects when a
mutation returns only an ID or acknowledgement.

### 0. Resolve contracts and establish fixtures

- [ ] Record the reference version/source revision, endpoint, method, form fields,
  success/error shape, pagination, and evidence source for every operation.
- [ ] Resolve the open questions in the reference section before implementing
  each affected operation. Mock tests prove our behavior, not server support.
- [ ] Extract a small reusable mock-fetch helper from `test/lists.test.ts` only
  where useful. Reject unexpected requests and use synthetic fixtures throughout.
- [ ] Specify mutation results per operation: normalized resource if returned,
  identifier if only an ID is returned, acknowledgement for successful deletion.
  Any required follow-up read must be documented and tested separately.

### 1. List-item mutations

Proposed methods: `addListItem(listId, input)`,
`setListItemCompleted(listId, itemId, completed)`,
`updateListItem(listId, itemId, patch)`, and `deleteListItem(listId, itemId)`.

Delivered: `addListItem` and `setListItemCompleted`. Edit and delete remain
blocked; no endpoint for either appears in the reference client, and the
proposed `updateListItem`/`deleteListItem` names are therefore not implemented.

- [x] Define add inputs and the verified optional quantity field. Edit inputs
  remain undefined pending an endpoint; category fields are not established.
- [x] Use an explicit completion boolean so repeating a request does not invert
  state. Cover both completion and uncompletion; never implement a blind toggle.
- [x] Preserve item/list IDs exactly and verify which identifiers each endpoint
  accepts. Reuse existing normalization where the response contains an item.
  `taskmark` is documented only with `a00taskId`, so `setListItemCompleted`
  accepts no list identifier rather than accepting one it would not send.
- [x] Test exact encoded payloads, Unicode and punctuation, each mutation result,
  unknown/deleted items, denied operations, malformed responses, and invalid input
  making zero requests. Keep first-slice list tests unchanged and passing.
- [ ] Edit and delete items. Blocked: no endpoint evidence.

### 2. Calendar date-range filtering

Proposed methods: `getCalendar(calendarId, options?)` and
`Family.getCalendarEvents(options?)`, with exported `GetCalendarOptions`.
Use the source-backed `evtlistinterval` candidate for ranged queries rather than
assuming `evtsync` accepts date filters. Preserve `evtsync` for no-options calls;
verify calendar selection before routing an explicit `calendarId` to the interval
endpoint, and adapt its response without fabricating sync metadata. If that cannot
preserve the existing client's return contract, add `getCalendarEventsInRange`
to the client and route the optional Family facade range through that method.

Delivered as `getCalendarEventsInRange` with an optional range on
`Family.getCalendarEvents`. The interval endpoint returns an event collection
rather than a sync payload, so it could not preserve `getCalendar`'s return
contract and the separate client method named in this section was used instead.

- [x] Define `startDate`/`endDate` inputs, wire conversion, whether one-sided
  ranges are supported, and inclusivity from reference evidence. Reject invalid
  or reversed ranges. Specify treatment of date-only values and timezone offsets.
  Use the client's configured timezone to interpret date-only/day-count inputs,
  then convert instants to the verified wire format; preserve explicit offsets.
  Never borrow the London timezone hard-coded in existing calendar mutations.
- [x] Provide a `days` convenience option corresponding to the guide's CLI,
  with a documented anchor, positive integer validation, and explicit conflict
  rules with date bounds. Inject/fix the clock in tests. The guide's default
  timestamps use UTC day bounds ending at `23:59:59.000Z`; verify precision and
  boundary behavior rather than losing the final fractional second of a day.
- [x] Preserve the existing unfiltered request and response behavior when options
  are omitted. Encode `a00from`/`a00to` only on the verified interval request.
- [ ] Confirm whether the server filters occurrences or series and includes events
  that overlap the interval. Unresolved; documented as a server limitation rather
  than replaced with local filtering. Do not silently replace server filtering with local
  filtering of an incomplete sync result or claim recurrence expansion we lack.
- [x] Test exact boundaries, explicit offsets, a DST transition, empty results,
  and facade forwarding. Overlapping, all-day, and recurring behavior is
  server-side and untested pending the item above.
  Document server limitations and keep range queries distinct from sync cursors.

### 3. Full messaging

Proposed methods: `getThreads(options?)`,
`getThreadMessages(threadId, options?)`, and `sendMessage(threadId, input)`.

- [x] Define thread, message, sender, timestamp, attachment-reference, and history
  page types. Preserve the existing `Thread` shape for the legacy accessor.
- [x] Fetch threads afresh and expose one bounded history page. `getThreads()` is
  client-only because `imthreadlist` family scoping is not established; it must
  not be represented as a particular family's data.
- [ ] Implement supported message pagination and ordering. Still blocked: the
  reference client establishes no request-side continuation.
  Expose continuation only when supported by evidence. Avoid implicit unbounded
  history fetching; specify default page size and exhaustion behavior.
- [x] Implement text sending with verified recipient/thread fields and a useful
  server acknowledgement. Delivered as `sendMessage`; a bare identifier result is
  returned as an identifier rather than expanded into a fabricated message. Confirm whether a new-thread operation is necessary to
  send to participants; include it only if the protocol requires it for this scope.
- [ ] Reading history must not silently mark messages read unless inseparable from
  the server operation; investigate and document that behavior.
- [x] Test bounded-page form encoding, attachment metadata, participant mapping,
  invalid input, malformed data, and redacted API errors with injected fetch.
- [x] Test text encoding, invalid input, permission/session errors, and ambiguous
  send failures, verifying exactly one write request. Multiple-page and ordering
  tests remain blocked with pagination itself.

Real-time subscriptions, message editing/deletion, reactions, and media uploads
are outside this scope; message history and text sending satisfy this slice.

Current evidence is limited to the public Snowsand client v1.3.0, retrieved on
2026-09-13. It establishes `imthreadlist` with `a00isLoggedFamily=false` and
`immessagelist2` with `a00threadId`/`a00limit`, returning either an array or an
object containing `datas`, `size`, `count`, and `start`. It does not establish
family scoping, page continuation, ordering, read-state behavior, or mutation
acknowledgement semantics. Consequently writes and facade delegation remain
blocked without further public protocol evidence.

### 4. Message attachments and downloads

Proposed methods: `getMessageAttachments(threadId, messageId)` and
`downloadAttachment(attachment, options?)`. Reuse attachment metadata obtained
from history when sufficient; do not invent an attachment-list endpoint.
Document any bounded history scan and distinguish “not found in this page” from
“message has no attachments”; a helper cannot promise arbitrary message lookup
until history continuation or a direct lookup contract is established.

- [x] Model ID, media kind, MIME type, filename, size, original/download location,
  and preview location where supplied. Keep unknown media kinds representable.
- [ ] Resolve original photo, audio, and video resources, including missing or
  expired references. Partially delivered: downloads resolve `pictureUrl` and
  credentials are restricted to FamilyWall hosts, but whether a distinct
  original-versus-preview URL exists is still unresolved.
- [x] Use a dedicated binary GET path through injected fetch. Do not send the API
  form body or blindly reuse cookie/CSRF headers for third-party URLs. Validate
  allowed origins and redirect targets before forwarding credentials; reject
  unexpected schemes, userinfo, and destinations.
- [x] Prefer a streaming result with metadata and `AbortSignal`; define a bounded
  download option and enforce it while reading, including when Content-Length is
  absent or wrong. Leave filesystem destinations to callers, avoiding path traversal
  through server filenames and buffering entire videos by default.
- [x] Test attachment bytes, metadata, cancellation, size limits, HTTP failures,
  redirects, expired links, and absence of credential forwarding to untrusted
  hosts. Handle unknown MIME types without mislabelling HTML errors as
  successful media. No fixture uses real photos or recorded voices.

### 5. Planned meals

Proposed methods: `getPlannedMeals(options?)` and `createPlannedMeal(input)`.

- [ ] Define date/range, meal slot/type, title or recipe reference, serving count,
  and family/calendar ownership only as supported by verified payloads.
- [ ] Separate planned-meal models from `CalendarEvent`. Determine whether reads
  use a dedicated endpoint or a distinct section of calendar sync responses.
- [ ] Verify supported free-text and recipe-linked creation modes, timezone/date
  semantics, required defaults, and premium/permission errors. Recipe-linked
  creation depends on recipe ID retrieval in phase 6; free-text creation can land
  first if supported.
- [ ] Test range encoding, empty plans, slot validation, date boundaries, creation
  response variants, and recipe-link preservation. Do not treat a calendar event
  containing meal-like text as a successfully created planned meal.

### 6. Recipes and shopping-list integration

Proposed methods: `getRecipes(options?)`, `getRecipe(recipeId)`,
`createRecipe(input)`, `importRecipeFromUrl(url)`, `getRecipeCategories()`,
`createRecipeCategory(input)`, `updateRecipeCategory(categoryId, patch)`,
`deleteRecipeCategory(categoryId)`, `setRecipeCategories(recipeId, categoryIds)`,
and `addRecipeIngredientsToList(recipeId, listId, options?)`.

- [ ] Define structured recipe/ingredient models and supporting reads so callers
  can discover recipe/category IDs and inspect imported results.
- [ ] Establish required recipe fields, units, quantities, servings, instructions,
  source URL, category associations, and optional values from source evidence.
- [ ] Import using the verified FamilyWall operation. Validate HTTP(S) URLs;
  determine whether import returns a preview, a persisted recipe, or an asynchronous
  job. Do not double-create or add a local HTML scraper as an unverified fallback.
- [ ] Cover category listing, creation, rename/edit, deletion, and recipe assignment
  or removal. Resolve unsupported operations explicitly before claiming full
  category management; never emulate them through guessed endpoints.
- [ ] Verify the shopping destination and ingredient selection/serving-scaling
  semantics. Prefer a native conversion operation if verified. If conversion uses
  phase 1 item writes, preserve ingredient text, report individual failures, and
  avoid automatic retries or claims of atomicity/deduplication.
- [ ] Test malformed/unsupported imports, required fields, category relationships,
  category deletion behavior, Unicode ingredients, quantities/units, wrong list
  types, empty selection, repeated transfer, and partial failures. Document
  duplicate behavior and unsupported scaling instead of guessing conversions.

### 7. Integration, documentation, and readiness

- [x] Add dedicated domain tests under `test/`, using the existing Node test
  runner and injected fetch. Exercise facade delegation and exported type usage.
  Added `test/list-items.test.ts`, `test/calendar-range.test.ts`, and
  `test/message-writes.test.ts` over a shared `test/support.ts` helper that
  rejects unanticipated requests. First-slice tests are unchanged.
- [x] Add README examples for the delivered areas with placeholders only,
  including completion/uncompletion, download streaming, and calendar boundary
  semantics. Explain legacy thread summaries versus messages. Pagination and
  import lifecycle are omitted because both remain blocked.
- [x] Run `pnpm install --frozen-lockfile` and `pnpm run check` after the final
  implementation. Review the diff for secrets, personal data, generated output,
  and attribution changes; preserve the original MIT license and fork credit.
- [x] Update this plan with resolved contracts and completed checkboxes, update
  the same PR description to describe actual behavior, and mark the draft ready
  only when required scope and checks are complete. Do not merge without a request.

## Validation boundaries and delivery

All automated checks must be offline with mocked fetch. Request-serialization
changes need exact form/header assertions and regression coverage; a passing mock
does not establish compatibility with the live service. Any necessary manual
protocol verification must be separately authorized and leave no account data,
credentials, or raw captures in the repository, logs, or PR.

This request uses `codex/expanded-api-plan` for both planning and later
implementation. GitHub reports `main` as the default branch and no `master` ref
exists, despite the stale branch name in `AGENTS.md`; this PR therefore targets
`main`. Keep it unmerged for the later implementation work.
