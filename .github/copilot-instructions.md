# Repository Instructions

## Project Overview

AgentAssist is a TypeScript/Node.js agent assist gateway. The current entrypoint is `src/index.ts`; it starts the RTP UDP receiver. The active media path parses RTP packets, accepts PCMU (payload type 0), decodes audio, and writes a WAV recording.

Treat this repository as an evolving prototype. Do not assume that every directory or planned integration is implemented; verify the current code before extending it.

## Structure

- `src/index.ts`: application entrypoint.
- `src/ingress/`: ingress contracts and audio-frame types.
- `src/ingress/rtp/`: RTP parsing and RTP ingress adapter.
- `src/media/`: UDP receiver, PCMU codec, and WAV writing.
- `src/ai/`, `src/cti/`, `src/events/`, `src/session/`, `src/sip/`, `src/state/`, and `src/telemetry/`: domain areas; inspect their contents before assuming they have working implementations.
- `test/`: manual RTP sender and test assets; the package does not currently define a unit-test suite.

Keep packet parsing, ingress contracts, codec conversion, and file output in their existing areas. Prefer extending the existing interfaces and utilities over duplicating media or protocol logic.

## TypeScript And Module Conventions

- Use TypeScript and keep the compiler's `strict` checks passing.
- The project uses ESM with `NodeNext`. Relative TypeScript imports in source should use `.js` extensions, matching the existing code and emitted Node.js modules.
- Prefer Node.js built-in modules with the `node:` prefix.
- Preserve the existing formatting and ESLint conventions. `console` logging is currently permitted.
- Keep public interfaces small and make resource lifecycle behavior explicit, especially for sockets and event handlers.

## Voice And RTP Behavior

- The current receiver binds an IPv4 UDP socket on port `20000`.
- The current media path supports RTP PCMU payload type `0`; do not treat other payload types as PCMU.
- Decoded WAV output is mono, 16-bit PCM at 8 kHz in the current receiver.
- Keep RTP header parsing and payload decoding separate. Validate packet boundaries and malformed input before reading fields or decoding samples.
- Be mindful of RTP sequence-number wraparound and packet loss when changing packet tracking.
- Do not silently change ports, codecs, sample rates, recording paths, or packet handling semantics without updating the relevant code and documentation.

## Local Commands

- `npm run dev`: run the entrypoint with watch mode.
- `npm start`: run the entrypoint.
- `npm run build`: compile TypeScript into `dist/`.
- `npm run lint:verify`: run ESLint with warnings treated as errors.
- `npm run prettier:verify`: check formatting.
- `npm run test:rtp`: run the UDP sender used for manual RTP testing; this is not a unit-test suite.

`npm test` is currently a placeholder that exits with an error. Do not report it as a passing or configured test suite. For code changes, run the build and relevant lint/format checks; use the manual RTP sender only when the receiver behavior needs end-to-end verification.

## Change Guidance

- Make focused changes that preserve existing module boundaries and runtime behavior unless the task calls for changing them.
- When changing RTP or audio processing, check the parser, codec, receiver, and WAV writer together as needed; update or add focused tests when a suitable test harness exists.
- Avoid committing generated output, audio recordings, or dependency directories unless explicitly requested.
- Update this file when verified project structure, supported media behavior, or development commands change.
