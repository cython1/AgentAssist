import * as dgram from "node:dgram";
import { parseRtpPacket } from "./rtp.js";

const RTP_PORT = 20000;
let lastSequenceNumber: number | undefined;

export function startRtpServer(): void {
  const socket = dgram.createSocket("udp4");

  socket.on("listening", () => {
    const address = socket.address();

    console.log(`RTP server listening on ${address.address}:${address.port}`);
  });

  socket.on("message", (packet, remote) => {
    try {
      const { version, payloadType, sequenceNumber, timestamp, ssrc, payload } =
        parseRtpPacket(packet);
      const status = classifySequence(sequenceNumber);

      console.log({
        sequenceNumber,
        timestamp,
        status,
      });

      console.log(`RTP packet received: ${status}`);

      console.log(`From: ${remote.address}:${remote.port}`);

      console.log(`Version: ${version}`);
      console.log(`Payload Type: ${payloadType}`);
      console.log(`Sequence: ${sequenceNumber}`);
      console.log(`Timestamp: ${timestamp}`);
      console.log(`SSRC: ${ssrc}`);
      console.log(`Payload bytes: ${payload.length}`);
      if (lastSequenceNumber !== undefined) {
        const expectedSequence = (lastSequenceNumber + 1) & 0xffff;
        if (sequenceNumber !== expectedSequence) {
          console.warn(
            `Packet issue: expected=${expectedSequence}, received=${sequenceNumber}`,
          );
        }
      }

      lastSequenceNumber = sequenceNumber;
    } catch (error) {
      console.error("Invalid RTP packet:", error);
    }
  });

  socket.on("error", (error) => {
    console.error("UDP error:", error);
  });

  socket.bind(RTP_PORT);
}

function classifySequence(sequenceNumber: number) {
  if (lastSequenceNumber === undefined) {
    lastSequenceNumber = sequenceNumber;
    return "first";
  }

  const expected = (lastSequenceNumber + 1) & 0xffff;

  if (sequenceNumber === expected) {
    lastSequenceNumber = sequenceNumber;
    return "in-order";
  }

  if (sequenceNumber === lastSequenceNumber) {
    return "duplicate";
  }

  if (sequenceNumber > expected) {
    const lost = sequenceNumber - expected;

    lastSequenceNumber = sequenceNumber;

    return `packet-loss: ${lost}`;
  }

  return "out-of-order";
}
