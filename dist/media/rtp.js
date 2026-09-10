export function parseRtpPacket(packet) {
    if (packet.length < 12) {
        throw new Error("Invalid RTP packet: too short");
    }
    const version = packet[0] >> 6;
    const payloadType = packet[1] & 0x7f;
    const sequenceNumber = packet.readUInt16BE(2);
    const timestamp = packet.readUInt32BE(4);
    const ssrc = packet.readUInt32BE(8);
    const payload = packet.subarray(12);
    return {
        version,
        payloadType,
        sequenceNumber,
        timestamp,
        ssrc,
        payload,
    };
}
//# sourceMappingURL=rtp.js.map