// Places each trimmed clip at its timeline offset into one narration track,
// and writes timeline.json (cue start/end) for the scene author to consume.
const { execSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const DIR = path.join(__dirname, "clips_trim");
const OUTDIR = process.argv[2] || path.join(__dirname, "assets");
const DUR = 35.0;

// cue id -> start offset (s). Gaps between = breathing pauses. The big gap after
// s4b is the Scene-4 UI walkthrough beat before the branding line lands.
const LAYOUT = [
  ["s1a", 0.3],
  ["s1b", 2.6],
  ["s2a", 4.95],
  ["s2b", 6.15],
  ["s2c", 9.25],
  ["s3a", 13.0],
  ["s3b", 14.05],
  ["s3c", 17.95],
  ["s3d", 22.55],
  ["s4a", 24.8],
  ["s4b", 27.55],
  ["s5", 31.7],
];

const dur = (f) =>
  Number(
    execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`,
    )
      .toString()
      .trim(),
  );

const cues = LAYOUT.map(([id, start]) => {
  const d = dur(path.join(DIR, `${id}.mp3`));
  return { id, start, end: +(start + d).toFixed(3), dur: +d.toFixed(3) };
});

fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(
  path.join(OUTDIR, "timeline.json"),
  JSON.stringify({ DUR, cues }, null, 2),
);
console.table(cues);

// Build ffmpeg: adelay each input to its offset, amix (no overlap), pad to DUR.
const inputs = LAYOUT.map(([id]) => `-i "${path.join(DIR, `${id}.mp3`)}"`).join(
  " ",
);
const delays = LAYOUT.map(([, start], i) => {
  const ms = Math.round(start * 1000);
  return `[${i}:a]adelay=${ms}|${ms}[a${i}]`;
}).join(";");
const mixIn = LAYOUT.map((_, i) => `[a${i}]`).join("");
// Humanizing chain: tame rumble, add low-mid warmth, de-harsh sibilance,
// gentle VO compression, broadcast loudness (~-16 LUFS for social), safety limit.
const human =
  "highpass=f=80," +
  "equalizer=f=250:t=q:w=1.2:g=1.6," +
  "equalizer=f=4600:t=q:w=2.0:g=-2.6," +
  "acompressor=threshold=-18dB:ratio=2.5:attack=8:release=140:makeup=2," +
  "loudnorm=I=-16:TP=-1.5:LRA=11," +
  "alimiter=limit=0.95";
const filter =
  `${delays};${mixIn}amix=inputs=${LAYOUT.length}:normalize=0:duration=longest,` +
  `apad,atrim=0:${DUR},aresample=48000,${human}[out]`;

const outWav = path.join(OUTDIR, "narration.wav");
const outMp3 = path.join(OUTDIR, "narration.mp3");
execSync(
  `ffmpeg -y ${inputs} -filter_complex "${filter}" -map "[out]" -c:a pcm_s16le "${outWav}"`,
  { stdio: "inherit" },
);
execSync(
  `ffmpeg -y ${inputs} -filter_complex "${filter}" -map "[out]" -c:a libmp3lame -b:a 192k "${outMp3}"`,
  { stdio: "inherit" },
);
console.log("DUR", DUR, "-> assets/narration.wav / .mp3 + timeline.json");
