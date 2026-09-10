export function linearToMuLaw(sample) {
    const BIAS = 0x84;
    const CLIP = 32635;
    let sign = 0;
    if (sample < 0) {
        sign = 0x80;
        sample = -sample;
    }
    if (sample > CLIP) {
        sample = CLIP;
    }
    sample += BIAS;
    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {
        // The loop updates exponent and expMask in its control expression.
    }
    const mantissa = (sample >> (exponent + 3)) & 0x0f;
    return ~(sign | (exponent << 4) | mantissa) & 0xff;
}
export function muLawToLinear(muLawByte) {
    muLawByte = ~muLawByte & 0xff;
    const sign = muLawByte & 0x80;
    const exponent = (muLawByte >> 4) & 0x07;
    const mantissa = muLawByte & 0x0f;
    let sample = ((mantissa << 3) + 0x84) << exponent;
    sample -= 0x84;
    return sign ? -sample : sample;
}
//# sourceMappingURL=pcmu.js.map