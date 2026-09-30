// Plays Tabla Rhythm end to end with one scripted mock hand: the lessons, then every level —
// a bot reads the pattern + the audio clock from the dev debug window and times its hand entries to the beat.
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
const W = 1280, H = 720;
const norm = (x, y) => ({ x: 0.12 + (x / W) * 0.76, y: 0.1 + (y / H) * 0.72 });
const hand = (_side, x, y) => p.evaluate((v) => window.__kalqyMockHand.moveTo(v), norm(x, y));
const park = async (side, zone) => hand(side, zone.x, zone.y + 230);
const strike = async (side, zone) => hand(side, zone.x, zone.y);

await p.goto("http://localhost:1420/#/games/tabla-rhythm?demo=1".replace("tabla-rhythm","tabla-festival"), { waitUntil: "load" });
await p.evaluate(() => localStorage.clear());
await sleep(16000);
await p.evaluate(() => [...document.querySelectorAll("button")].find(b => /skip/i.test(b.textContent))?.click());
for (let i = 0; i < 60; i++) { if (await p.evaluate(() => !!window.__kalqyDebug)) break; await sleep(500); }
await sleep(1500);
let s = await st();
await park("right", s.zones[0]);
await sleep(1500);
console.log("start:", (await text()).slice(0, 110));
await p.screenshot({ path: `${OUT}/tb-lesson1.png` });

async function touch(side, zone, hold = 350) { await strike(side, zone); await sleep(hold); await park(side, zone); await sleep(250); }
// lessons: three single-hand touches
s = await st(); console.log("phase", s.phase, "lesson", s.lesson);
for (const z of [1, 2, 0]) { await touch("right", s.zones[z]); await sleep(1300); const x = await st(); console.log("  lesson ->", x.lesson, x.phase); }
await sleep(2500);
s = await st(); console.log("after lessons ->", s.phase);
await p.screenshot({ path: `${OUT}/tb-demo.png` });

async function playRound(label) {
  // wait for the player phase
  for (let i = 0; i < 400; i++) { s = await st(); if (s.phase === "play" || s.levelId !== label.id) break; await sleep(100); }
  s = await st();
  if (s.levelId !== label.id) return "moved on";
  const events = s.pattern.map((e, i) => ({ time: s.startTimes[i], hits: e.hits }));
  let shot = false;
  for (const ev of events) {
    // wait until shortly before the event
    for (;;) { const t = (await st()).now; if (t >= ev.time - 0.13) break; await sleep(8); }
    const zones = (await st()).zones;
    const hands = ev.hits.map(() => "right");
    for (const [i, h] of ev.hits.entries()) await park(hands[i], zones[h.tabla]).then(() => strike(hands[i], zones[h.tabla]));
    await sleep(170);
    if (!shot && ev.hits.length === 2) { shot = true; await p.screenshot({ path: `${OUT}/tb-${label.id}-double.png` }); }
    for (const [i, h] of ev.hits.entries()) await park(hands[i], zones[h.tabla]);
  }
  for (let i = 0; i < 100; i++) { const x = await st(); if (x.status === "success" || x.phase === "retry" || x.levelId !== label.id) break; await sleep(100); }
  return (await st()).status;
}
const levels = await p.evaluate(async () => (await import("/src/games/tabla-rhythm/config/levels.config.ts")).TABLA_LEVELS.map(l => ({ id: l.id, bpm: l.pattern.bpm })));
for (let i = 0; i < levels.length; i++) {
  const L = levels[i];
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await playRound(L);
    const x = await st();
    console.log(L.id, `bpm ${L.bpm}`, "attempt", attempt + 1, "->", r, "| notes", x.notes, "perfect", x.perfect, "two-hand", x.twoHands, "misses", x.misses, "score", x.score, "streak", x.streak);
    if (x.status === "success" || x.levelId !== L.id) break;
  }
  await p.screenshot({ path: `${OUT}/tb-${L.id}-done.png` });
  // wait for the auto-advance to the next level (2.6s) + its count-in start
  if (i < levels.length - 1) for (let k = 0; k < 100; k++) { const x = await st(); if (x.levelId === levels[i + 1].id) break; await sleep(150); }
  if (i < levels.length - 1) { s = await st(); await park("right", s.zones[0]); await sleep(600); }
}
console.log("final:", (await text()).slice(0, 200));
await p.screenshot({ path: `${OUT}/tb-final.png` });
console.log("saved", (await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.includes("tabla")))))).slice(0, 300));
console.log("errors", errs.slice(0, 8));
await b.close();
