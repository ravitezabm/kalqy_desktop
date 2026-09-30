// Plays Market Catch end to end with the mock body: training, then all 10 levels with a bot that
// steers to falling goal fruit. Also drops a wrong and a rotten fruit on purpose in some levels.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new",
  args: ["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream","--autoplay-policy=no-user-gesture-required","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=metal"],
  defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage();
const errs=[]; p.on("pageerror", e => errs.push("PAGEERR "+e.message)); p.on("console", m => { if (["error","warning"].includes(m.type())) errs.push(m.text().slice(0,200)); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = () => p.evaluate(() => document.body.innerText.replace(/\s+/g," "));
const st = () => p.evaluate(() => window.__kalqyDebug.state());
const PMIN = 1280*0.24, PMAX = 1280*0.76;
// inverse of BodyLaneController (dead zone .42-.58, sensitivity 1.7)
const bodyX = x => { const pos = Math.min(1, Math.max(0, (x - PMIN) / (PMAX - PMIN))); if (Math.abs(pos-0.5) < 0.015) return 0.5; const t = Math.abs(pos-0.5)/0.5; const travel = 0.5/1.7 - 0.08; return pos>0.5 ? 0.58+t*travel : 0.42-t*travel; };
const steer = x => p.evaluate(v => window.__kalqyMockBody.moveTo(v), bodyX(x));
const OUT = process.env.OUT ?? ".";
await p.goto("http://localhost:1420/#/games/market-catch?demo=1", { waitUntil: "load" });
await p.evaluate(() => localStorage.clear());
await sleep(12000);
await p.evaluate(() => [...document.querySelectorAll("button")].find(b => /skip/i.test(b.textContent))?.click());
await sleep(5500);
await p.screenshot({ path: `${OUT}/mc-train-0.png` });
for (const a of ["moveLeft","moveRight","center"]) { await p.evaluate(f => window.__kalqyMockBody[f](), a); await sleep(2300); await p.screenshot({ path: `${OUT}/mc-train-${a}.png` }); }
console.log("training lane done:", (await st()).phase);

const levels = await p.evaluate(async () => (await import("/src/games/market-catch/config/levels.config.ts")).MARKET_LEVELS.map(l => ({ id: l.id, targets: l.goal.targets.map(t => t.objectId), time: l.timeLimitSeconds })));
const wantedIds = L => L.targets;
async function play(L, index, { testWrong, testRotten }) {
  const start = Date.now(); let shot = false, wrongDone = !testWrong, rottenDone = !testRotten, lastShot = 0;
  while (Date.now() - start < 110000) {
    const s = await st();
    if (s.levelId !== L.id || s.status === "success") return s.status === "success" ? "success" : s.status;
    if (s.status === "failed") return "failed";
    const want = s.objects.filter(o => wantedIds(L).includes(o.id)).sort((a,b) => b.y - a.y)[0];
    if (!wrongDone && s.objects.length === 0 && Date.now()-start > 4000) { await p.evaluate((x) => window.__kalqyDebug.drop("pear_fresh", x), s.playerX); wrongDone = true; await sleep(900); await p.screenshot({ path: `${OUT}/mc-L${index}-wrong.png` }); console.log("  wrong catch:", (await text()).match(/(Oops[^.!]*[.!]?|That’s not[^.!]*)/)?.[1], "| score", (await st()).score); continue; }
    if (!rottenDone && Date.now()-start > 9000) { await p.evaluate((x) => window.__kalqyDebug.drop("apple_rotten", x), s.playerX); rottenDone = true; await sleep(700); await p.screenshot({ path: `${OUT}/mc-L${index}-rotten.png` }); console.log("  rotten catch:", (await text()).match(/(Yuck[^.!]*[.!]?)/)?.[1], "| score", (await st()).score); continue; }
    if (want) await steer(want.x); 
    if (!shot && s.objects.length >= 3 && Date.now()-start > 6000) { shot = true; await p.screenshot({ path: `${OUT}/mc-L${index}-play.png` }); }
    await sleep(60);
  }
  return "timeout";
}
// training catch
let t0 = Date.now();
while (Date.now() - t0 < 60000) {
  const s = await st();
  if (s.levelId !== "market-training" || s.status === "success") break;
  const apple = s.objects.find(o => o.id === "apple_fresh");
  if (apple) await steer(apple.x);
  await sleep(60);
}
console.log("training:", (await st()).status, (await text()).match(/Great catch[^.!]*[!.]?/)?.[0]);
await p.screenshot({ path: `${OUT}/mc-train-done.png` });
await sleep(3500);
const results = [];
for (let i = 1; i < levels.length; i++) {
  const L = levels[i];
  await sleep(1500);
  console.log(L.id, "start:", (await text()).slice(0, 90));
  const r = await play(L, i, { testWrong: i === 2 || i === 4, testRotten: i === 3 || i === 9 });
  const s = await st();
  console.log("  result:", r, "| score", s.score, "streak", s.streak);
  results.push(r);
  await p.screenshot({ path: `${OUT}/mc-L${i}-done.png` });
  if (r !== "success") break;
  await sleep(3200);
}
console.log("final:", (await text()).slice(0, 220));
await p.screenshot({ path: `${OUT}/mc-final.png` });
console.log("saved", await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes("market"))))).then(s => s.slice(0, 400)));
console.log("errors", errs.slice(0,8));
await b.close();
