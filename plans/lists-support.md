# Lists support implementation plan

Status: Accepted  
Accepted: 2026-09-13

## Scope

Add list support through the existing `Family` facade, with request handling in `FamilyWallClient`. The API will retrieve and create shopping, todo, and other list containers. Item mutations such as adding, completing, editing, or deleting individual items are outside this first implementation.

The acceptance target is that callers can retrieve their family’s lists and create each supported type with typed results and reliable error handling.

## 1. Verify the FamilyWall list protocol

Establish the retrieval and creation endpoints, required family identifiers, list-type values, response envelopes, and any pagination or sync behavior. Determine whether “other” is a distinct type or covers several types.

Use verified documentation or sanitized request examples. Store only synthetic fixtures; never include account data or session details.

## 2. Define the public API

Proposed usage:

```typescript
const family = await client.getFamily();

const lists = await family.getLists();
const shoppingLists = await family.getLists({ type: "shopping" });

const newList = await family.createList({
  name: "Weekly groceries",
  type: "shopping",
});
```

Support `"shopping"`, `"todo"`, and `"other"` as friendly input values once their upstream mappings are verified. Require an explicit type.

Add `getList(listId)` for retrieving one list and its contents if the verified protocol supports that behavior. Document whether collection retrieval returns summaries or complete lists.

## 3. Add types and request handling

In `src/types.ts`, define list summaries, list details, creation input, retrieval options, and raw response types. Keep upstream fields separate from the public model and preserve unfamiliar returned type values.

In `src/client.ts`, implement the verified requests using `apiFetch`. Handle pagination if present, distinguish empty results from failures, and return the server-created list with its identifier. Avoid automatic creation retries that could duplicate lists.

In `src/family.ts`, add convenience methods that supply the instance’s family ID. Validate blank names and unsupported creation types before sending requests.

## 4. Add offline tests

Introduce mocked-fetch tests and include them in `pnpm run check`. Cover:

- Retrieval and creation for each supported type.
- Correct family scoping, endpoint, and form encoding.
- Empty collections, optional fields, and unfamiliar returned types.
- Pagination or sync behavior, if applicable.
- Invalid input, HTTP errors, API errors, and malformed responses.
- Names containing Unicode, spaces, and special characters.

All automated validation must run without contacting the live FamilyWall API.

## 5. Document and deliver

Update `README.md` with retrieval and creation examples, supported types, return values, and error behavior.

Implement on a fresh `codex/list-support` branch from current `main`, run `pnpm run check`, review for sensitive data and generated output, and open one PR using the repository template. Completion requires green checks; leave merging to the user.
