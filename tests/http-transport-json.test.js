const test = require("node:test");
const assert = require("node:assert");

const { createHttpTransport } = require("../dist/index.js");

test("http transport sends valid JSON array of entries", async () => {
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    return { ok: true };
  };

  try {
    const transport = createHttpTransport({
      url: "https://example.com/logs",
      batchSize: 2,
      flushIntervalMs: 10,
    });

    const entryA = {
      level: "error",
      timestamp: Date.now(),
      componentName: "CompA",
      message: "boom",
    };
    const entryB = {
      level: "error",
      timestamp: Date.now(),
      componentName: "CompB",
      message: "boom2",
    };

    transport(entryA, "ignored");
    transport(entryB, "ignored");

    await new Promise((r) => setTimeout(r, 50));

    assert.ok(requests.length >= 1, "fetch should be called");
    const body = requests[0]?.init?.body;
    const parsed = JSON.parse(body);
    assert.equal(parsed.length, 2, "body should be array of 2 entries");
    assert.equal(parsed[0].componentName, "CompA");
    assert.equal(parsed[1].componentName, "CompB");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
