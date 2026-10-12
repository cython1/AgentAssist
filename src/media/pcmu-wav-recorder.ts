import type { ingressAudioFrame } from "../ingress/ingress-audio-frame.js";
import { muLawToLinear } from "./codecs/pcmu.js";
import { writeWavFile } from "./way-writer.js";

export class PcmuWavRecorder {
  private frameCount = 0;
  private allPCMSamples: number[] = [];
  private wavwritten = false;
  private outputPath = "received-audio.wav";
  public handleFrame(frame: ingressAudioFrame): void {
    if (frame.encoding !== "PCMU") return;
    const pcmsamples = Array.from(frame.data, (bytes) => muLawToLinear(bytes));

    this.frameCount++;
    if (this.frameCount <= 10) {
      console.log(`PCM samples received: ${pcmsamples.slice(0, 10)}`);
    }
    for (const sample of pcmsamples) {
      this.allPCMSamples.push(sample);
    }
    if (this.frameCount >= 250 && !this.wavwritten) {
      writeWavFile(this.outputPath, this.allPCMSamples, 8000);
      this.wavwritten = true;
      console.log(`total PCM Samples received: ${this.allPCMSamples.length}`);
    }
  }
}
