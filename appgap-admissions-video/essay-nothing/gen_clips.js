// Generates per-cue narration clips with a natural Edge neural voice.
// Usage: node gen_clips.js <outDir> <voiceId> <rate>
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const path = require("node:path");
const fs = require("node:fs");

const OUT = process.argv[2] || path.join(__dirname, "clips");
const VOICE = process.argv[3] || "en-US-AndrewNeural";
const RATE = process.argv[4] ? Number(process.argv[4]) : 1.06;

// id -> spoken text. Creator-to-a-friend delivery: contractions, short beats,
// the reveal split so the voice can breathe and land each phrase.
const CUES = [
  ["s1a", "Your college essay can sound impressive."],
  ["s1b", "And still say absolutely nothing."],
  ["s2a", "Take this line."],
  ["s2b", "Passionate. Perseverance. Personal growth."],
  [
    "s2c",
    "It sounds great. But what did we actually learn about this student?",
  ],
  ["s3a", "Now watch."],
  [
    "s3b",
    "They tutored a neighbor in algebra, and understood it better by explaining it.",
  ],
  [
    "s3c",
    "Now we know what they did, who they helped, and what they figured out about themselves.",
  ],
  ["s3d", "Specific beats impressive."],
  ["s4a", "That's why AppGap helps you look past the big words,"],
  ["s4b", "and see what your essay is actually saying."],
  ["s5", "Make every word mean something."],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  for (const [id, text] of CUES) {
    const outFile = path.join(OUT, `${id}.mp3`);
    let ok = false;
    for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
      try {
        await new Promise((resolve, reject) => {
          let bytes = 0;
          const { audioStream } = tts.toStream(text, { rate: RATE });
          const ws = fs.createWriteStream(outFile);
          audioStream.on("data", (d) => {
            bytes += d.length;
            ws.write(d);
          });
          audioStream.on("end", () =>
            ws.end(() =>
              bytes > 500 ? resolve() : reject(new Error("empty")),
            ),
          );
          audioStream.on("error", reject);
          setTimeout(() => reject(new Error("timeout")), 15000);
        });
        ok = true;
      } catch (e) {
        console.log("retry", id, attempt, e.message);
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    if (!ok) throw new Error(`failed ${id}`);
    console.log("OK", id, "->", outFile);
  }
  console.log("VOICE", VOICE, "RATE", RATE, "DONE", CUES.length, "clips");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
