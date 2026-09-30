// Pause freezes the rhythm, leaving a level cancels its scheduled sounds, one hand keeps working when the other is lost.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new",
  args: ["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream","--autoplay-policy=no-user-gesture-required","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=metal"],
  defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage();
const errs=[]; p.on("pageerror", e => errs.push("PAGEERR "+e.message)); p.on("console", m => { if (["error","warning"].includes(m.type())) errs.push(m.text().slice(0,200)); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = () => p.evaluate(() => document.body.innerText.replace(/\s+/g," "));
const st = () => p.evaluate(() => window.__kalqyDebug.state());
const OUT = process.env.OUT ?? ".";
const norm = (x, y) => ({ x: 0.12 + (x / 1280) * 0.76, y: 0.1 + (y / 720) * 0.72 });
const hand = (side, x, y) => p.evaluate(([s, v]) => window.__kalqyMockHands[s].moveTo(v), [side, norm(x, y)]);
const click = re => p.evaluate(r => [...document.querySelectorAll("button")].find(b => new RegExp(r, "i").test(b.textContent || b.getAttribute("aria-label") || ""))?.click(), re);
// count sample sources that are still scheduled/playing
await p.evaluateOnNewDocument(() => {
  window.__live = 0;
  const orig = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) { window.__live++; this.addEventListener("ended", () => window.__live--); return orig.apply(this, a); };
});
await p.goto("http://localhost:1420/#/games/tabla-festival?demo=1", { waitUntil: "load" });
await p.evaluate(() => localStorage.clear());
await sleep(16000);
await p.evaluate(() => [...document.querySelectorAll("button")].find(b => /skip/i.test(b.textContent))?.click());
for (let i = 0; i < 60; i++) { if (await p.evaluate(() => !!window.__kalqyDebug)) break; await sleep(500); }
await sleep(1500);
let s = await st();
await hand("left", s.zones[0].x, s.zones[0].y + 230); await hand("right", s.zones[3].x, s.zones[3].y + 230);
await sleep(1200);
// Pass the lessons with one touch each so we reach the demo quickly
const touch = async (side, z) => { await hand(side, z.x, z.y); await sleep(350); await hand(side, z.x, z.y + 230); await sleep(300); };
await touch("right", s.zones[1]); await sleep(1100); await touch("left", s.zones[2]); await sleep(1300);
await hand("left", s.zones[0].x, s.zones[0].y); await sleep(150); await hand("right", s.zones[3].x, s.zones[3].y); await sleep(500);
await hand("left", s.zones[0].x, s.zones[0].y + 230); await hand("right", s.zones[3].x, s.zones[3].y + 230);
await sleep(1500);
s = await st(); console.log("reached:", s.phase);

// pause during the demo: the audio clock stops, so the rhythm clock does too
await sleep(2500);
const before = await st();
await click("pause"); await sleep(700);
const a = await st(); await sleep(1500); const c = await st();
console.log("paused:", /Paused|Resume/i.test(await text()), "| clock frozen:", Math.abs(c.now - a.now) < 0.05, "| phase kept:", a.phase === c.phase);
await p.screenshot({ path: `${OUT}/tb-paused.png` });
await click("resume|continue"); await sleep(1500);
const d = await st(); console.log("resumed: clock running:", d.now > c.now + 0.8, "| phase", d.phase);

// one hand lost: the other still plays
await p.evaluate(() => window.__kalqyMockHands.left.setVisible(false)); await sleep(800);
console.log("one hand lost -> popup:", /Show your hands/i.test(await text()), "(should be false)");
await p.evaluate(() => window.__kalqyMockHands.right.setVisible(false)); await sleep(1200);
console.log("both lost -> popup:", /Show your hands/i.test(await text()));
await p.screenshot({ path: `${OUT}/tb-lost.png` });
await p.evaluate(() => { window.__kalqyMockHands.left.setVisible(true); window.__kalqyMockHands.right.setVisible(true); }); await sleep(800);

// leaving the level cancels its sounds
const live1 = await p.evaluate(() => window.__live);
await p.evaluate(() => { location.hash = "#/endeavour"; }); await sleep(1500);
const live2 = await p.evaluate(() => window.__live);
console.log("scheduled/playing sounds before exit:", live1, "| after exit:", live2);
console.log("errors", errs.slice(0, 8));
await b.close();
