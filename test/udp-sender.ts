import dgram from "node:dgram";
import { readFileSync } from "node:fs";
import { linearToMuLaw } from "../src/media/codecs/pcmu.js";

const socket = dgram.createSocket("udp4");

const DESTINATION_IP = "127.0.0.1";
const DESTINATION_PORT = 20000;

const PAYLOAD_TYPE = 0; // PCMU
const SSRC = 123456;

const SAMPLE_RATE = 8000;
const FRAME_SIZE = 160; // 20 ms at 8 kHz

let sequenceNumber = 1001;
let timestamp = 160;
let sampleIndex = 0;
function readSpeechWav(filePath: string): Buffer {
  const wav = readFileSync(filePath);

  if (
    wav.length < 12 ||
    wav.toString("ascii", 0, 4) !== "RIFF" ||
    wav.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error("Expected a RIFF/WAVE file.");
  }

  const riffEnd = wav.readUInt32LE(4) + 8;

  if (riffEnd < 12 || riffEnd > wav.length) {
    throw new Error("Invalid or truncated WAV file.");
  }

  let validFormat = false;
  let audio: Buffer | undefined;

  for (let offset = 12; offset + 8 <= riffEnd;) {
    const chunkId = wav.toString("ascii", offset, offset + 4);
    const chunkSize = wav.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + chunkSize;

    if (end > riffEnd) {
      throw new Error(`Truncated WAV chunk: ${chunkId}`);
    }

    if (chunkId === "fmt ") {
      if (chunkSize < 16) {
        throw new Error("Invalid WAV format chunk.");
      }

      const format = wav.readUInt16LE(start);
      const channels = wav.readUInt16LE(start + 2);
      const sampleRate = wav.readUInt32LE(start + 4);
      const blockAlign = wav.readUInt16LE(start + 12);
      const bitsPerSample = wav.readUInt16LE(start + 14);

      if (
        format !== 1 ||
        channels !== 1 ||
        sampleRate !== SAMPLE_RATE ||
        bitsPerSample !== 16 ||
        blockAlign !== 2
      ) {
        throw new Error(
          "speech.wav must be uncompressed PCM16, 8000 Hz, mono.",
        );
      }

      validFormat = true;
    }

    if (chunkId === "data" && audio === undefined) {
      audio = wav.subarray(start, end);
    }

    // WAV chunks are padded to an even byte boundary.
    offset = end + (chunkSize & 1);
  }

  if (!validFormat || !audio || audio.length === 0) {
    throw new Error("WAV is missing its format or audio data.");
  }

  if (audio.length % 2 !== 0) {
    throw new Error("Incomplete PCM16 sample.");
  }

  return audio;
}

const speechPcm = readSpeechWav("test/audio/speech.wav");
const speechSampleCount = speechPcm.length / 2;

console.log(
  `Loaded ${(speechSampleCount / SAMPLE_RATE).toFixed(2)} seconds of speech.`,
);

function createAudioPayload(): Buffer {
  const payload = Buffer.alloc(FRAME_SIZE);

  for (let i = 0; i < FRAME_SIZE; i++) {
    const pcmSample =
      sampleIndex < speechSampleCount
        ? speechPcm.readInt16LE(sampleIndex * 2)
        : 0;

    payload[i] = linearToMuLaw(pcmSample);
    sampleIndex++;
  }

  return payload;
}

function createRtpPacket(): Buffer {
  const header = Buffer.alloc(12);

  // RTP Version = 2
  header[0] = 2 << 6;

  // Marker = 0
  // Payload Type = 0 (PCMU)
  header[1] = PAYLOAD_TYPE;

  header.writeUInt16BE(sequenceNumber, 2);

  header.writeUInt32BE(timestamp, 4);

  header.writeUInt32BE(SSRC, 8);

  const payload = createAudioPayload();

  console.log("First 10 PCMU bytes:", Array.from(payload.subarray(0, 10)));

  return Buffer.concat([header, payload]);
}

let sentPacketCount = 0;

const timer = setInterval(() => {
  const packet = createRtpPacket();

  socket.send(packet, DESTINATION_PORT, DESTINATION_IP, (error) => {
    if (error) {
      console.error("UDP send error:", error);
    }
  });

  sentPacketCount++;

  sequenceNumber = (sequenceNumber + 1) & 0xffff;

  timestamp += FRAME_SIZE;

  if (sentPacketCount >= 250) {
    clearInterval(timer);

    setTimeout(() => {
      socket.close();

      console.log(`RTP stream stopped after ${sentPacketCount} packets`);
    }, 100);
  }
}, 20);
