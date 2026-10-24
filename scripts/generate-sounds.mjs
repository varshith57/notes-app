// Synthesises the reminder tones in assets/sounds/, so there's no licensed audio in the
// app. Run: npm run sounds
//
// Mono 16-bit WAV. iOS plays custom notification sounds only if they're under 30 s, and
// Android plays a notification sound once, so each tone repeats its pattern for its length.
import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 22050;
const TAU = 2 * Math.PI;

/** Renders `seconds` of audio from `sample(t)` (−1…1) and writes it as assets/sounds/<name>.wav. */
function write(name, seconds, sample) {
  const samples = new Int16Array(Math.round(RATE * seconds));
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, sample(i / RATE)));
    samples[i] = Math.round(v * 32767);
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
  writeFileSync(new URL(`../assets/sounds/${name}.wav`, import.meta.url), Buffer.concat([header, data]));
  console.log(`wrote assets/sounds/${name}.wav (${seconds}s, ${(data.length / 1e6).toFixed(2)} MB)`);
}

/** Gets louder over the first `over` seconds, so a tone wakes you gently. */
const ramp = (t, over, from = 0.35) => Math.min(1, from + ((1 - from) * t) / over);

/** A struck note: fast attack, exponential decay, a few inharmonic partials for a bell timbre. */
function strike(t, f, decay, partials = [[1, 1], [2.76, 0.35], [5.4, 0.12]]) {
  if (t < 0) return 0;
  const attack = Math.min(1, t / 0.004);
  let v = 0;
  for (const [ratio, amp] of partials) v += amp * Math.sin(TAU * f * ratio * t) * Math.exp((-t * ratio) / decay);
  return attack * v;
}

mkdirSync(new URL('../assets/sounds', import.meta.url), { recursive: true });

// Alarm (28 s): two-tone "ring-ring" bursts of four beeps.
{
  const BEEP = 0.12, GAP = 0.07, BEEPS = 4, PAUSE = 0.65, TONES = [880, 1175];
  const burst = BEEPS * (BEEP + GAP) + PAUSE;
  write('alarm', 28, (t) => {
    const inBurst = t % burst;
    const beep = Math.floor(inBurst / (BEEP + GAP));
    const inBeep = inBurst - beep * (BEEP + GAP);
    if (beep >= BEEPS || inBeep > BEEP) return 0;
    const f = TONES[beep % 2];
    const env = Math.min(1, inBeep / 0.01, (BEEP - inBeep) / 0.02);
    const wave = 0.8 * Math.sin(TAU * f * t) + 0.2 * Math.sin(TAU * 2 * f * t);
    return wave * env * ramp(t, 8) * 0.85;
  });
}

// Digital (15 s): classic bedside alarm clock, beep-beep-beep-beep, pause.
{
  const BEEP = 0.09, GAP = 0.06, BEEPS = 4, PAUSE = 0.55, F = 2048;
  const burst = BEEPS * (BEEP + GAP) + PAUSE;
  write('digital', 15, (t) => {
    const inBurst = t % burst;
    const beep = Math.floor(inBurst / (BEEP + GAP));
    const inBeep = inBurst - beep * (BEEP + GAP);
    if (beep >= BEEPS || inBeep > BEEP) return 0;
    const env = Math.min(1, inBeep / 0.004, (BEEP - inBeep) / 0.004);
    // Soft-clipped square-ish wave, like a piezo buzzer.
    return Math.tanh(3 * Math.sin(TAU * F * t)) * env * ramp(t, 5, 0.5) * 0.55;
  });
}

// Chime (14 s): a descending three-note doorbell-style chime every 2.4 s.
{
  const NOTES = [1318.5, 1046.5, 784]; // E6, C6, G5
  const STEP = 0.32, CYCLE = 2.4;
  write('chime', 14, (t) => {
    const local = t % CYCLE;
    const start = t - local;
    let v = 0;
    // Include the previous cycle's tail so notes ring across the loop boundary.
    for (const offset of [0, -CYCLE]) {
      NOTES.forEach((f, i) => {
        v += strike(local - offset - i * STEP, f, 0.9) * 0.4;
      });
    }
    return v * ramp(start + local, 6, 0.5);
  });
}

// Bell (14 s): a single deep bell struck every 2 s, letting it ring out.
{
  const CYCLE = 2;
  write('bell', 14, (t) => {
    const local = t % CYCLE;
    const v = strike(local, 523.25, 1.6, [[1, 1], [2.0, 0.5], [2.76, 0.3], [4.07, 0.15]])
      + strike(local + CYCLE, 523.25, 1.6, [[1, 1], [2.0, 0.5], [2.76, 0.3], [4.07, 0.15]]);
    return v * 0.45 * ramp(t, 6, 0.5);
  });
}

// Gentle (14 s): a soft rising marimba arpeggio, quiet at first.
{
  const NOTES = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  const STEP = 0.18, CYCLE = 1.6;
  write('gentle', 14, (t) => {
    const local = t % CYCLE;
    let v = 0;
    for (const offset of [0, -CYCLE]) {
      NOTES.forEach((f, i) => {
        v += strike(local - offset - i * STEP, f, 0.35, [[1, 1], [4, 0.2], [10, 0.05]]) * 0.45;
      });
    }
    return v * ramp(t, 10, 0.2);
  });
}
