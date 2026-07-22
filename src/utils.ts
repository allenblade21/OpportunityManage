import type { ContactRole, FollowUp, FollowUpType, Priority, Stage } from './types';

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const nowISO = () => new Date().toISOString();

/* ---------- 阶段 ---------- */

export const STAGES: Stage[] = ['lead', 'contacted', 'needs', 'proposal', 'negotiation', 'won'];
export const PIPELINE_STAGES: Stage[] = ['lead', 'contacted', 'needs', 'proposal', 'negotiation'];

export const stageMeta: Record<Stage, { label: string; color: string; defWin: number }> = {
  lead:        { label: '线索',     color: 's1', defWin: 10 },
  contacted:   { label: '初步接触', color: 's2', defWin: 20 },
  needs:       { label: '需求确认', color: 's3', defWin: 40 },
  proposal:    { label: '方案报价', color: 's4', defWin: 60 },
  negotiation: { label: '谈判',     color: 's5', defWin: 70 },
  won:         { label: '赢单',     color: 's6', defWin: 100 },
  lost:        { label: '输单',     color: 's1', defWin: 0 },
};

export const isActiveStage = (s: Stage) => s !== 'won' && s !== 'lost';

/* ---------- 优先级 ---------- */

export const PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3'];

export const priorityMeta: Record<Priority, { full: string; cls: string; order: number }> = {
  P0: { full: 'P0 紧急', cls: 'p0', order: 0 },
  P1: { full: 'P1 重要', cls: 'p1', order: 1 },
  P2: { full: 'P2 普通', cls: 'p2', order: 2 },
  P3: { full: 'P3 观察', cls: 'p3', order: 3 },
};

/* ---------- 联系人角色 / 跟进类型 ---------- */

export const roleMeta: Record<ContactRole, { label: string; cls: string }> = {
  decision:   { label: '决策者', cls: 'p2' },
  influencer: { label: '影响者', cls: 'p3' },
  user:       { label: '使用者', cls: 'c-ok' },
  gatekeeper: { label: '把关者', cls: 'c-warn' },
};

export const FOLLOWUP_TYPES: FollowUpType[] = ['call', 'visit', 'email', 'wechat', 'meeting', 'other'];

export const typeLabel: Record<FollowUpType, string> = {
  call: '电话', visit: '拜访', email: '邮件', wechat: '微信', meeting: '会议', other: '其他',
};

/* ---------- 金额与日期格式化 ---------- */

/** 68 0000 -> ¥68万;不足万元显示全额 */
export function fmtWan(amount: number): string {
  if (amount >= 10000) {
    const w = amount / 10000;
    const s = Number.isInteger(w) ? String(w) : w.toFixed(1).replace(/\.0$/, '');
    return `¥${s}万`;
  }
  return `¥${amount.toLocaleString('zh-CN')}`;
}

export const fmtMoney = (amount: number) => `¥${amount.toLocaleString('zh-CN')}`;

const pad = (n: number) => String(n).padStart(2, '0');
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const md = (d: Date) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (d: Date) => Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000);

/** 截止/发生时间的人性化展示:今天 14:00 / 昨天 18:00 / 明天 10:00 / 07-24 */
export function fmtWhen(iso: string, withTime = true): string {
  const d = new Date(iso);
  const diff = dayDiff(d);
  if (diff === 0) return withTime ? `今天 ${hm(d)}` : '今天';
  if (diff === -1) return withTime ? `昨天 ${hm(d)}` : '昨天';
  if (diff === 1) return withTime ? `明天 ${hm(d)}` : '明天';
  return md(d);
}

export const fmtDate = (iso: string) => md(new Date(iso));
export const fmtFullDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const daysSince = (iso: string) => -dayDiff(new Date(iso));

/* ---------- 跟进分组 ---------- */

export const isOverdue = (f: FollowUp) => f.status === 'open' && new Date(f.dueAt).getTime() < Date.now();

export function sortFollowUps(list: FollowUp[]): FollowUp[] {
  return [...list].sort((a, b) => {
    const p = priorityMeta[a.priority].order - priorityMeta[b.priority].order;
    if (p !== 0) return p;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}

export interface FollowUpGroups {
  overdue: FollowUp[];
  today: FollowUp[];
  week: FollowUp[];
  later: FollowUp[];
  doneToday: FollowUp[];
}

export function groupFollowUps(all: FollowUp[]): FollowUpGroups {
  const g: FollowUpGroups = { overdue: [], today: [], week: [], later: [], doneToday: [] };
  const now = Date.now();
  for (const f of all) {
    if (f.status === 'done') {
      if (f.doneAt && dayDiff(new Date(f.doneAt)) === 0) g.doneToday.push(f);
      continue;
    }
    if (f.status !== 'open') continue;
    const due = new Date(f.dueAt);
    const diff = dayDiff(due);
    if (due.getTime() < now) g.overdue.push(f);
    else if (diff === 0) g.today.push(f);
    else if (diff <= 7) g.week.push(f);
    else g.later.push(f);
  }
  g.overdue = sortFollowUps(g.overdue);
  g.today = sortFollowUps(g.today);
  g.week = sortFollowUps(g.week);
  g.later = sortFollowUps(g.later);
  return g;
}

/* ---------- 其他 ---------- */

export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 本季度起点 */
export function quarterStart(d = new Date()): Date {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
}
