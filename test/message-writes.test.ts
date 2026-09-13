import assert from "node:assert/strict";
import test from "node:test";
import FamilyWallClient, {
  FamilyWallApiError,
  FamilyWallValidationError,
} from "../src/client.js";
import {
  collect,
  envelope,
  mockFetch,
  rejectUnexpected,
  requestParams,
} from "./support.js";

test("sends one text message with the verified form fields", async () => {
  const mock = mockFetch((call) => {
    if (!call.url.endsWith("/imsend")) {
      rejectUnexpected(call);
    }
    return envelope({
      metaId: "message/5",
      text: "On my way",
      fromId: "account/1",
      creationDate: "2026-03-01T10:00:00Z",
    });
  });
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  const message = await client.sendMessage("thread/2", { text: "On my way" });

  assert.equal(mock.calls.length, 1, "a send must issue exactly one request");
  assert.equal(mock.calls[0]!.url, "https://api.familywall.com/api/imsend");
  assert.equal(mock.calls[0]!.method, "POST");
  const params = requestParams(mock.calls[0]!);
  assert.equal(params.get("partnerScope"), "Family");
  assert.equal(params.get("a00threadId"), "thread/2");
  assert.equal(params.get("a00text"), "On my way");
  assert.deepEqual(message, {
    id: "message/5",
    text: "On my way",
    authorId: "account/1",
    creationDate: "2026-03-01T10:00:00Z",
    attachments: [],
  });
});

test("accepts a bare identifier acknowledgement without inventing fields", async () => {
  const mock = mockFetch(() => envelope("message/6"));
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  assert.deepEqual(await client.sendMessage("thread/2", { text: "Hi" }), {
    id: "message/6",
    text: "Hi",
    attachments: [],
  });
});

test("preserves unicode and newlines in outgoing message text", async () => {
  const mock = mockFetch(() => envelope("message/7"));
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  const text = "Déjà vu 🎉\nsecond line & more";
  await client.sendMessage("thread/2", { text });

  assert.equal(requestParams(mock.calls[0]!).get("a00text"), text);
});

test("validates send input before making a request", async () => {
  const mock = mockFetch(rejectUnexpected);
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  await assert.rejects(
    client.sendMessage(" ", { text: "Hi" }),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.sendMessage("thread/2", { text: "  " }),
    FamilyWallValidationError
  );
  assert.equal(mock.calls.length, 0);
});

test("redacts send failures and does not retry an ambiguous write", async () => {
  const mock = mockFetch(() =>
    new Response(
      JSON.stringify({ a00: { ex: "Thread thread/2 is read-only for you" } }),
      { status: 200, headers: { "content-type": "application/json" } }
    )
  );
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  await assert.rejects(
    client.sendMessage("thread/2", { text: "Hi" }),
    (error: unknown) =>
      error instanceof FamilyWallApiError &&
      error.endpoint === "imsend" &&
      error.message === "FamilyWall API returned an error" &&
      error.apiError === undefined
  );
  assert.equal(mock.calls.length, 1, "a failed send must not be retried");
});

const attachment = {
  id: "media/1",
  name: "holiday.jpg",
  mimeType: "image/jpeg",
  pictureUrl: "https://media.familywall.com/media/1.jpg",
};

/** Answers the login handshake so tests can exercise a credentialed client. */
function loginResponse(url: string): Response | undefined {
  if (url.endsWith("/log2in")) {
    return new Response(JSON.stringify({ a00: { r: { r: {} } } }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": "JSESSIONID=session-1; Path=/",
      },
    });
  }
  if (url.endsWith("/webset") || url.endsWith("/webget")) {
    return envelope({});
  }
  return undefined;
}

function binaryResponse(bytes: Uint8Array, headers: Record<string, string> = {}): Response {
  return new Response(bytes, {
    status: 200,
    headers: { "content-type": "image/jpeg", ...headers },
  });
}

test("downloads attachment bytes with metadata and session credentials", async () => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5]);
  const mock = mockFetch((call) => {
    const login = loginResponse(call.url);
    if (login !== undefined) {
      return login;
    }
    if (call.url === attachment.pictureUrl) {
      return binaryResponse(bytes, { "content-length": "5" });
    }
    return rejectUnexpected(call);
  });
  const client = new FamilyWallClient({ fetch: mock.fetcher });
  await client.login("email@example.com", "yourpassword");

  const download = await client.downloadAttachment(attachment);

  assert.equal(download.url, attachment.pictureUrl);
  assert.equal(download.mimeType, "image/jpeg");
  assert.equal(download.size, 5);
  assert.equal(download.filename, "holiday.jpg");
  assert.deepEqual(await collect(download.body), bytes);

  const request = mock.calls.at(-1)!;
  assert.equal(request.method, "GET");
  assert.equal(request.body, "", "media requests must not send the API form body");
  assert.equal(request.redirect, "manual");
  assert.equal(request.headers["tokencsrf"], "session-1");
  assert.ok(request.headers["cookie"]?.includes("JSESSIONID=session-1"));
});

