const { chromium, devices } = require('playwright');

const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let page;
let originX, originY, cellSize;
const errors = [];
const failures = [];

function cellPoint(row, col) {
  return { x: originX + col * cellSize, y: originY + row * cellSize };
}

async function touchSwipe(a, b, steps = 6) {
  const pa = cellPoint(a.row, a.col);
  const pb = cellPoint(b.row, b.col);
  await page.evaluate(
    ({ pa, pb, steps }) => {
      const el = document.elementFromPoint(pa.x, pa.y);
      if (!el) return;
      function makeTouch(x, y) {
        return new Touch({ identifier: 1, target: el, clientX: x, clientY: y, pageX: x, pageY: y });
      }
      function dispatch(type, x, y) {
        const touch = makeTouch(x, y);
        el.dispatchEvent(
          new TouchEvent(type, {
            touches: type === 'touchend' ? [] : [touch],
            targetTouches: type === 'touchend' ? [] : [touch],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true,
          }),
        );
      }
      dispatch('touchstart', pa.x, pa.y);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        dispatch('touchmove', pa.x + (pb.x - pa.x) * t, pa.y + (pb.y - pa.y) * t);
      }
      dispatch('touchend', pb.x, pb.y);
    },
    { pa, pb, steps },
  );
}

async function touchTap(row, col) {
  const p = cellPoint(row, col);
  await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return;
      const touch = new Touch({ identifier: 2, target: el, clientX: x, clientY: y, pageX: x, pageY: y });
      el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
      el.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touch], bubbles: true, cancelable: true }));
    },
    { x: p.x, y: p.y },
  );
}

async function waitSettled(maxMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const dump = await page.evaluate(() => (window.__boardDump ? window.__boardDump() : null));
    if (dump && !dump.busy) return dump;
    await sleep(100);
  }
  return page.evaluate(() => (window.__boardDump ? window.__boardDump() : null));
}

// Core assertion: every cell has a sprite exactly at its expected position; no nulls; no drift;
// and the settled board holds no unresolved 3-run or 2x2 square (both must always clear/convert)
function assertBoardConsistent(dump, label) {
  if (!dump) {
    failures.push(`${label}: __boardDump unavailable`);
    return;
  }
  const TOLERANCE = 2; // px
  const colorAt = {};
  for (const c of dump.cells) {
    colorAt[`${c.row},${c.col}`] = c.cell; // plain color string, "special:*", or null
    if (c.cell === null) {
      failures.push(`${label}: empty grid cell at (${c.row},${c.col})`);
      continue;
    }
    if (c.spriteX === null) {
      failures.push(`${label}: missing sprite at (${c.row},${c.col}) holding ${c.cell}`);
      continue;
    }
    const dx = Math.abs(c.spriteX - c.expectedX);
    const dy = Math.abs(c.spriteY - c.expectedY);
    if (dx > TOLERANCE || dy > TOLERANCE) {
      failures.push(`${label}: sprite at (${c.row},${c.col}) drifted by (${dx.toFixed(1)},${dy.toFixed(1)})px`);
    }
  }

  const plain = (row, col) => {
    const v = colorAt[`${row},${col}`];
    return v && !v.startsWith('special:') ? v : null;
  };
  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      const v = plain(row, col);
      if (!v) continue;
      if (col + 2 < GRID_WIDTH && plain(row, col + 1) === v && plain(row, col + 2) === v) {
        failures.push(`${label}: unresolved horizontal 3-run of ${v} at (${row},${col})`);
      }
      if (row + 2 < GRID_HEIGHT && plain(row + 1, col) === v && plain(row + 2, col) === v) {
        failures.push(`${label}: unresolved vertical 3-run of ${v} at (${row},${col})`);
      }
      if (row + 1 < GRID_HEIGHT && col + 1 < GRID_WIDTH && plain(row, col + 1) === v && plain(row + 1, col) === v && plain(row + 1, col + 1) === v) {
        failures.push(`${label}: unresolved 2x2 square of ${v} at (${row},${col})`);
      }
    }
  }
}

async function isRunSummaryVisible() {
  return page.evaluate(() => {
    const h2 = Array.from(document.querySelectorAll('h2')).find((el) => el.textContent?.includes('Run complete'));
    if (!h2) return false;
    const overlay = h2.closest('div');
    if (!overlay) return false;
    const cs = getComputedStyle(overlay);
    return cs.opacity !== '0' && cs.pointerEvents !== 'none';
  });
}

async function isLevelUpVisible() {
  return page.evaluate(() => {
    const h2 = Array.from(document.querySelectorAll('h2')).find((el) => el.textContent?.includes('Choose one'));
    if (!h2) return false;
    const panel = h2.closest('div');
    const backdrop = panel?.parentElement;
    if (!backdrop) return false;
    const cs = getComputedStyle(backdrop);
    return cs.opacity !== '0' && cs.pointerEvents !== 'none';
  });
}

async function handleModals() {
  if (await isLevelUpVisible()) {
    await page.evaluate(() => {
      const h2 = Array.from(document.querySelectorAll('h2')).find((el) => el.textContent?.includes('Choose one'));
      const panel = h2?.closest('div');
      panel?.querySelector('button')?.click();
    });
    await sleep(300);
    return true;
  }
  if (await isRunSummaryVisible()) {
    await page.click('text=Play Again');
    await sleep(400);
    return true;
  }
  return false;
}

