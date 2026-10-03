# AgentAssist repository instructions

This is a TypeScript Node.js real-time voice gateway.

## Architecture

- The gateway owns only the media interface exposed by a CCaaS or SBC.
- Do not implement the provider's internal WebRTC, ICE, STUN, TURN, or DTLS stack unless that protocol is explicitly exposed to this gateway.
- Reuse adapters by media contract, not automatically by vendor.
- Ingress handles transport and packet parsing.
- Media normalization handles codec decoding, resampling, and canonical audio.
- WAV writing is a diagnostic/test concern.
- Keep AI and interaction-session logic independent of provider transports.

## Naming

- Use camelCase for methods and interfaces, following the existing codebase convention.
- Preserve existing filenames and import conventions unless the task explicitly changes them.

## Current RTP baseline

- Receiver startup: `npm run dev`
- RTP test sender: `npx tsx test/udp-sender.ts`
- Receiver port: UDP `20000`
- Current codec: PCMU, 8 kHz, mono
- Current diagnostic output: root-level `received-audio.wav`
- `npm run test:rtp` does not currently exist.

## Agent behavior

- Review the existing code before editing.
- Implement only the assigned task.
- Do not complete intentionally unfinished learning exercises unless explicitly requested.
- Avoid unrelated refactoring and dependency upgrades.
- Report exact validation commands and results.
- Do not merge pull requests.
