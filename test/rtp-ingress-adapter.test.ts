import assert from "node:assert/strict";
import dgram from "node:dgram";
import { test } from "node:test";
import { rtpIngressAdapter } from "../src/ingress/rtp/rtp-ingress-adapter.js";

const RTP_PORT = 20000;

test("stop closes the socket and failed starts can be retried", async () => {
  const adapter = new rtpIngressAdapter();
  await adapter.start();
  await adapter.stop();
  await adapter.start();
  await adapter.stop();

  const blocker = dgram.createSocket("udp4");
  await new Promise<void>((resolve, reject) => {
    blocker.once("error", reject);
    blocker.bind(RTP_PORT, "127.0.0.1", resolve);
  });

  try {
    await assert.rejects(adapter.start());
  } finally {
    await new Promise<void>((resolve) => blocker.close(resolve));
  }

  await adapter.start();
  await adapter.stop();
});