(async () => {
  const pixel = devices['Pixel 7'];
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ ...pixel, hasTouch: true });
  page = await context.newPage();

  page.on('pageerror', (e) => errors.push(`[pageerror] ${e}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
  });

  await page.goto(`http://localhost:${process.env.PORT ?? 5180}/`, { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="Nickname"]', 'ScenarioBot');
  await page.tap('text=Let');
  await page.waitForSelector('text=Play');
  await page.tap('text=Play');
  await page.waitForSelector('#game-container canvas', { timeout: 10000 });
  await sleep(600);

  const box = await page.locator('#game-container').boundingBox();
  cellSize = Math.floor(Math.min(box.width / GRID_WIDTH, box.height / GRID_HEIGHT));
  originX = box.x + (box.width - cellSize * GRID_WIDTH) / 2 + cellSize / 2;
  originY = box.y + (box.height - cellSize * GRID_HEIGHT) / 2 + cellSize / 2;

  // === Scenario 1: initial board consistency ===
  assertBoardConsistent(await waitSettled(), 'S1-initial');
  console.log('S1 initial board: checked');

  // === Scenario 2: the exact shake-race from the user's screenshot ===
  // invalid swipe then IMMEDIATELY a swipe sharing the same tile, 30 rounds
  for (let i = 0; i < 30; i++) {
    const row = 1 + Math.floor(Math.random() * (GRID_HEIGHT - 2));
    const col = 1 + Math.floor(Math.random() * (GRID_WIDTH - 2));
    await touchSwipe({ row, col }, { row: row - 1, col }); // maybe invalid -> shake
    await touchSwipe({ row, col }, { row, col: col + 1 }); // instantly re-touch same tile
    await sleep(60);
    await handleModals();
  }
  assertBoardConsistent(await waitSettled(), 'S2-shake-race');
  console.log('S2 shake race (30 rounds of back-to-back conflicting swipes): checked');

  // === Scenario 3: sustained rapid random swipes ===
  for (let i = 0; i < 80; i++) {
    const row = Math.floor(Math.random() * GRID_HEIGHT);
    const col = Math.floor(Math.random() * GRID_WIDTH);
    const horizontal = Math.random() < 0.5;
    const b = horizontal
      ? { row, col: col + (col < GRID_WIDTH - 1 ? 1 : -1) }
      : { row: row + (row < GRID_HEIGHT - 1 ? 1 : -1), col };
    await touchSwipe({ row, col }, b);
    await sleep(50);
    await handleModals();
  }
  assertBoardConsistent(await waitSettled(), 'S3-rapid-swipes');
  console.log('S3 sustained rapid swipes (80): checked');

  // === Scenario 4: tap-tap swap gesture path ===
  for (let i = 0; i < 20; i++) {
    const row = Math.floor(Math.random() * GRID_HEIGHT);
    const col = Math.floor(Math.random() * (GRID_WIDTH - 1));
    await touchTap(row, col);
    await sleep(80);
    await touchTap(row, col + 1);
    await sleep(120);
    await handleModals();
  }
  assertBoardConsistent(await waitSettled(), 'S4-tap-tap');
  console.log('S4 tap-tap swaps (20): checked');

  // === Scenario 5: taps on random cells (activation path fuzz incl. any special tiles) ===
  for (let i = 0; i < 40; i++) {
    await touchTap(Math.floor(Math.random() * GRID_HEIGHT), Math.floor(Math.random() * GRID_WIDTH));
    await sleep(60);
    await handleModals();
  }
  assertBoardConsistent(await waitSettled(), 'S5-tap-fuzz');
  console.log('S5 tap fuzz (40): checked');

  // === Scenario 6: restart mid-play, board must be fresh and consistent ===
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === '↻');
    btn?.click();
  });
  await sleep(600);
  assertBoardConsistent(await waitSettled(), 'S6-restart');
  console.log('S6 restart: checked');

  // === Scenario 7: play until run ends naturally (timer), then Play Again ===
  console.log('S7 waiting for natural run end (timer depletion)...');
  let runEnded = false;
  for (let i = 0; i < 300; i++) {
    if (await isRunSummaryVisible()) {
      runEnded = true;
      break;
    }
    if (await isLevelUpVisible()) await handleModals();
    await sleep(500);
  }
  if (!runEnded) failures.push('S7: run never ended within timeout');
  else {
    await page.click('text=Play Again');
    await sleep(700);
    assertBoardConsistent(await waitSettled(), 'S7-after-play-again');
    console.log('S7 natural run end + Play Again: checked');
  }

  // === Results ===
  console.log('\n=== RESULTS ===');
  console.log(`Console errors: ${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 10).join('\n'));
  console.log(`Consistency failures: ${failures.length}`);
  if (failures.length) console.log(failures.slice(0, 30).join('\n'));
  console.log(failures.length === 0 && errors.length === 0 ? 'ALL SCENARIOS PASSED' : 'FAILURES DETECTED');

  await page.screenshot({ path: '/tmp/gf_game_scenario_final.png' });
  await browser.close();
  process.exit(failures.length === 0 && errors.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error('SCRIPT FAILED:', e);
  process.exit(1);
});
