let chromium;
try {
  ({ chromium } = require("playwright-core"));
} catch {
  ({ chromium } = require("playwright"));
}
const path = require("node:path");
const fs = require("node:fs");

const EXE =
  process.env.CHROME_EXE ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCENE =
  "file:///C:/Users/tamer/Downloads/Code/app-gap/appgap-admissions-video/scene.html";

const MODE = process.argv[2] || "full";
const OUT = process.argv[3] || path.join(__dirname, "frames");
const FPS = 30;
const DUR = 36.0;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: EXE,
    headless: true,
    args: ["--force-color-profile=srgb", "--disable-lcd-text"],
  });
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  await page.addInitScript(() => {
    window.__CAPTURE = true;
  });
  await page.goto(SCENE, { waitUntil: "load" });
  try {
    await page.evaluate(() => document.fonts?.ready);
  } catch (_e) {}
  await page.waitForTimeout(400);

  let times;
  if (MODE === "probe") {
    times = (process.argv[4] || "1,5,12,20,29,35").split(",").map(Number);
    for (const t of times) {
      await page.evaluate((tt) => window.__render(tt), t);
      await page.waitForTimeout(30);
      const f = path.join(OUT, `probe_${String(t).replace(".", "_")}s.png`);
      await page.screenshot({ path: f });
      console.log("probe", t, "->", f);
    }
  } else {
    const N = Math.round(DUR * FPS);
    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      const t = i / FPS;
      await page.evaluate((tt) => window.__render(tt), t);
      const f = path.join(OUT, `f${String(i).padStart(5, "0")}.png`);
      await page.screenshot({ path: f });
      if (i % 60 === 0)
        console.log(`frame ${i}/${N} (${((Date.now() - t0) / 1000) | 0}s)`);
    }
    console.log(
      `DONE ${N} frames in ${((Date.now() - t0) / 1000) | 0}s -> ${OUT}`,
    );
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
