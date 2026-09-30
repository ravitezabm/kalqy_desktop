import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new",
  args: ["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream","--autoplay-policy=no-user-gesture-required","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=metal"],
  defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage();
const errs=[]; p.on("pageerror", e => errs.push("PAGEERR "+e.message)); p.on("console", m => { if (["error"].includes(m.type())) errs.push(m.text().slice(0,200)); });
await p.evaluateOnNewDocument(() => {
  window.__tracks = [];
  const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (c) => { const s = await orig(c); s.getTracks().forEach(t => window.__tracks.push(t)); return s; };
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = () => p.evaluate(() => document.body.innerText.replace(/\s+/g," "));
for (let round = 1; round <= 3; round++) {
  await p.goto("http://localhost:1420/#/games/tabla-festival", { waitUntil: "load" });
  if (round === 1) await sleep(11500); else await sleep(11500);
  await p.evaluate(() => [...document.querySelectorAll("button")].find(b => /skip/i.test(b.textContent))?.click());
  await sleep(9000);
  const info = await p.evaluate(() => ({ canvases: document.querySelectorAll("canvas").length, live: window.__tracks.filter(t => t.readyState === "live").length }));
  console.log("round", round, "in game:", info, "|", (await text()).slice(0,150));
  if (round===1) await p.screenshot({ path: "tb-real.png" });
  await p.evaluate(() => { location.hash = "#/endeavour"; });
  await sleep(2500);
  const after = await p.evaluate(() => ({ canvases: document.querySelectorAll("canvas").length, live: window.__tracks.filter(t => t.readyState === "live").length, total: window.__tracks.length }));
  console.log("  after exit:", after);
}
console.log("errors", errs.slice(0,6));
await b.close();
