import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new",
  args: ["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream","--autoplay-policy=no-user-gesture-required","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=metal"],
  defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage();
const errs=[]; p.on("pageerror", e => errs.push("PAGEERR "+e.message)); p.on("console", m => { if (["error","warning"].includes(m.type())) errs.push(m.text().slice(0,200)); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = () => p.evaluate(() => document.body.innerText.replace(/\s+/g," "));
const moveTo = x => p.evaluate(v => window.__kalqyMockBody.moveTo(v), x);
// map a target's normalized x to the body x that puts the cloud there (mirrors BodyLaneController)
const bodyX = fx => { const pos = (fx - 0.17) / 0.66; if (Math.abs(pos-0.5) < 0.02) return 0.5; const t = Math.abs(pos-0.5)/0.5; const travel=0.194; return pos>0.5 ? 0.6+t*travel : 0.4-t*travel; };
await p.goto("http://localhost:1420/#/games/river-adventure?demo=1", { waitUntil: "load" });
await p.evaluate(() => localStorage.clear());
await sleep(12000);
await p.evaluate(() => [...document.querySelectorAll("button")].find(b => /skip/i.test(b.textContent))?.click());
await sleep(5500);
const levels = await p.evaluate(async () => (await import("/src/games/river/config/levels.config.ts")).RIVER_LEVELS.map(l => ({ id: l.id, hold: l.mechanic.holdDurationMs, t: l.targets, steps: l.mechanic.trainingSteps })));
// training
for (const a of ["moveLeft","center","moveRight","center"]) { await p.evaluate(f => window.__kalqyMockBody[f](), a); await sleep(2200); }
await sleep(3500);
for (let i=1;i<levels.length;i++) {
  const L = levels[i];
  console.log(L.id, "start:", (await text()).slice(0,60));
  await p.screenshot({ path: `rv-L${i}-start.png` });
  const wrong = L.t.find(t => !t.correct), right = L.t.find(t => t.correct);
  if (wrong && (i===2||i===5)) {
    await moveTo(bodyX(wrong.x)); await sleep(L.hold + 1800);
    await p.screenshot({ path: `rv-L${i}-wrong.png` });
    console.log("  wrong:", (await text()).match(/(Look carefully[^.!]*[.!]?)/)?.[1], "| streak", (await text()).match(/(\d+) streak/)?.[1]);
  }
  await moveTo(bodyX(right.x)); await sleep(L.hold * 0.6);
  await p.screenshot({ path: `rv-L${i}-holding.png` });
  await sleep(L.hold * 0.4 + 1200);
  await p.screenshot({ path: `rv-L${i}-win1.png` });
  await sleep(1200);
  await p.screenshot({ path: `rv-L${i}-win2.png` });
  await sleep(1800);
}
console.log("final:", (await text()).slice(0,200));
await p.screenshot({ path: "rv-final.png" });
console.log("saved", await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes("river"))))));
console.log("errors", errs.slice(0,8));
await b.close();
