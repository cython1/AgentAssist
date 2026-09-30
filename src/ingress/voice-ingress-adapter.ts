import type { ingressAudioFrame } from "./ingress-audio-frame.js";

export interface audioFrameHandler {
  (frame: ingressAudioFrame): void;
}

export interface voiceIngressAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  onAudio(handler: audioFrameHandler): () => void;
}
