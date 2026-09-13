import assert from "node:assert/strict";
import test from "node:test";
import FamilyWallClient, {
  FamilyWallApiError,
  FamilyWallValidationError,
} from "../src/client.js";
import { envelope, mockFetch, rejectUnexpected, requestParams } from "./support.js";

test("adds list items with encoded form fields and optional quantity", async () => {
  const mock = mockFetch((call) => {
    if (!call.url.endsWith("/taskcreate")) {
      rejectUnexpected(call);
    }
    return envelope({
      metaId: "task/9",
      text: "Oat milk",
      quantity: "2",
      complete: false,
    });
  });
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  const item = await client.addListItem("list/1", {
    text: "Oat milk",
    quantity: "2",
  });

  assert.equal(mock.calls.length, 1);
  assert.equal(mock.calls[0]!.url, "https://api.familywall.com/api/taskcreate");
  assert.equal(mock.calls[0]!.method, "POST");
  const params = requestParams(mock.calls[0]!);
  assert.equal(params.get("partnerScope"), "Family");
  assert.equal(params.get("a00taskListId"), "list/1");
  assert.equal(params.get("a00text"), "Oat milk");
  assert.equal(params.get("a00quantity"), "2");
  assert.deepEqual(item, {
    id: "task/9",
    text: "Oat milk",
    completed: false,
    quantity: "2",
  });
});

test("omits quantity entirely when it is not supplied", async () => {
  const mock = mockFetch(() => envelope("task/10"));
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  const item = await client.addListItem("list/1", { text: "Bread" });

  const params = requestParams(mock.calls[0]!);
  assert.deepEqual(
    [...params.keys()].sort(),
    ["a00taskListId", "a00text", "partnerScope"]
  );
  assert.equal(params.has("a00quantity"), false);
  assert.deepEqual(item, { id: "task/10", text: "Bread", completed: false });
});

test("preserves unicode and punctuation in item text", async () => {
  const mock = mockFetch(() => envelope("task/11"));
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  const text = "Crème fraîche & 100% cacao — ½ kg";
  await client.addListItem("list/1", { text });

  assert.equal(requestParams(mock.calls[0]!).get("a00text"), text);
});

test("marks items complete and incomplete with an explicit state", async () => {
  const mock = mockFetch((call) => {
    if (!call.url.endsWith("/taskmark")) {
      rejectUnexpected(call);
    }
    return envelope("true");
  });
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  await client.setListItemCompleted("task/9", true);
  await client.setListItemCompleted("task/9", false);

  assert.equal(mock.calls.length, 2);
  const completed = requestParams(mock.calls[0]!);
  assert.equal(completed.get("a00taskId"), "task/9");
  assert.equal(completed.get("a00complete"), "true");
  const uncompleted = requestParams(mock.calls[1]!);
  assert.equal(uncompleted.get("a00complete"), "false");
  // The endpoint is documented only with a00taskId; no list id is ever sent.
  assert.equal(completed.has("a00taskListId"), false);
});

test("repeating a completion request does not invert item state", async () => {
  const mock = mockFetch(() => envelope("true"));
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  await client.setListItemCompleted("task/9", true);
  await client.setListItemCompleted("task/9", true);

  assert.equal(requestParams(mock.calls[0]!).get("a00complete"), "true");
  assert.equal(requestParams(mock.calls[1]!).get("a00complete"), "true");
});

test("validates item mutation input before making any request", async () => {
  const mock = mockFetch(rejectUnexpected);
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  await assert.rejects(
    client.addListItem(" ", { text: "Bread" }),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.addListItem("list/1", { text: "   " }),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.addListItem("list/1", {
      text: "Bread",
      quantity: {} as unknown as string,
    }),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.setListItemCompleted("", true),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.setListItemCompleted("task/9", "yes" as unknown as boolean),
    FamilyWallValidationError
  );
  assert.equal(mock.calls.length, 0);
});

test("surfaces malformed and failing item mutation responses", async () => {
  const malformed = mockFetch(() => envelope(42));
  await assert.rejects(
    new FamilyWallClient({ fetch: malformed.fetcher }).addListItem("list/1", {
      text: "Bread",
    }),
    (error: unknown) =>
      error instanceof FamilyWallApiError && error.endpoint === "taskcreate"
  );

  const apiError = mockFetch(() =>
    new Response(JSON.stringify({ a00: { ex: "Item not found" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  );
  await assert.rejects(
    new FamilyWallClient({ fetch: apiError.fetcher }).setListItemCompleted(
      "task/unknown",
      true
    ),
    (error: unknown) =>
      error instanceof FamilyWallApiError &&
      error.message === "FamilyWall API error: Item not found" &&
      error.endpoint === "taskmark"
  );
});
