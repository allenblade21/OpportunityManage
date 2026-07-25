/**
 * E2E 冒烟测试:自起 vite preview,用 Chromium 走通核心用户路径。
 * 前置:npm run build(需要 dist/);浏览器路径可用 CHROMIUM_PATH 覆盖。
 * 运行:npm run e2e
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });

  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`console: ${m.text()}`);
  });
  // confirm 一律接受;prompt 输入输单原因
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? '竞品价格更低' : undefined));
  // Notification 桩:记录通知调用,权限视为已授予
  await page.addInitScript(() => {
    window.__notifs = [];
    class FakeNotification {
      static permission = 'granted';
      static requestPermission() {
        return Promise.resolve('granted');
      }
      constructor(title, options) {
        window.__notifs.push({ title, options });
        this.close = () => {};
      }
    }
    window.Notification = FakeNotification;
  });

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

  /* 10. 日历视图:渲染、今日高亮、点击条目编辑 */
  await page.click('nav.nav a:has-text("跟进项")');
  await page.click('.seg button:has-text("日历")');
  await page.waitForSelector('.cal-grid');
  assert('日历渲染 42 个日格', (await page.locator('.cal-cell').count()) === 42);
  assert('今日日格高亮', (await page.locator('.cal-cell.today').count()) === 1);
  assert('日历上有跟进条目', (await page.locator('.cal-chip').count()) >= 1);
  await page.screenshot({ path: `${OUT}/7-calendar.png` });
  await page.locator('.cal-chip').first().click();
  await page.waitForSelector('.modal:has-text("编辑跟进")');
  assert('点击日历条目打开编辑', true);
  await page.click('.m-f .btn:has-text("取消")');

  /* 11. 到期通知:开启铃铛后,逾期跟进立即触发通知(桩记录) */
  await page.click('.bell');
  await page.waitForTimeout(500);
  const notifCount = await page.evaluate(() => window.__notifs.length);
  assert('开启通知后收到到期提醒', notifCount >= 1, `got ${notifCount}`);
  const bellOn = await page.locator('.bell.bell-on').count();
  assert('铃铛显示开启状态', bellOn === 1);

  /* 12. 设置弹窗:导出 Excel / JSON(捕获下载) */
  await page.click('.side-foot a:has-text("设置")');
  await page.waitForSelector('.modal:has-text("数据管理")');
  const dlExcel = page.waitForEvent('download');
  await page.click('button:has-text("导出 Excel")');
  const excelFile = await dlExcel;
  assert('导出 Excel 文件名为 .xlsx', excelFile.suggestedFilename().endsWith('.xlsx'), excelFile.suggestedFilename());
  const excelPath = `${OUT}/export.xlsx`;
  await excelFile.saveAs(excelPath);

  const dlJson = page.waitForEvent('download');
  await page.click('button:has-text("导出 JSON 备份")');
  const jsonFile = await dlJson;
  assert('导出 JSON 文件名为 .json', jsonFile.suggestedFilename().endsWith('.json'), jsonFile.suggestedFilename());

  /* 13. 导入回灌:把刚导出的 Excel 再导入 → 全部按 ID 更新 */
  await page.setInputFiles('[data-testid="import-input"]', excelPath);
  await page.waitForSelector('.toast.show:has-text("Excel 导入完成")', { timeout: 8000 });
  const importToast = await page.locator('.toast.show').innerText();
  assert('导入回灌全部识别为更新(新增 0)', importToast.includes('新增 0'), importToast);
  await page.screenshot({ path: `${OUT}/8-settings.png` });
  await page.click('.m-f .btn:has-text("关闭")');

  /* 15. 边界:必填校验(空表单保存被拦截) */
  await page.click('.qwrap .btn-pri');
  await page.click('.qmenu button:has-text("新建商机")');
  await page.waitForSelector('.modal:has-text("新建商机")');
  await page.click('.m-f .btn-pri');
  assert(
    '空必填保存被拦截并提示',
    (await page.locator('.toast.show:has-text("请填写商机名称与客户公司")').count()) === 1,
  );
  assert('校验失败时弹窗不关闭', (await page.locator('.modal').count()) === 1);
  await page.click('.m-f .btn:has-text("取消")');

  /* 16. 边界:搜索无结果与 Esc 关闭 */
  await page.keyboard.press('Control+k');
  await page.waitForSelector('.search-modal');
  await page.fill('.sr-input input', 'zzz不存在的关键词');
  await page.waitForTimeout(200);
  assert('搜索无结果提示', (await page.locator('.sr-hint:has-text("没有找到")').count()) === 1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  assert('Esc 关闭搜索', (await page.locator('.search-modal').count()) === 0);

  /* 17. 边界:完成跟进但不创建下一次 */
  await page.click('nav.nav a:has-text("跟进项")');
  await page.click('.seg button:has-text("列表")');
  await page.waitForSelector('.fgroup');
  await page.locator('.fu:not(.done) .check').first().click();
  await page.waitForSelector('.modal:has-text("完成跟进")');
  await page.locator('.chk-row input').uncheck();
  await page.click('.m-f .btn-pri');
  await page.waitForTimeout(400);
  assert('未勾选时不打开新建跟进', (await page.locator('.modal').count()) === 0);
  assert('完成项进入今日已完成分组', (await page.locator('.panel-h:has-text("今日已完成")').count()) === 1);

  /* 18. 边界:拖拽到赢单列(确认框自动接受) */
  await page.click('nav.nav a:has-text("商机")');
  await page.waitForSelector('.board .col');
  await page.evaluate(() => {
    const card = [...document.querySelectorAll('.kcard')].find((c) =>
      c.textContent.includes('在线课堂平台定制'),
    );
    const col = [...document.querySelectorAll('.col')].find((c) =>
      c.querySelector('.col-h')?.textContent.includes('赢单'),
    );
    if (!card || !col) return;
    const dt = new DataTransfer();
    card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    col.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    col.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    card.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
  });
  await page.waitForTimeout(400);
  assert(
    '拖入赢单列后卡片显示已赢单',
    (await page.locator('.kcard:has-text("在线课堂平台定制") .chip:has-text("已赢单")').count()) === 1,
  );

  /* 19. 边界:导入损坏的 Excel 文件 */
  writeFileSync(`${OUT}/bad.xlsx`, 'this is definitely not an excel file');
  await page.click('.side-foot a:has-text("设置")');
  await page.waitForSelector('.modal:has-text("数据管理")');
  await page.setInputFiles('[data-testid="import-input"]', `${OUT}/bad.xlsx`);
  await page.waitForSelector('.toast.show:has-text("导入失败")', { timeout: 8000 });
  assert('损坏文件导入报错且不崩溃', true);

  /* 20. JSON 备份恢复闭环 */
  const dlJson2 = page.waitForEvent('download');
  await page.click('button:has-text("导出 JSON 备份")');
  const jsonPath = `${OUT}/backup.json`;
  await (await dlJson2).saveAs(jsonPath);
  await page.setInputFiles('[data-testid="import-input"]', jsonPath);
  await page.waitForSelector('.toast.show:has-text("数据已恢复")', { timeout: 8000 });
  assert('JSON 备份导入恢复成功', true);

  /* 21. 边界:通知重载后不重复(已通知记录持久化) */
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.kpis .kpi');
  await page.waitForTimeout(700);
  const notifAfterReload = await page.evaluate(() => window.__notifs.length);
  assert('重载后不重复通知', notifAfterReload === 0, `got ${notifAfterReload}`);

  /* 22. 移动端视口冒烟 */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  assert('窄屏下导航仍完整(5 项)', (await page.locator('nav.nav a[href]').count()) >= 5);
  await page.screenshot({ path: `${OUT}/9-mobile.png` });
  await page.setViewportSize({ width: 1440, height: 900 });

  /* 23. 存储迁移:旧 localStorage → IndexedDB(独立 origin 127.0.0.1) */
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.addInitScript(() => {
    const marker = {
      id: 'mig-1', name: '迁移测试商机', company: '旧数据公司', amount: 120000,
      stage: 'lead', priority: 'P2', winRate: 10, tags: [], contactIds: [],
      owner: '我', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const state = {
      opportunities: [marker], contacts: [], followUps: [], ideas: [], activities: [],
      notifyEnabled: false, notifiedIds: [],
    };
    localStorage.setItem('jihui-store-v1', JSON.stringify({ state, version: 0 }));
  });
  await p2.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await p2.waitForSelector('.kpis .kpi');
  await p2.click('nav.nav a:has-text("商机")');
  await p2.waitForSelector('.board .col');
  assert(
    '旧 localStorage 数据完成迁移并展示',
    (await p2.locator('.kcard:has-text("迁移测试商机")').count()) === 1,
  );
  await p2.evaluate(() => localStorage.removeItem('jihui-store-v1'));
  await p2.reload({ waitUntil: 'networkidle' });
  await p2.click('nav.nav a:has-text("商机")');
  await p2.waitForSelector('.board .col');
  assert(
    '清除 localStorage 后数据仍在(已入 IndexedDB)',
    (await p2.locator('.kcard:has-text("迁移测试商机")').count()) === 1,
  );
  await ctx2.close();

  /* 24. 控制台无报错 */
  assert('无控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.click('nav.nav a:has-text("跟进项")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/6-calendar-dark.png` });
} finally {
  await browser.close();
  server.kill();
}

console.log(JSON.stringify({ passed: ok.length, failed: failures.length, failures }, null, 2));
if (failures.length > 0) process.exit(1);
