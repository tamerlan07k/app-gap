// Generates per-cue narration clips with a natural Edge neural voice.
// Usage: node gen_clips.js <outDir> <voiceId> <rate>
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const path = require("node:path");
const fs = require("node:fs");

const OUT = process.argv[2] || path.join(__dirname, "clips");
const VOICE = process.argv[3] || "en-US-AvaNeural";
const RATE = process.argv[4] ? Number(process.argv[4]) : 1.04;

// id -> spoken text. Written to sound like a creator posing a challenge:
// contractions, varied length, reveal split into short beats for human pacing.
const CUES = [
  [
    "c1_hook",
    "Only one of these three college recommendations is actually unsupported. Can you spot it?",
  ],
  [
    "c2_optA",
    "A — apply to a research program, after confirming you meet its published requirements.",
  ],
  [
    "c3_optB",
    "B — explore volunteering in your intended major, and check the requirements first.",
  ],
  [
    "c4_optC",
    "C — you're eligible for this research program, because you're interested in the subject.",
  ],
  ["c5_ask", "Which one's unsupported? Take a guess before the reveal."],
  ["c6_its", "It's C."],
  [
    "c7_why",
    "Being interested in a subject doesn't automatically mean you qualify.",
  ],
  [
    "c8_rule",
    "An A.I. recommendation shouldn't present an assumption as a fact.",
  ],
  ["c9_brand", "That's why the reasoning behind a recommendation matters."],
  ["c10_meet", "Meet AppGap."],
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
