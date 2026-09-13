import assert from "node:assert/strict";
import test from "node:test";
import Family from "../src/family.js";
import {
  FamilyWallApiError,
  FamilyWallValidationError,
} from "../src/client.js";
import FamilyWallClient from "../src/client.js";
import type { AllFamilyResponse, ListType } from "../src/types.js";

interface FetchCall {
  url: string;
  method: string;
  body: string;
}

function responseFor(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function envelope(result: unknown): Response {
  return responseFor({ a00: { r: { r: result } } });
}

function mockFetch(
  handler: (call: FetchCall) => Response | Promise<Response>
): { fetcher: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const body = typeof init?.body === "string" ? init.body : "";
    const call = { url, method: init?.method ?? "GET", body };
    calls.push(call);
    return await handler(call);
  };
  return { fetcher, calls };
}

function requestParams(call: FetchCall): URLSearchParams {
  return new URLSearchParams(call.body);
}

test("retrieves lists with the verified endpoint and friendly type filtering", async () => {
  const mock = mockFetch(() =>
    envelope([
      {
        metaId: "tasklist/shopping",
        name: "Groceries",
        taskListType: "SHOPPING",
        itemCount: "2",
        checkedCount: 1,
        color: "#2b6cb0",
      },
      {
        metaId: "tasklist/todo",
        name: "Chores",
        type: "TODO",
      },
      {
        metaId: "tasklist/custom",
        name: "Packing",
        type: "CAMP_PACKING",
      },
    ])
  );
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  const shopping = await client.getLists({ type: "shopping" });
  assert.deepEqual(shopping, [
    {
      id: "tasklist/shopping",
      name: "Groceries",
      type: "shopping",
      itemCount: 2,
      checkedCount: 1,
      color: "#2b6cb0",
    },
  ]);

  const todo = await client.getLists({ type: "todo" });
  assert.deepEqual(todo.map((list) => list.id), ["tasklist/todo"]);

  const other = await client.getLists({ type: "other" });
  assert.deepEqual(other.map((list) => list.id), ["tasklist/custom"]);

  const all = await client.getLists();
  assert.equal(all[1]?.type, "todo");
  assert.equal(all[2]?.type, "CAMP_PACKING");
  assert.deepEqual(all[1], {
    id: "tasklist/todo",
    name: "Chores",
    type: "todo",
  });

  assert.equal(mock.calls.length, 4);
  const params = requestParams(mock.calls[0]!);
  assert.equal(mock.calls[0]!.url, "https://api.familywall.com/api/taskgettasklists");
  assert.equal(mock.calls[0]!.method, "POST");
  assert.equal(params.get("partnerScope"), "Family");
  assert.deepEqual([...params.keys()], ["partnerScope"]);
});

test("creates shopping, todo, and other lists with encoded form fields", async () => {
  const mock = mockFetch((call) => {
    const params = requestParams(call);
    return envelope({
      metaId: `tasklist/${params.get("a00taskListType")}`,
      name: params.get("a00name"),
      taskListType: params.get("a00taskListType"),
    });
  });
  const client = new FamilyWallClient({ fetch: mock.fetcher });
  const types: ListType[] = ["shopping", "todo", "other"];

  for (const type of types) {
    const name = `Café & 🛒 ${type} / weekly`;
    const list = await client.createList({ name, type });
    assert.equal(list.name, name);
    assert.equal(list.type, type);
  }

  assert.equal(mock.calls.length, 3);
  assert.deepEqual(
    mock.calls.map((call) => {
      const params = requestParams(call);
      return {
        endpoint: call.url.split("/").at(-1),
        partnerScope: params.get("partnerScope"),
        name: params.get("a00name"),
        type: params.get("a00taskListType"),
      };
    }),
    [
      {
        endpoint: "taskcreatelist",
        partnerScope: "Family",
        name: "Café & 🛒 shopping / weekly",
        type: "SHOPPING",
      },
      {
        endpoint: "taskcreatelist",
        partnerScope: "Family",
        name: "Café & 🛒 todo / weekly",
        type: "TODO",
      },
      {
        endpoint: "taskcreatelist",
        partnerScope: "Family",
        name: "Café & 🛒 other / weekly",
        type: "OTHER",
      },
    ]
  );
});

