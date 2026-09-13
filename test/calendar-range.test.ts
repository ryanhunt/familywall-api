import assert from "node:assert/strict";
import test from "node:test";
import FamilyWallClient, {
  FamilyWallValidationError,
} from "../src/client.js";
import { envelope, mockFetch, rejectUnexpected, requestParams } from "./support.js";

test("encodes an explicit range on the interval endpoint", async () => {
  const mock = mockFetch((call) => {
    if (!call.url.endsWith("/evtlistinterval")) {
      rejectUnexpected(call);
    }
    return envelope([{ metaId: "event/1" }]);
  });
  const client = new FamilyWallClient({
    fetch: mock.fetcher,
    timezone: "UTC",
  });

  const events = await client.getCalendarEventsInRange("calendar/7", {
    startDate: "2026-03-01",
    endDate: "2026-03-31",
  });

  assert.equal(mock.calls.length, 1);
  assert.equal(
    mock.calls[0]!.url,
    "https://api.familywall.com/api/evtlistinterval"
  );
  const params = requestParams(mock.calls[0]!);
  assert.equal(params.get("calendarId"), "calendar/7");
  assert.equal(params.get("a00from"), "2026-03-01T00:00:00.000Z");
  // The final fractional second of the day is retained rather than truncated.
  assert.equal(params.get("a00to"), "2026-03-31T23:59:59.999Z");
  assert.deepEqual(events, [{ metaId: "event/1" }]);
});

test("resolves date-only bounds through the configured timezone", async () => {
  const mock = mockFetch(() => envelope([]));
  const client = new FamilyWallClient({
    fetch: mock.fetcher,
    timezone: "Australia/Sydney",
  });

  await client.getCalendarEventsInRange("calendar/7", {
    startDate: "2026-03-01",
    endDate: "2026-03-01",
  });

  const params = requestParams(mock.calls[0]!);
  // Sydney is UTC+11 on this date, so the local day starts the previous UTC day.
  assert.equal(params.get("a00from"), "2026-02-28T13:00:00.000Z");
  assert.equal(params.get("a00to"), "2026-03-01T12:59:59.999Z");
});

test("resolves a date-only bound across a DST transition", async () => {
  const mock = mockFetch(() => envelope([]));
  const client = new FamilyWallClient({
    fetch: mock.fetcher,
    timezone: "America/New_York",
  });

  // 2026-03-08 is the US spring-forward date; the day begins at UTC-05.
  await client.getCalendarEventsInRange("calendar/7", {
    startDate: "2026-03-08",
    endDate: "2026-03-08",
  });

  const params = requestParams(mock.calls[0]!);
  assert.equal(params.get("a00from"), "2026-03-08T05:00:00.000Z");
  // The day ends on UTC-04 after the transition.
  assert.equal(params.get("a00to"), "2026-03-09T03:59:59.999Z");
});

test("preserves an explicit offset instead of reinterpreting it", async () => {
  const mock = mockFetch(() => envelope([]));
  const client = new FamilyWallClient({
    fetch: mock.fetcher,
    timezone: "Australia/Sydney",
  });

  await client.getCalendarEventsInRange("calendar/7", {
    startDate: "2026-03-01T09:30:00+02:00",
    endDate: new Date("2026-03-02T00:00:00.000Z"),
  });

  const params = requestParams(mock.calls[0]!);
  assert.equal(params.get("a00from"), "2026-03-01T07:30:00.000Z");
  assert.equal(params.get("a00to"), "2026-03-02T00:00:00.000Z");
});

test("derives a range from a day count anchored on the start date", async () => {
  const mock = mockFetch(() => envelope([]));
  const client = new FamilyWallClient({ fetch: mock.fetcher, timezone: "UTC" });

  await client.getCalendarEventsInRange("calendar/7", {
    startDate: "2026-03-01",
    days: 7,
  });

  const params = requestParams(mock.calls[0]!);
  assert.equal(params.get("a00from"), "2026-03-01T00:00:00.000Z");
  assert.equal(params.get("a00to"), "2026-03-08T00:00:00.000Z");
});

test("returns empty results and reads collections wrapped in an object", async () => {
  const mock = mockFetch(() => envelope({ events: [] }));
  const client = new FamilyWallClient({ fetch: mock.fetcher, timezone: "UTC" });

  assert.deepEqual(
    await client.getCalendarEventsInRange("calendar/7", { days: 1 }),
    []
  );
});

test("rejects invalid ranges before making a request", async () => {
  const mock = mockFetch(rejectUnexpected);
  const client = new FamilyWallClient({ fetch: mock.fetcher, timezone: "UTC" });

  await assert.rejects(
    client.getCalendarEventsInRange("calendar/7", {}),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.getCalendarEventsInRange("calendar/7", {
      startDate: "2026-03-31",
      endDate: "2026-03-01",
    }),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.getCalendarEventsInRange("calendar/7", {
      startDate: "2026-03-01",
      endDate: "2026-03-05",
      days: 3,
    }),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.getCalendarEventsInRange("calendar/7", { days: 0 }),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.getCalendarEventsInRange("calendar/7", { days: 1.5 }),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.getCalendarEventsInRange("calendar/7", { startDate: "not-a-date" }),
    FamilyWallValidationError
  );
  await assert.rejects(
    client.getCalendarEventsInRange(" ", { days: 1 }),
    FamilyWallValidationError
  );
  assert.equal(mock.calls.length, 0);
});

test("keeps the unfiltered sync request when the facade gets no options", async () => {
  const mock = mockFetch((call) => {
    if (call.url.endsWith("/evtsync")) {
      return envelope({ updatedCreated: [{ metaId: "event/sync" }] });
    }
    if (call.url.endsWith("/evtlistinterval")) {
      return envelope([{ metaId: "event/range" }]);
    }
    return rejectUnexpected(call);
  });
  const client = new FamilyWallClient({ fetch: mock.fetcher, timezone: "UTC" });
  const { default: Family } = await import("../src/family.js");
  const family = new Family(
    { a00: { r: { r: { family_id: "fam/1" } } } } as never,
    client
  );

  assert.deepEqual(await family.getCalendarEvents(), [{ metaId: "event/sync" }]);
  assert.equal(mock.calls[0]!.url, "https://api.familywall.com/api/evtsync");

  assert.deepEqual(await family.getCalendarEvents({ days: 3 }), [
    { metaId: "event/range" },
  ]);
  assert.equal(
    mock.calls[1]!.url,
    "https://api.familywall.com/api/evtlistinterval"
  );
  assert.equal(requestParams(mock.calls[1]!).get("calendarId"), "calendar/fam/1");
});
