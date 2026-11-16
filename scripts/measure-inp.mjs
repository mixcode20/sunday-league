// Interaction latency (the input to INP) on an emulated mid-range phone:
// Pixel 5, ~1.6Mbps / 150ms RTT, 4x CPU slowdown. Complements
// measure-vitals.mjs, which covers load metrics only.
//
// Drives real interactions rather than just loading pages, so it needs an open
// gameweek: it creates a throwaway (location TEST-INP, dated 2099) and removes
// it, along with any other TEST-% gameweek, in a finally block.
//
//   npm run build && npx next start -p 3000
//   set -a; . ./.env.local; set +a
//   SB_URL="$NEXT_PUBLIC_SUPABASE_URL" SB_KEY="$SUPABASE_SECRET_KEY" \
//     node scripts/measure-inp.mjs http://localhost:3000
//
// Baseline recorded 2026-11-16. Google rates INP good at <=200ms, so every
// path has roughly 2.5x headroom at the slowest measured interaction:
//   /league  expand drawer x4       p75 40ms | max 40ms
//   /league  sort columns x5        p75 64ms | max 64ms
//   /        open slot picker x3    p75 32ms | max 64ms
//   /teams   open picker + 5 picks  p75 32ms | max 32ms
//   /teams   commit batch (Done)    p75 40ms | max 40ms
//
// Caveats: event-timing durations are quantised to 8ms, and entries under the
// 16ms durationThreshold are not recorded, so these are coarse. Taps that find
// no matching element are swallowed, which is why some counts are low.
//
// Requires playwright, which is not a project dependency: npm i -D playwright
import { chromium, devices } from 'playwright';
const B = process.argv[2], PIN = process.env.ORGANISER_PIN;
const post=(p,b)=>fetch(B+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(process.env.SB_URL, process.env.SB_KEY, { auth:{persistSession:false} });
const cleanTests = async () => {
  const { data } = await sb.from('gameweeks').select('id').ilike('location','%TEST-%');
  for (const g of (data??[])) { await sb.from('gameweek_players').delete().eq('gameweek_id',g.id); await sb.from('gameweeks').delete().eq('id',g.id); }
  return data?.length ?? 0;
};

const b = await chromium.launch({ channel: 'chrome' });
let gwId = null;

// INP is driven by interaction latency, so measure the slowest interaction
// (max) as well as the p75 Google reports on.
const OBSERVER = () => {
  window.__ix = [];
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) {
      if (e.interactionId) window.__ix.push({ name: e.name, dur: e.duration });
    }
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
};

async function page() {
  const ctx = await b.newContext({ ...devices['Pixel 5'] });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.emulateNetworkConditions', {
    offline:false, downloadThroughput:1.6*1024*1024/8, uploadThroughput:750*1024/8, latency:150 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.addInitScript(OBSERVER);
  return { ctx, p };
}
const report = async (p, label) => {
  const ix = await p.evaluate(() => window.__ix ?? []);
  if (!ix.length) { console.log(`${label.padEnd(34)} no interactions recorded`); return; }
  const d = ix.map(x=>x.dur).sort((a,b)=>a-b);
  const p75 = d[Math.floor(d.length*0.75)] ?? d[d.length-1];
  console.log(`${label.padEnd(34)} n=${String(d.length).padStart(2)} | p75 ${String(Math.round(p75)).padStart(3)}ms | max ${String(Math.round(d[d.length-1])).padStart(3)}ms`);
};

try {
  await cleanTests();
  // --- /league: expand the heavy PlayerDrawer, and sort the table
  {
    const { ctx, p } = await page();
    await p.goto(B+'/league', { waitUntil:'load' }); await p.waitForTimeout(3000);
    for (let i=0;i<4;i++){ await p.locator('tbody tr').nth(i).tap(); await p.waitForTimeout(900); }
    await report(p, '/league  expand drawer x4');
    await p.evaluate(()=>{window.__ix=[];});
    for (const c of ['GP','W','L','W%','GD']) { await p.getByRole('button',{name:c,exact:true}).first().tap().catch(()=>{}); await p.waitForTimeout(600); }
    await report(p, '/league  sort columns x5');
    await ctx.close();
  }
  // --- /: open the slot picker (needs an open gameweek)
  {
    await post('/api/gameweeks/create',{date:'2099-03-01',time:'9:15am',location:'TEST-INP',format:'7s',pin:PIN,playerIds:[]});
    const ov = await (await fetch(B+'/api/game/overview')).json();
    gwId = ov.openGameweek?.id;
    const { ctx, p } = await page();
    await p.goto(B+'/', { waitUntil:'load' }); await p.waitForTimeout(3000);
    // Reload between taps: the picker is a modal overlay that intercepts
    // pointer events, so reopening it is cleaner than closing it.
    const all = [];
    for (let i=0;i<3;i++){
      if (i) { await p.goto(B+'/', { waitUntil:'load' }); await p.waitForTimeout(2500); }
      await p.locator('[data-slot-trigger]').nth(i).tap();
      await p.waitForTimeout(1200);
      const ix = await p.evaluate(()=>window.__ix ?? []);
      all.push(...ix);
      await p.evaluate(()=>{window.__ix=[];});
    }
    const d = all.map(x=>x.dur).sort((a,b)=>a-b);
    if (d.length) {
      const p75 = d[Math.floor(d.length*0.75)] ?? d[d.length-1];
      console.log(`${'/        open slot picker x3'.padEnd(34)} n=${String(d.length).padStart(2)} | p75 ${String(Math.round(p75)).padStart(3)}ms | max ${String(Math.round(d[d.length-1])).padStart(3)}ms`);
    } else console.log('/        open slot picker x3       no interactions recorded');
    await ctx.close();
  }
  // --- /teams: the organiser editing path, which is the heaviest interaction
  //     in the app and the one that prompted the optimistic batch rewrite.
  {
    const { ctx, p } = await page();
    await p.goto(B+'/', { waitUntil:'load' }); await p.waitForTimeout(2500);
    await p.locator('button[aria-label*="organiser"]').tap(); await p.waitForTimeout(700);
    await p.locator('input[type="password"]').fill(PIN);
    await p.getByRole('button',{name:'Unlock',exact:true}).tap(); await p.waitForTimeout(2000);
    await p.goto(B+'/teams', { waitUntil:'load' }); await p.waitForTimeout(3000);
    await p.evaluate(()=>{window.__ix=[];});

    await p.locator('[data-slot-trigger-key]').first().tap(); await p.waitForTimeout(900);
    for (const n of ['Adam Jos','Alon','Andy','Anuj','Ben N']) {
      await p.getByText(n,{exact:true}).first().tap().catch(()=>{});
      await p.waitForTimeout(350);
    }
    await report(p, '/teams   open picker + 5 picks');
    await p.evaluate(()=>{window.__ix=[];});
    await p.getByRole('button',{name:'Done',exact:true}).tap().catch(()=>{});
    await p.waitForTimeout(2500);
    await report(p, '/teams   commit batch (Done)');
    await ctx.close();
  }
} finally {
  await b.close();
  const n = await cleanTests();
  const { data:open } = await sb.from('gameweeks').select('id').eq('status','open');
  console.log(`\nCLEANUP removed ${n} | open gameweeks now: ${open?.length ?? 0}`);
}