test("never forwards credentials to a non-FamilyWall media host", async () => {
  const mock = mockFetch((call) => {
    const login = loginResponse(call.url);
    if (login !== undefined) {
      return login;
    }
    return binaryResponse(new Uint8Array([9]));
  });
  const client = new FamilyWallClient({ fetch: mock.fetcher });
  await client.login("email@example.com", "yourpassword");

  await client.downloadAttachment({
    id: "media/2",
    pictureUrl: "https://cdn.example.com/media/2.jpg",
  });

  const request = mock.calls.at(-1)!;
  assert.equal(request.headers["tokencsrf"], undefined);
  assert.equal(request.headers["cookie"], undefined);
});

test("drops credentials when a redirect leaves the FamilyWall origin", async () => {
  const mock = mockFetch((call) => {
    const login = loginResponse(call.url);
    if (login !== undefined) {
      return login;
    }
    if (call.url === attachment.pictureUrl) {
      return new Response(null, {
        status: 302,
        headers: { location: "https://cdn.example.com/signed/1.jpg" },
      });
    }
    return binaryResponse(new Uint8Array([7, 7]));
  });
  const client = new FamilyWallClient({ fetch: mock.fetcher });
  await client.login("email@example.com", "yourpassword");

  const download = await client.downloadAttachment(attachment);

  assert.equal(download.url, "https://cdn.example.com/signed/1.jpg");
  assert.deepEqual(await collect(download.body), new Uint8Array([7, 7]));
  const first = mock.calls.at(-2)!;
  const second = mock.calls.at(-1)!;
  assert.equal(first.headers["tokencsrf"], "session-1");
  assert.equal(second.headers["tokencsrf"], undefined);
  assert.equal(second.headers["cookie"], undefined);
});

test("enforces the byte ceiling while reading regardless of content-length", async () => {
  const mock = mockFetch(() =>
    // A deliberately understated Content-Length must not be trusted.
    binaryResponse(new Uint8Array(64), { "content-length": "1" })
  );
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  const download = await client.downloadAttachment(attachment, { maxBytes: 8 });
  await assert.rejects(
    collect(download.body),
    (error: unknown) =>
      error instanceof FamilyWallApiError &&
      error.message === "Attachment exceeded the maximum download size"
  );
});

test("propagates cancellation through the abort signal", async () => {
  const controller = new AbortController();
  const mock = mockFetch((call) => {
    assert.equal(call.signal, controller.signal);
    throw Object.assign(new Error("aborted"), { name: "AbortError" });
  });
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  await assert.rejects(
    client.downloadAttachment(attachment, { signal: controller.signal }),
    (error: unknown) => (error as Error).name === "AbortError"
  );
});

test("rejects unsafe media URLs and failed downloads", async () => {
  const mock = mockFetch(rejectUnexpected);
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  await assert.rejects(
    client.downloadAttachment({ id: "media/3" }),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.downloadAttachment({
      id: "media/3",
      pictureUrl: "http://media.familywall.com/1.jpg",
    }),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.downloadAttachment({
      id: "media/3",
      pictureUrl: "https://user:pass@media.familywall.com/1.jpg",
    }),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.downloadAttachment(attachment, { maxBytes: 0 }),
    FamilyWallValidationError
  );
  assert.equal(mock.calls.length, 0);

  const expired = mockFetch(() => new Response("gone", { status: 404 }));
  await assert.rejects(
    new FamilyWallClient({ fetch: expired.fetcher }).downloadAttachment(attachment),
    (error: unknown) =>
      error instanceof FamilyWallApiError && error.status === 404
  );
});

test("reduces a traversing server filename to a bare basename", async () => {
  const mock = mockFetch(() => binaryResponse(new Uint8Array([1])));
  const client = new FamilyWallClient({ fetch: mock.fetcher });

  const download = await client.downloadAttachment({
    ...attachment,
    name: "../../../etc/passwd",
  });

  assert.equal(download.filename, "passwd");
  await collect(download.body);
});
