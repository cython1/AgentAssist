import dgram from "node:dgram";
import { linearToMuLaw } from "../src/media/pcmu.js";

const socket = dgram.createSocket("udp4");

const DESTINATION_IP = "127.0.0.1";
const DESTINATION_PORT = 20000;

const PAYLOAD_TYPE = 0; // PCMU
const SSRC = 123456;

const SAMPLE_RATE = 8000;
const FREQUENCY = 440;
const FRAME_SIZE = 160; // 20 ms at 8 kHz

let sequenceNumber = 1001;
let timestamp = 160;
let sampleIndex = 0;

function createAudioPayload(): Buffer {
  const payload = Buffer.alloc(FRAME_SIZE);

  for (let i = 0; i < FRAME_SIZE; i++) {
    const time = sampleIndex / SAMPLE_RATE;

    const pcmSample = Math.sin(2 * Math.PI * FREQUENCY * time) * 12000;

    payload[i] = linearToMuLaw(Math.round(pcmSample));

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
