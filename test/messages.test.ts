import assert from "node:assert/strict";
import test from "node:test";
import FamilyWallClient, {
  FamilyWallApiError,
  FamilyWallValidationError,
} from "../src/client.js";

interface FetchCall { url: string; method: string; body: string }

function envelope(result: unknown): Response {
  return new Response(JSON.stringify({ a00: { r: { r: result } } }), {
    headers: { "content-type": "application/json" },
  });
}

function mockFetch(handler: (call: FetchCall) => Response): { fetcher: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const call = { url, method: init?.method ?? "GET", body: typeof init?.body === "string" ? init.body : "" };
    calls.push(call);
    return handler(call);
  };
  return { fetcher, calls };
}

test("fetches fresh account thread summaries with the verified form fields", async () => {
  const mock = mockFetch(() => envelope([{ metaId: "thread/1", unreadCount: "2", messageCount: 5, participants: [{ accountId: "account/1", accountFirstname: "Ana", lastReadMessageDate: "2026-01-01T00:00:00Z" }] }]));
  const threads = await new FamilyWallClient({ fetch: mock.fetcher }).getThreads();
  assert.deepEqual(threads, [{ threadId: "thread/1", unreadCount: 2, messageCount: 5, participants: [{ accountId: "account/1", firstName: "Ana", lastReadMessageDate: "2026-01-01T00:00:00Z" }] }]);
  assert.equal(mock.calls[0]?.url, "https://api.familywall.com/api/imthreadlist");
  const params = new URLSearchParams(mock.calls[0]?.body);
  assert.equal(params.get("partnerScope"), "Family");
  assert.equal(params.get("a00isLoggedFamily"), "false");
});

test("fetches a bounded message page and preserves attachment metadata", async () => {
  const mock = mockFetch(() => envelope({ size: 1, count: 8, start: 0, datas: [{ metaId: "message/1", text: "Photo & café", fromId: "account/1", authorFirstname: "Ana", creationDate: "2026-01-01T00:00:00Z", type: "TEXT", medias: [{ mediaId: "media/1", name: "pic.jpg", mimeType: "image/jpeg", datasize: "42", pictureUrl: "https://media.example/pic", resolutionX: 10, resolutionY: 20, durationMs: 0, readystate: "READY" }] }] }));
  const page = await new FamilyWallClient({ fetch: mock.fetcher }).getThreadMessages("thread/1", { limit: 10 });
  assert.deepEqual(page, { size: 1, count: 8, start: 0, messages: [{ id: "message/1", text: "Photo & café", authorId: "account/1", authorName: "Ana", creationDate: "2026-01-01T00:00:00Z", type: "TEXT", attachments: [{ id: "media/1", name: "pic.jpg", mimeType: "image/jpeg", size: 42, pictureUrl: "https://media.example/pic", resolutionX: 10, resolutionY: 20, durationMs: 0, readyState: "READY" }] }] });
  const params = new URLSearchParams(mock.calls[0]?.body);
  assert.equal(mock.calls[0]?.url, "https://api.familywall.com/api/immessagelist2");
  assert.equal(params.get("a00threadId"), "thread/1");
  assert.equal(params.get("a00limit"), "10");
});

test("validates message page inputs before making a request and redacts API error content", async () => {
  let calls = 0;
  const mock = mockFetch(() => { calls += 1; return new Response(JSON.stringify({ a00: { ex: { ex: { message: "private message text" } } } }), { headers: { "content-type": "application/json" } }); });
  const client = new FamilyWallClient({ fetch: mock.fetcher });
  await assert.rejects(client.getThreadMessages(" "), FamilyWallValidationError);
  await assert.rejects(client.getThreadMessages("thread/1", { limit: 0 }), FamilyWallValidationError);
  await assert.rejects(client.getThreadMessages("thread/1"), (error: unknown) => error instanceof FamilyWallApiError && error.message === "FamilyWall API returned an error" && error.apiError === undefined);
  assert.equal(calls, 1);
});
