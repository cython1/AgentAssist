import type { Buffer } from "node:buffer";

export interface ingressAudioFrame {
  streamId: string;

  interactionId?: string;

  encoding: "PCMU";

  sampleRate: number;
  channels: number;

  data: Buffer;
  // Media timestamp in ticks; clockRate defines ticks per second.
  timestamp: number;
  clockRate: number;
}
