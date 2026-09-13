export interface FetchCall {
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  redirect: RequestRedirect | undefined;
  signal: AbortSignal | undefined;
}

export function responseFor(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function envelope(result: unknown): Response {
  return responseFor({ a00: { r: { r: result } } });
}

function normalizeHeaders(init: RequestInit | undefined): Record<string, string> {
  const headers: Record<string, string> = {};
  const source = init?.headers;
  if (source === undefined) {
    return headers;
  }
  if (source instanceof Headers) {
    source.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    return headers;
  }
  if (Array.isArray(source)) {
    for (const [key, value] of source) {
      headers[String(key).toLowerCase()] = String(value);
    }
    return headers;
  }
  for (const [key, value] of Object.entries(source)) {
    headers[key.toLowerCase()] = String(value);
  }
  return headers;
}

/**
 * Records every request and rejects any the test did not anticipate, so an
 * unexpected extra call fails loudly instead of passing silently.
 */
export function mockFetch(
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
    const call: FetchCall = {
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : "",
      headers: normalizeHeaders(init ?? undefined),
      redirect: init?.redirect,
      signal: init?.signal ?? undefined,
    };
    calls.push(call);
    return await handler(call);
  };
  return { fetcher, calls };
}

export function rejectUnexpected(call: FetchCall): never {
  throw new Error(`Unexpected request to ${call.method} ${call.url}`);
}

export function requestParams(call: FetchCall): URLSearchParams {
  return new URLSearchParams(call.body);
}

export async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}
