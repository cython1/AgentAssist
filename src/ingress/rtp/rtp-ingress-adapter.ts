import dgram from "node:dgram";
import { writeFileSync } from "node:fs";
import { parseRtpPacket } from "./rtp.js";
import type {
  voiceIngressAdapter,
  audioFrameHandler,
} from "../voice-ingress-adapter.js";
import type { Socket } from "node:dgram";

function muLawToLinear(byte: number): number {
  const value = ~byte & 0xff;
  const sign = value & 0x80;
  const exponent = (value >> 4) & 0x07;
  const mantissa = value & 0x0f;
  const sample = ((mantissa << 3) + 0x84) << exponent;

  return sign ? 0x84 - sample : sample - 0x84;
}

const RTP_PORT = 20000;

function closeSocket(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      socket.off("close", onClose);
      socket.off("error", onError);
    };
    const onClose = (): void => {
      cleanup();
      resolve();
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };

    socket.once("close", onClose);
    socket.once("error", onError);

    try {
      socket.close();
    } catch (error) {
      cleanup();
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ERR_SOCKET_DGRAM_NOT_RUNNING"
      ) {
        resolve();
      } else {
        reject(error);
      }
    }
  });
}

// Store all decoded PCM samples
const allPcmSamples: number[] = [];

// Count received RTP packets
let packetCount = 0;

// Prevent writing the WAV multiple times
let wavWritten = false;

// Used for sequence tracking
let lastSequenceNumber: number | undefined;

function writeWavFile(
  filePath: string,
  samples: number[],
  sampleRate: number,
): void {
  const dataSize = samples.length * 2;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  const data = Buffer.alloc(dataSize);
  samples.forEach((sample, index) => {
    data.writeInt16LE(sample, index * 2);
  });

  writeFileSync(filePath, Buffer.concat([header, data]));
}

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
export class rtpIngressAdapter implements voiceIngressAdapter {
  private readonly handlers = new Set<audioFrameHandler>();
  private socket: Socket | undefined = undefined;
  onAudio(handler: audioFrameHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
  async start(): Promise<void> {
    if (this.socket !== undefined) {
      throw new Error("RTP adapter is already started or starting");
    }
    const socket = dgram.createSocket("udp4");
    this.socket = socket;
    try {
      await new Promise<void>((resolve, reject) => {
        const onListening = (): void => {
          const address = socket.address();
          console.log(
            `RTP server listening on ${address.address}:${address.port}`,
          );
          resolve();
        };
        socket.once("listening", onListening);
        socket.once("error", (error) => {
          console.error("UDP server error:", error);
          reject(error);
        });
        socket.bind(RTP_PORT);
      });
    } catch (error) {
      try {
        await closeSocket(socket);
      } catch {
        // Preserve the startup error.
      } finally {
        if (this.socket === socket) {
          this.socket = undefined;
        }
      }
      throw error;
    }
  }

  async stop(): Promise<void> {
    const socket = this.socket;
    if (socket === undefined) {
      return;
    }

    try {
      await closeSocket(socket);
    } finally {
      if (this.socket === socket) {
        this.socket = undefined;
      }
    }
  }
}
