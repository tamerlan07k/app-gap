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
  "file:///C:/Users/tamer/Downloads/Code/app-gap/appgap-admissions-video/fake-recommendation/scene.html";

const MODE = process.argv[2] || "full";
const OUT = process.argv[3] || path.join(__dirname, "frames");
const FPS = 30;
const DUR = 34.0;

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

  if (MODE === "probe") {
    const times = (process.argv[4] || "1,5,11,16,19.5,22,24,31")
      .split(",")
      .map(Number);
    for (const tt of times) {
      await page.evaluate((x) => window.__render(x), tt);
      await page.waitForTimeout(30);
      const f = path.join(OUT, `probe_${String(tt).replace(".", "_")}s.png`);
      await page.screenshot({ path: f });
      console.log("probe", tt, "->", f);
    }
  } else {
    const N = Math.round(DUR * FPS);
    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      await page.evaluate((x) => window.__render(x), i / FPS);
      await page.screenshot({
        path: path.join(OUT, `f${String(i).padStart(5, "0")}.png`),
      });
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
