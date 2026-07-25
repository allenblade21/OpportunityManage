import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FollowUp } from '../types';
import {
  buildCalendarDays, dueForNotify, fmtWan, fmtWhen, groupFollowUps, isOverdue,
  quarterStart, sortFollowUps, stageMeta, ymd,
} from '../utils';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-22T10:00:00'));
});
afterAll(() => {
  vi.useRealTimers();
});

const fu = (over: Partial<FollowUp>): FollowUp => ({
  id: Math.random().toString(36).slice(2),
  title: '测试跟进',
  type: 'call',
  dueAt: new Date().toISOString(),
  priority: 'P2',
  status: 'open',
  createdAt: new Date().toISOString(),
  ...over,
});

describe('fmtWan 金额格式化', () => {
  it('整万显示为 N万', () => {
    expect(fmtWan(680000)).toBe('¥68万');
    expect(fmtWan(1000000)).toBe('¥100万');
    expect(fmtWan(10000)).toBe('¥1万');
  });
  it('非整万保留一位小数', () => {
    expect(fmtWan(155000)).toBe('¥15.5万');
    expect(fmtWan(683000)).toBe('¥68.3万');
  });
  it('不足万元显示全额', () => {
    expect(fmtWan(9000)).toBe('¥9,000');
  });
});

describe('fmtWhen 人性化时间', () => {
  it('今天 / 昨天 / 明天 / 日期', () => {
    expect(fmtWhen('2026-07-22T14:00:00')).toBe('今天 14:00');
    expect(fmtWhen('2026-07-21T18:00:00')).toBe('昨天 18:00');
    expect(fmtWhen('2026-07-23T09:30:00')).toBe('明天 09:30');
    expect(fmtWhen('2026-07-30T09:30:00')).toBe('07-30');
    expect(fmtWhen('2026-07-22T14:00:00', false)).toBe('今天');
  });
});

describe('quarterStart 季度起点', () => {
  it('7 月属于 Q3,起点为 7 月 1 日', () => {
    const qs = quarterStart();
    expect(qs.getMonth()).toBe(6);
    expect(qs.getDate()).toBe(1);
    expect(qs.getFullYear()).toBe(2026);
  });
});

describe('isOverdue 逾期判断', () => {
  it('截止时间早于当前为逾期', () => {
    expect(isOverdue(fu({ dueAt: '2026-07-22T08:00:00' }))).toBe(true);
    expect(isOverdue(fu({ dueAt: '2026-07-22T14:00:00' }))).toBe(false);
  });
  it('已完成的不算逾期', () => {
    expect(isOverdue(fu({ dueAt: '2026-07-20T08:00:00', status: 'done' }))).toBe(false);
  });
});

describe('groupFollowUps 时间分组', () => {
  it('按 逾期/今天/本周/以后/今日已完成 分组', () => {
    const overdue = fu({ id: 'a', dueAt: '2026-07-21T18:00:00' });
    const today = fu({ id: 'b', dueAt: '2026-07-22T14:00:00' });
    const week = fu({ id: 'c', dueAt: '2026-07-25T10:00:00' });
    const later = fu({ id: 'd', dueAt: '2026-08-10T10:00:00' });
    const doneToday = fu({ id: 'e', status: 'done', doneAt: '2026-07-22T09:00:00' });
    const doneOld = fu({ id: 'f', status: 'done', doneAt: '2026-07-20T09:00:00' });

    const g = groupFollowUps([overdue, today, week, later, doneToday, doneOld]);
    expect(g.overdue.map((f) => f.id)).toEqual(['a']);
    expect(g.today.map((f) => f.id)).toEqual(['b']);
    expect(g.week.map((f) => f.id)).toEqual(['c']);
    expect(g.later.map((f) => f.id)).toEqual(['d']);
    expect(g.doneToday.map((f) => f.id)).toEqual(['e']);
  });

  it('第 7 天算本周,第 8 天算以后', () => {
    const day7 = fu({ id: 'w', dueAt: '2026-07-29T10:00:00' });
    const day8 = fu({ id: 'l', dueAt: '2026-07-30T10:00:00' });
    const g = groupFollowUps([day7, day8]);
    expect(g.week.map((f) => f.id)).toEqual(['w']);
    expect(g.later.map((f) => f.id)).toEqual(['l']);
  });
});

