// Core Web Vitals on an emulated mid-range phone (Pixel 5, ~1.6Mbps / 150ms
// RTT, 4x CPU slowdown). Start the production server first, then:
//
//   npm run build && npx next start -p 3000
//   node scripts/measure-vitals.mjs http://localhost:3000
//
// Baseline recorded 2026-11-16 (all four routes inside Google's "good" bands):
//   /         TTFB 151ms | FCP 788ms | LCP 788ms | CLS 0 | JS 183.6KB
//   /league   TTFB 151ms | FCP 776ms | LCP 776ms | CLS 0 | JS 182.0KB
//   /history  TTFB 151ms | FCP 752ms | LCP 752ms | CLS 0 | JS 189.7KB
//   /teams    TTFB 151ms | FCP 752ms | LCP 752ms | CLS 0 | JS 183.0KB
//
// Requires playwright, which is not a project dependency:
//   npm i -D playwright
import { chromium, devices } from 'playwright';
const B = process.argv[2] || 'http://localhost:3550';
const b = await chromium.launch({ channel: 'chrome' });

for (const route of ['/', '/league', '/history', '/teams']) {
  const ctx = await b.newContext({ ...devices['Pixel 5'] });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  // Fast 3G-ish + 4x CPU slowdown: a mid-range phone on mobile data.
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, downloadThroughput: 1.6*1024*1024/8,
    uploadThroughput: 750*1024/8, latency: 150,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await p.addInitScript(() => {
    window.__v = {};
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__v.lcp = e.startTime; })
      .observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls = (window.__v.cls||0)+e.value; })
      .observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__v.fcp = e.startTime; })
      .observe({ type: 'paint', buffered: true });
  });

  await p.goto(B + route, { waitUntil: 'load' });
  await p.waitForTimeout(5000);
  const v = await p.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const js = performance.getEntriesByType('resource').filter(e=>e.name.endsWith('.js'));
    return {
      ttfb: Math.round(nav.responseStart),
      fcp: Math.round(window.__v.fcp ?? 0),
      lcp: Math.round(window.__v.lcp ?? 0),
      cls: +(window.__v.cls ?? 0).toFixed(4),
      jsKB: +(js.reduce((a,e)=>a+e.encodedBodySize,0)/1024).toFixed(1),
      domDone: Math.round(nav.domContentLoadedEventEnd),
    };
  });
  console.log(`${route.padEnd(10)} TTFB ${String(v.ttfb).padStart(4)}ms | FCP ${String(v.fcp).padStart(4)}ms | LCP ${String(v.lcp).padStart(4)}ms | CLS ${v.cls} | DCL ${String(v.domDone).padStart(4)}ms | JS ${v.jsKB}KB`);
  await ctx.close();
}
await b.close();
