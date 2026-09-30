import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new",
  args: ["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream","--autoplay-policy=no-user-gesture-required","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=metal"],
  defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage();
const errs=[]; p.on("pageerror", e => errs.push("PAGEERR "+e.message)); p.on("console", m => { if (["error","warning"].includes(m.type())) errs.push(m.text().slice(0,220)); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = () => p.evaluate(() => document.body.innerText.replace(/\s+/g," "));
const state = () => p.evaluate(() => window.__kalqyDebug.state());
const hand = (sx, sy) => p.evaluate(([x,y]) => window.__kalqyMockHand.moveTo({ x, y }), [0.12 + (sx/1280)*0.76, 0.1 + (sy/720)*0.72]);
const gesture = g => p.evaluate(v => window.__kalqyMockHand.setGesture(v), g);
await p.goto("http://localhost:1420/#/games/word-eggs?demo=1&seed=11", { waitUntil: "load" });
await p.evaluate(() => localStorage.clear());
await sleep(12000);
await p.evaluate(() => [...document.querySelectorAll("button")].find(b => /skip/i.test(b.textContent))?.click());
await sleep(6000);
async function settled() { for (let i=0;i<30;i++){ const s=await state(); if (s.eggs.every(e=>e.state==="ground")) return s; await sleep(200);} return state(); }
async function dragTo(egg, dest, release = true) {
  await hand(egg.x, egg.y); await sleep(700);
  await gesture("fist"); await sleep(350);
  const steps = 18;
  for (let i=1;i<=steps;i++){ await hand(egg.x + (dest.x-egg.x)*i/steps, egg.y + (dest.y-egg.y)*i/steps); await sleep(55); }
  await sleep(300);
  if (release) { await gesture("open"); await sleep(350); }
}
const results=[];
for (let level=0; level<=10; level++) {
  await sleep(1200);
  let s = await settled();
  const id = s.levelId;
  const wrong = s.eggs.find(e=>!e.correct), right = s.eggs.find(e=>e.correct);
  // wrong egg first
  await dragTo(wrong, s.zone);
  await sleep(1200);
  const after = await settled();
  const wrongBack = after.eggs.find(e=>e.value===wrong.value);
  const wrongOk = wrongBack.state==="ground" && Math.hypot(wrongBack.x-wrong.x, wrongBack.y-wrong.y) < 60;
  const fb = (await text()).match(/(Try again!|Look carefully!|Almost!)/)?.[1];
  // right egg
  const rightNow = after.eggs.find(e=>e.correct);
  await dragTo(rightNow, s.zone);
  await sleep(600);
  const done = (await state()).eggs.find(e=>e.correct)?.state==="placed";
  results.push({ id, word: s.word, missing: s.missingIndex, options: s.eggs.map(e=>e.value).join(""), wrongOk, fb, placed: done });
  console.log(JSON.stringify(results.at(-1)));
  if (level===6) await p.screenshot({ path: "we-L6.png" });
  await sleep(3200);
}
console.log("final:", (await text()).slice(0,160));
await p.screenshot({ path: "we-final.png" });
console.log("saved", await p.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k])=>k.includes("word-eggs")))).then(x=>x.slice(0,300)));
console.log("errors", errs.slice(0,8));
await b.close();
