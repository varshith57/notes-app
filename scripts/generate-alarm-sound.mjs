// Synthesises the reminder alarm tone (assets/sounds/alarm.wav), so there's no licensed
// audio in the app. Run: node scripts/generate-alarm-sound.mjs
//
// 28 s (iOS plays custom notification sounds only if they're under 30 s), mono 16-bit.
// Pattern: two-tone "ring-ring" bursts, getting louder over the first seconds so it wakes
// you gently rather than blasting at full volume.
import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 22050;
const SECONDS = 28;
const samples = new Int16Array(RATE * SECONDS);

const BEEP = 0.12; // seconds on
const GAP = 0.07; // seconds off between beeps in a burst
const BEEPS_PER_BURST = 4;
const PAUSE = 0.65; // seconds between bursts
const TONES = [880, 1175]; // A5 / D6, alternating per beep

const burstLength = BEEPS_PER_BURST * (BEEP + GAP) + PAUSE;

for (let i = 0; i < samples.length; i++) {
  const t = i / RATE;
  const inBurst = t % burstLength;
  const beep = Math.floor(inBurst / (BEEP + GAP));
  const inBeep = inBurst - beep * (BEEP + GAP);
  if (beep >= BEEPS_PER_BURST || inBeep > BEEP) continue;

  const f = TONES[beep % 2];
  // Short attack/release per beep to avoid clicks.
  const env = Math.min(1, inBeep / 0.01, (BEEP - inBeep) / 0.02);
  // Ramp from 35% to full volume over the first 8 seconds.
  const ramp = Math.min(1, 0.35 + (0.65 * t) / 8);
  const wave = 0.8 * Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(2 * Math.PI * 2 * f * t);
  samples[i] = Math.round(wave * env * ramp * 0.85 * 32767);
}

const data = Buffer.from(samples.buffer);
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // PCM chunk size
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28); // byte rate
header.writeUInt16LE(2, 32); // block align
header.writeUInt16LE(16, 34); // bits per sample
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

mkdirSync(new URL('../assets/sounds', import.meta.url), { recursive: true });
writeFileSync(new URL('../assets/sounds/alarm.wav', import.meta.url), Buffer.concat([header, data]));
console.log(`wrote assets/sounds/alarm.wav (${SECONDS}s, ${(data.length / 1e6).toFixed(1)} MB)`);
