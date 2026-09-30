// Tracking-lost, pause/resume, time-out failure + retry, in Market Catch (mock body).
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
const click = re => p.evaluate(r => [...document.querySelectorAll("button")].find(b => new RegExp(r, "i").test(b.textContent || b.getAttribute("aria-label") || ""))?.click(), re);
await p.goto("http://localhost:1420/#/games/market-catch?demo=1", { waitUntil: "load" });
await p.evaluate(() => localStorage.clear());
await sleep(12000);
await click("skip");
await sleep(5500);
// jump to story level 1 by finishing training quickly
for (const a of ["moveLeft","moveRight","center"]) { await p.evaluate(f => window.__kalqyMockBody[f](), a); await sleep(2100); }
for (let i = 0; i < 400; i++) { const s = await st(); if (s.levelId !== "market-training" || s.status === "success") break; const a = s.objects.find(o => o.id === "apple_fresh"); if (a) await p.evaluate(x => window.__kalqyMockBody.moveTo(x), a.x > s.playerX ? 0.9 : 0.1); await sleep(60); }
await sleep(5000);
console.log("level:", (await st()).levelId);

// tracking lost: objects freeze, popup shows, nothing is punished
await sleep(4000);
const before = await st();
await p.evaluate(() => window.__kalqyMockBody.setVisible(false));
await sleep(1500);
const lost1 = await st(); await sleep(1500); const lost2 = await st();
console.log("lost popup:", /Come back into view/i.test(await text()), "| objects frozen:", JSON.stringify(lost1.objects.map(o=>Math.round(o.y))) === JSON.stringify(lost2.objects.map(o=>Math.round(o.y))), "| score unchanged:", before.score === lost2.score);
await p.screenshot({ path: `${OUT}/mc-lost.png` });
await p.evaluate(() => window.__kalqyMockBody.setVisible(true));
await sleep(1500);
const back1 = await st(); await sleep(700); const back2 = await st();
console.log("resumed falling:", back2.objects.length === 0 || back2.objects.some((o, i) => back1.objects[i] && o.y !== back1.objects[i].y) || back2.objects.length !== back1.objects.length);

// pause
await click("pause");
await sleep(600);
const p1 = await st(); await sleep(1200); const p2 = await st();
console.log("paused:", /Paused|Resume/i.test(await text()), "| frozen:", JSON.stringify(p1.objects.map(o=>Math.round(o.y))) === JSON.stringify(p2.objects.map(o=>Math.round(o.y))));
await p.screenshot({ path: `${OUT}/mc-paused.png` });
await click("resume|continue");
await sleep(1200);
console.log("after resume:", /Paused/i.test(await text()) ? "still paused" : "playing");

// time out (stand still, catch nothing): should fail gently and offer a retry
await p.evaluate(() => window.__kalqyMockBody.center());
console.log("waiting for time-out ...");
for (let i = 0; i < 80; i++) { const s = await st(); if (s.status === "failed") break; await sleep(1000); }
console.log("status:", (await st()).status, "|", (await text()).match(/Nice try[^.!]*[.!]?/)?.[0], "|", (await text()).match(/(Try again|Retry|Play again)[^ ]*/i)?.[0]);
await p.screenshot({ path: `${OUT}/mc-failed.png` });
await click("try again|retry|play again");
await sleep(3000);
const again = await st();
console.log("retry:", again.levelId, again.status, "score", again.score, "goal", JSON.stringify(again.goals?.map(g => g.value)));
console.log("errors", errs.slice(0,8));
await b.close();
