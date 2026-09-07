import * as dgram from "node:dgram";
import { parseRtpPacket } from "./rtp.js";
const RTP_PORT = 20000;
let lastSequenceNumber;
export function startRtpServer() {
    const socket = dgram.createSocket("udp4");
    socket.on("listening", () => {
        const address = socket.address();
        console.log(`RTP server listening on ${address.address}:${address.port}`);
    });
    socket.on("message", (packet, remote) => {
        try {
            const { version, payloadType, sequenceNumber, timestamp, ssrc, payload } = parseRtpPacket(packet);
            console.log("RTP packet received");
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
                    console.warn(`Packet issue: expected=${expectedSequence}, received=${sequenceNumber}`);
                }
            }
            lastSequenceNumber = sequenceNumber;
        }
        catch (error) {
            console.error("Invalid RTP packet:", error);
        }
    });
    socket.on("error", (error) => {
        console.error("UDP error:", error);
    });
    socket.bind(RTP_PORT);
}
//# sourceMappingURL=udp-server.js.map