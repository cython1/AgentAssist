import { rtpIngressAdapter } from "./ingress/rtp/rtp-ingress-adapter.js";
import { PcmuWavRecorder } from "./media/pcmu-wav-recorder.js";

const adapter = new rtpIngressAdapter();
const recorder = new PcmuWavRecorder();

adapter.onAudio((frame) => recorder.handleFrame(frame));

adapter.onAudio((frame) => {
  console.log({
    encoding: frame.encoding,
    bytes: frame.data.length,
    timestamp: frame.timestamp,
    streamId: frame.streamId,
  });
});

try {
  await adapter.start();
} catch (error) {
  console.error("Error starting RTP adapter:", error);
}