describe('sortFollowUps 排序:优先级 → 截止时间', () => {
  it('P0 在前,同级按时间升序', () => {
    const a = fu({ id: 'a', priority: 'P2', dueAt: '2026-07-23T10:00:00' });
    const b = fu({ id: 'b', priority: 'P0', dueAt: '2026-07-25T10:00:00' });
    const c = fu({ id: 'c', priority: 'P2', dueAt: '2026-07-22T12:00:00' });
    expect(sortFollowUps([a, b, c]).map((f) => f.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('buildCalendarDays 月历网格', () => {
  it('42 天、周一开头、覆盖整月首尾', () => {
    const days = buildCalendarDays(new Date(2026, 6, 1)); // 2026-07,7月1日是周三
    expect(days).toHaveLength(42);
    expect(days[0].getDay()).toBe(1);
    expect(ymd(days[0])).toBe('2026-06-29');
    expect(days.some((d) => ymd(d) === '2026-07-01')).toBe(true);
    expect(days.some((d) => ymd(d) === '2026-07-31')).toBe(true);
  });

  it('1 号恰为周一时从当日开始', () => {
    const days = buildCalendarDays(new Date(2026, 5, 1)); // 2026-06-01 是周一
    expect(ymd(days[0])).toBe('2026-06-01');
  });
});

describe('dueForNotify 通知判定', () => {
  const now = new Date('2026-07-22T10:00:00').getTime();

  it('15 分钟提醒窗口内或已逾期的待办需要通知', () => {
    const soon = fu({ id: 'soon', dueAt: '2026-07-22T10:10:00' });
    const far = fu({ id: 'far', dueAt: '2026-07-22T10:20:00' });
    const overdue = fu({ id: 'over', dueAt: '2026-07-22T09:00:00' });
    const done = fu({ id: 'done', dueAt: '2026-07-22T09:00:00', status: 'done' });
    const ids = dueForNotify([soon, far, overdue, done], [], now).map((f) => f.id);
    expect(ids.sort()).toEqual(['over', 'soon']);
  });

  it('已通知过的不重复通知', () => {
    const overdue = fu({ id: 'over', dueAt: '2026-07-22T09:00:00' });
    expect(dueForNotify([overdue], ['over'], now)).toHaveLength(0);
  });
});

describe('stageMeta 阶段默认赢率', () => {
  it('随阶段递增,赢单 100 输单 0', () => {
    expect(stageMeta.lead.defWin).toBe(10);
    expect(stageMeta.negotiation.defWin).toBe(70);
    expect(stageMeta.won.defWin).toBe(100);
    expect(stageMeta.lost.defWin).toBe(0);
  });
});

/* ================= 边界用例 ================= */

describe('边界:金额极值', () => {
  it('0 与刚好不足万元', () => {
    expect(fmtWan(0)).toBe('¥0');
    expect(fmtWan(9999)).toBe('¥9,999');
  });
  it('超大金额保留一位小数', () => {
    expect(fmtWan(123456789)).toBe('¥12345.7万');
  });
});

describe('边界:跟进分组时刻临界', () => {
  it('空列表返回全空分组', () => {
    const g = groupFollowUps([]);
    expect(g.overdue).toEqual([]);
    expect(g.today).toEqual([]);
    expect(g.week).toEqual([]);
    expect(g.later).toEqual([]);
    expect(g.doneToday).toEqual([]);
  });
  it('今天 23:59 归今天,次日 00:00 归本周', () => {
    const g = groupFollowUps([
      fu({ id: 'edge-today', dueAt: '2026-07-22T23:59:00' }),
      fu({ id: 'edge-week', dueAt: '2026-07-23T00:00:00' }),
    ]);
    expect(g.today.map((f) => f.id)).toEqual(['edge-today']);
    expect(g.week.map((f) => f.id)).toEqual(['edge-week']);
  });
});

describe('边界:日历特殊月份', () => {
  it('非闰年 2 月且 1 号恰为周一(2027-02)', () => {
    const days = buildCalendarDays(new Date(2027, 1, 1));
    expect(days).toHaveLength(42);
    expect(ymd(days[0])).toBe('2027-02-01');
    expect(days.some((d) => ymd(d) === '2027-02-28')).toBe(true);
  });
  it('12 月网格跨年包含次年 1 月', () => {
    const days = buildCalendarDays(new Date(2026, 11, 1));
    expect(days.some((d) => ymd(d) === '2027-01-01')).toBe(true);
  });
});

describe('边界:季度起点', () => {
  it('季度首月、季度末日、跨季首日', () => {
    expect(quarterStart(new Date(2026, 0, 15)).getMonth()).toBe(0);
    expect(quarterStart(new Date(2026, 2, 31)).getMonth()).toBe(0);
    expect(quarterStart(new Date(2026, 3, 1)).getMonth()).toBe(3);
    expect(quarterStart(new Date(2026, 11, 31)).getMonth()).toBe(9);
  });
});