test("retrieves list contents and normalizes optional item fields", async () => {
  const mock = mockFetch(() =>
    envelope({
      metaId: "tasklist/errands",
      name: "Errands",
      taskListType: "CUSTOM",
      tasks: [
        {
          taskId: "task/1",
          text: "Pick up crème brûlée",
          complete: "true",
          quantity: 2,
          accountId: "account/test",
          categories: [{ name: "dessert" }, "refrigerated"],
          creationDate: "2026-09-13T10:00:00Z",
        },
        { metaId: "task/2", name: "Call the café" },
      ],
    })
  );
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  const details = await client.getList("tasklist/errands / special");
  assert.deepEqual(details, {
    id: "tasklist/errands / special",
    name: "Errands",
    type: "CUSTOM",
    items: [
      {
        id: "task/1",
        text: "Pick up crème brûlée",
        completed: true,
        quantity: 2,
        authorId: "account/test",
        categories: ["dessert", "refrigerated"],
        creationDate: "2026-09-13T10:00:00Z",
      },
      { id: "task/2", text: "Call the café", completed: false },
    ],
  });

  assert.equal(mock.calls[0]!.url, "https://api.familywall.com/api/tasklist");
  const params = requestParams(mock.calls[0]!);
  assert.equal(params.get("partnerScope"), "Family");
  assert.equal(params.get("a00listId"), "tasklist/errands / special");
});

test("handles empty collections and creation responses containing only an id", async () => {
  let callCount = 0;
  const mock = mockFetch(() => {
    callCount += 1;
    return callCount === 1 ? envelope([]) : envelope("tasklist/new");
  });
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  assert.deepEqual(await client.getLists(), []);
  assert.deepEqual(
    await client.createList({ name: "New list", type: "other" }),
    { id: "tasklist/new", name: "New list", type: "other" }
  );
});

test("exposes HTTP, API, JSON, and malformed-response failures", async () => {
  const httpMock = mockFetch(() => responseFor({ error: "unavailable" }, 503));
  await assert.rejects(
    new FamilyWallClient({ fetch: httpMock.fetcher }).getLists(),
    (error: unknown) =>
      error instanceof FamilyWallApiError &&
      error.status === 503 &&
      error.endpoint === "taskgettasklists"
  );

  const apiMock = mockFetch(() =>
    responseFor({
      a00: { ex: { ex: { message: "No family context" } } },
    })
  );
  await assert.rejects(
    new FamilyWallClient({ fetch: apiMock.fetcher }).getLists(),
    (error: unknown) =>
      error instanceof FamilyWallApiError &&
      error.message === "FamilyWall API error: No family context"
  );

  const malformedMock = mockFetch(() => responseFor({ a00: { r: {} } }));
  await assert.rejects(
    new FamilyWallClient({ fetch: malformedMock.fetcher }).getLists(),
    (error: unknown) =>
      error instanceof FamilyWallApiError &&
      error.message === "FamilyWall returned a response without a result"
  );

  const invalidJsonMock = mockFetch(
    () => new Response("not json", { status: 200 })
  );
  await assert.rejects(
    new FamilyWallClient({ fetch: invalidJsonMock.fetcher }).getLists(),
    (error: unknown) =>
      error instanceof FamilyWallApiError &&
      error.message === "FamilyWall returned invalid JSON"
  );
});

test("validates list names, types, and ids before making requests", async () => {
  let requestCount = 0;
  const mock = mockFetch(() => {
    requestCount += 1;
    return envelope([]);
  });
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  await assert.rejects(
    client.createList({ name: "   ", type: "shopping" }),
    (error: unknown) => error instanceof FamilyWallValidationError
  );
  await assert.rejects(
    client.createList({ name: "Valid", type: "unsupported" as ListType }),
    (error: unknown) => error instanceof FamilyWallValidationError
  );
  await assert.rejects(
    client.getList("  "),
    (error: unknown) => error instanceof FamilyWallValidationError
  );
  await assert.rejects(
    client.getLists({ type: "unsupported" as ListType }),
    (error: unknown) => error instanceof FamilyWallValidationError
  );
  assert.equal(requestCount, 0);
});

test("exposes list operations through the Family facade", async () => {
  const mock = mockFetch((call) => {
    const endpoint = call.url.split("/").at(-1);
    return endpoint === "taskgettasklists"
      ? envelope([{ metaId: "tasklist/1", name: "Groceries", type: "SHOPPING" }])
      : envelope({ metaId: "tasklist/2", name: "Chores", type: "TODO" });
  });
  const client = new FamilyWallClient({ fetch: mock.fetcher });
  const data = {
    a00: {
      r: {
        r: {
          family_id: "family/test",
          members: [],
          coverMedias: [],
        },
      },
    },
  } satisfies AllFamilyResponse;
  const family = new Family(data, client);

  assert.equal((await family.getLists())[0]?.name, "Groceries");
  assert.equal(
    (await family.createList({ name: "Chores", type: "todo" })).id,
    "tasklist/2"
  );
});
