import dgram from "node:dgram";

const socket = dgram.createSocket("udp4");

const DESTINATION_IP = "127.0.0.1";
const DESTINATION_PORT = 20000;

let sequenceNumber = 1001;
let timestamp = 160;

const SSRC = 123456;
const PAYLOAD_TYPE = 0; // PCMU

function createRtpPacket(): Buffer {
  const header = Buffer.alloc(12);
  // RTP Version = 2
  header[0] = 2 << 6;

  //  Marker = 0, Payload Type = 0
  header[1] = PAYLOAD_TYPE;

  header.writeUInt16BE(sequenceNumber, 2);
  header.writeUInt32BE(timestamp, 4);
  header.writeUInt32BE(SSRC, 8);

  // 160 bytes = 20 ms of G.711 PCMU
  const payload = Buffer.alloc(160, 0xff);

  return Buffer.concat([header, payload]);
}

const interval = setInterval(() => {
  const packet = createRtpPacket();
  // Sequence number increment is handled inside createRtpPacket

  socket.send(packet, DESTINATION_PORT, DESTINATION_IP);

  console.log(`Sent RTP seq=${sequenceNumber} timestamp=${timestamp}`);

  sequenceNumber++;
  timestamp += 160;
}, 20);

// Stop after 5 seconds
setTimeout(() => {
  clearInterval(interval);
  socket.close();

  console.log("RTP stream stopped");
}, 5000);
