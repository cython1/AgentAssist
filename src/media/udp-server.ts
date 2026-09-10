import dgram from "node:dgram";
import { parseRtpPacket } from "./rtp.js";
import { muLawToLinear } from "./pcmu.js";
import { writeWavFile } from "./way-writer.js";

const RTP_PORT = 20000;

// Store all decoded PCM samples
const allPcmSamples: number[] = [];

// Count received RTP packets
let packetCount = 0;

// Prevent writing the WAV multiple times
let wavWritten = false;

// Used for sequence tracking
let lastSequenceNumber: number | undefined;

export function startRtpServer(): void {
  const socket = dgram.createSocket("udp4");

  socket.on("listening", () => {
    const address = socket.address();

    console.log(`RTP server listening on ${address.address}:${address.port}`);
  });

  socket.on("message", (packet, remote) => {
    try {
      // 1. Parse RTP
      const rtp = parseRtpPacket(packet);

      // 2. Check RTP sequence number
      if (lastSequenceNumber !== undefined) {
        const expectedSequence = (lastSequenceNumber + 1) & 0xffff;

        if (rtp.sequenceNumber !== expectedSequence) {
          console.warn(
            `Packet issue: expected=${expectedSequence}, received=${rtp.sequenceNumber}`,
          );
        }
      }

      lastSequenceNumber = rtp.sequenceNumber;

      // 3. Make sure this is PCMU
      if (rtp.payloadType !== 0) {
        console.warn(`Unsupported payload type: ${rtp.payloadType}`);

        return;
      }

      // 4. Decode PCMU payload → PCM
      const pcmSamples = Array.from(rtp.payload, (byte) => muLawToLinear(byte));

      // 5. Add this packet's PCM samples
      // to our complete audio recording
      allPcmSamples.push(...pcmSamples);

      packetCount++;

      console.log({
        from: `${remote.address}:${remote.port}`,
        sequence: rtp.sequenceNumber,
        timestamp: rtp.timestamp,
        ssrc: rtp.ssrc,
        payloadBytes: rtp.payload.length,
        packetCount,
      });

      console.log("First 10 PCM samples:", pcmSamples.slice(0, 10));

      // 50 packets/sec × 5 seconds = 250 packets
      if (packetCount >= 250 && !wavWritten) {
        wavWritten = true;

        writeWavFile("received-audio.wav", allPcmSamples, 8000);

        console.log("WAV file created: received-audio.wav");

        console.log(`Total PCM samples: ${allPcmSamples.length}`);
      }
    } catch (error) {
      console.error("Error processing RTP packet:", error);
    }
  });

  socket.on("error", (error) => {
    console.error("UDP server error:", error);
  });

  socket.bind(RTP_PORT);
}
