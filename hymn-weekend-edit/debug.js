const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const url =
    "file://" + path.join(__dirname, "scene.html").replace(/\\/g, "/");
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForFunction("window.__ready===true");
  for (const t of [6.5, 9.1, 11.7]) {
    const r = await p.evaluate((t) => {
      window.seek(t * 1000);
      const ls = [...document.querySelectorAll(".line")].map(
        (e, i) => i + ":" + (+e.style.opacity).toFixed(2),
      );
      return { xf: document.getElementById("world").style.transform, ls };
    }, t);
    console.log("t=" + t + "  " + r.ls.join(" "));
    console.log("   world=" + r.xf);
  }
  await b.close();
})();
