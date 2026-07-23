/**
 * E2E 冒烟测试:自起 vite preview,用 Chromium 走通核心用户路径。
 * 前置:npm run build(需要 dist/);浏览器路径可用 CHROMIUM_PATH 覆盖。
 * 运行:npm run e2e
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4574;
const BASE = `http://localhost:${PORT}`;
const OUT = process.env.E2E_OUT_DIR ?? 'e2e-artifacts';
const EXEC = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

mkdirSync(OUT, { recursive: true });

const failures = [];
const ok = [];
function assert(name, cond, extra = '') {
  if (cond) ok.push(name);
  else failures.push(`${name}${extra ? ` — ${extra}` : ''}`);
}

/* ---------- 启动 preview 服务 ---------- */
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: false,
});
async function waitServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview server did not start');
}

const browser = await chromium.launch({ executablePath: EXEC });
try {
  await waitServer();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`console: ${m.text()}`);
  });
  // confirm 一律接受;prompt 输入输单原因
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? '竞品价格更低' : undefined));

  /* 1. 工作台加载 + 逾期提醒 Toast */
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.kpis .kpi');
  assert('工作台渲染 4 个 KPI', (await page.locator('.kpi').count()) === 4);
  assert(
    '载入时弹出逾期提醒',
    (await page.locator('.toast.show', { hasText: '逾期' }).count()) === 1,
  );
  await page.screenshot({ path: `${OUT}/1-dashboard.png` });

  /* 2. 看板拖拽:设备监控系统 线索 → 初步接触 */
  await page.click('nav.nav a:has-text("商机")');
  await page.waitForSelector('.board .col');
  const dragged = await page.evaluate(() => {
    const card = [...document.querySelectorAll('.kcard')].find((c) =>
      c.textContent.includes('设备监控系统'),
    );
    const col = [...document.querySelectorAll('.col')].find((c) =>
      c.querySelector('.col-h')?.textContent.includes('初步接触'),
    );
    if (!card || !col) return false;
    const dt = new DataTransfer();
    card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    col.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    col.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    card.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
    return true;
  });
  assert('拖拽事件派发成功', dragged);
  await page.waitForTimeout(300);
  const inTarget = await page.evaluate(() => {
    const col = [...document.querySelectorAll('.col')].find((c) =>
      c.querySelector('.col-h')?.textContent.includes('初步接触'),
    );
    return col?.textContent.includes('设备监控系统') ?? false;
  });
  assert('拖拽后卡片位于「初步接触」列', inTarget);
  await page.screenshot({ path: `${OUT}/2-board-after-drag.png` });

  /* 3. 持久化:刷新后拖拽结果仍在 */
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('nav.nav a:has-text("商机")');
  await page.waitForSelector('.board .col');
  const persisted = await page.evaluate(() => {
    const col = [...document.querySelectorAll('.col')].find((c) =>
      c.querySelector('.col-h')?.textContent.includes('初步接触'),
    );
    return col?.textContent.includes('设备监控系统') ?? false;
  });
  assert('刷新后阶段变更已持久化(localStorage)', persisted);

  /* 4. 全局搜索 Ctrl+K → 回车打开第一条 */
  await page.keyboard.press('Control+k');
  await page.waitForSelector('.search-modal');
  await page.fill('.sr-input input', '星辰');
  await page.waitForTimeout(200);
  assert('搜索出现结果分组', (await page.locator('.sr-sec').count()) >= 1);
  await page.screenshot({ path: `${OUT}/3-search.png` });
  await page.press('.sr-input input', 'Enter');
  await page.waitForSelector('.stepper');
  assert(
    '回车跳转到星辰科技商机详情',
    (await page.locator('.dtop h1:has-text("ERP 系统升级项目")').count()) === 1,
  );

  /* 5. 编辑商机:改名保存 */
  await page.click('.dact button:has-text("编辑")');
  await page.waitForSelector('.modal');
  assert('编辑弹窗带删除按钮', (await page.locator('.btn-danger').count()) === 1);
  await page.fill('.modal input[placeholder*="ERP"]', 'ERP 系统升级项目(二期)');
  await page.click('.m-f .btn-pri');
  await page.waitForTimeout(200);
  assert(
    '编辑后标题已更新',
    (await page.locator('.dtop h1:has-text("(二期)")').count()) === 1,
  );

  /* 6. 完成跟进闭环:填结果 → 自动打开「新建跟进」 */
  await page.locator('.fu .check').first().click();
  await page.waitForSelector('.modal:has-text("完成跟进")');
  await page.fill('.modal textarea', '客户确认商务条款,下周出合同');
  await page.screenshot({ path: `${OUT}/4-complete-modal.png` });
  await page.click('.m-f .btn-pri');
  await page.waitForSelector('.modal:has-text("新建跟进")');
  assert('完成后自动引导创建下一次跟进', true);
  await page.click('.m-f .btn:has-text("取消")');
  await page.waitForTimeout(200);
  assert(
    '跟进结果写入时间线',
    (await page.locator('.tl .tli:has-text("客户确认商务条款")').count()) >= 1,
  );

  /* 7. 标记输单(prompt 自动输入原因) */
  await page.click('nav.nav a:has-text("商机")');
  await page.waitForSelector('.board .col');
  await page.click('.kcard:has-text("仓储管理系统")');
  await page.waitForSelector('.stepper');
  await page.click('.dact button:has-text("标记输单")');
  await page.waitForTimeout(300);
  assert(
    '输单横幅显示原因',
    (await page.locator('.lost-banner:has-text("竞品价格更低")').count()) === 1,
  );
  await page.screenshot({ path: `${OUT}/5-lost.png` });

  /* 8. 联系人编辑入口 */
  await page.click('nav.nav a:has-text("联系人")');
  await page.waitForSelector('tbody tr');
  await page.locator('tbody tr .lnk:has-text("编辑")').first().click();
  await page.waitForSelector('.modal:has-text("编辑联系人")');
  assert('联系人编辑弹窗打开', true);
  await page.click('.m-f .btn:has-text("取消")');

  /* 9. 想法:编辑与删除 */
  await page.click('nav.nav a:has-text("想法")');
  await page.waitForSelector('.iwrap .icard');
  const ideasBefore = await page.locator('.icard').count();
  await page.locator('.icard .lnk-mute:has-text("编辑")').last().click();
  await page.waitForSelector('.modal');
  await page.click('.btn-danger');
  await page.waitForTimeout(300);
  const ideasAfter = await page.locator('.icard').count();
  assert('删除想法后卡片减少', ideasAfter === ideasBefore - 1, `${ideasBefore} -> ${ideasAfter}`);

  /* 10. 控制台无报错 */
  assert('无控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.click('nav.nav a:has-text("工作台")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/6-dashboard-dark.png` });
} finally {
  await browser.close();
  server.kill();
}

console.log(JSON.stringify({ passed: ok.length, failed: failures.length, failures }, null, 2));
if (failures.length > 0) process.exit(1);
