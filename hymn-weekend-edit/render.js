// Frame renderer for the Hymn-for-the-Weekend slowed edit (PREMIUM pass).
// Loads scene.html once, then seeks the deterministic timeline frame-by-frame
// and screenshots each frame at 2x supersampling for crisp, anti-aliased text.
// 60fps. Assemble + downscale with ffmpeg afterwards (see build.sh).
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const W = 1080,
  H = 1920,
  FPS = 60;
const SS = process.env.SS ? parseFloat(process.env.SS) : 1.5; // supersample factor
const DURATION_MS = 27000;
// Write the heavy HD frames to the session scratchpad, not the repo folder.
const OUT =
  "C:/Users/tamer/AppData/Local/Temp/claude/C--Users-tamer-Downloads-Code-app-gap/b9428cd6-2f42-4eea-8d99-6dfdaef3a7d5/scratchpad/framesHD";

// Optional CLI: node render.js [startFrame] [endFrame]  (for smoke tests)
const argStart = process.argv[2] ? parseInt(process.argv[2], 10) : 0;
const totalFrames = Math.round((DURATION_MS / 1000) * FPS);
const argEnd = process.argv[3]
  ? parseInt(process.argv[3], 10)
  : totalFrames - 1;

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: [
      "--force-color-profile=srgb",
      "--disable-lcd-text",
      "--font-render-hinting=none",
      "--ignore-gpu-blocklist",
      "--enable-gpu-rasterization",
      "--enable-zero-copy",
      "--use-gl=angle",
      "--use-angle=d3d11",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: SS,
  });
  const url =
    "file://" + path.join(__dirname, "scene.html").replace(/\\/g, "/");
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction("window.__ready === true");
  // let web fonts settle
  try {
    await page.evaluate("document.fonts.ready");
  } catch (e) {}
  await page.waitForTimeout(500);

  const t0 = Date.now();
  for (let f = argStart; f <= argEnd; f++) {
    const ms = (f / FPS) * 1000;
    await page.evaluate((m) => window.seek(m), ms);
    const name = path.join(OUT, "f" + String(f).padStart(5, "0") + ".png");
    await page.screenshot({
      path: name,
      type: "png",
      clip: { x: 0, y: 0, width: W, height: H },
    });
    if (f % 60 === 0) {
      const pct = (((f - argStart) / (argEnd - argStart + 1)) * 100).toFixed(1);
      process.stdout.write(
        `frame ${f}/${argEnd}  (${pct}%)  ${((Date.now() - t0) / 1000).toFixed(0)}s\n`,
      );
    }
  }
  await browser.close();
  console.log("done frames " + argStart + ".." + argEnd);
})();
