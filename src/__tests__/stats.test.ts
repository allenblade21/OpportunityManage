import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  computeOverview, lostReasons, monthlyWonTrend, periodStart, sourceBreakdown,
  stageSnapshot, weeklyDoneTrend,
} from '../lib/stats';
import type { FollowUp, Opportunity } from '../types';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-22T10:00:00')); // 周三
});
afterAll(() => {
  vi.useRealTimers();
});

const opp = (over: Partial<Opportunity>): Opportunity => ({
  id: Math.random().toString(36).slice(2),
  name: '商机',
  company: '公司',
  amount: 100000,
  stage: 'lead',
  priority: 'P2',
  winRate: 10,
  tags: [],
  contactIds: [],
  owner: '我',
  createdAt: '2026-07-01T10:00:00',
  updatedAt: '2026-07-01T10:00:00',
  ...over,
});

const doneFu = (doneAt: string): FollowUp => ({
  id: Math.random().toString(36).slice(2),
  title: 'x',
  type: 'call',
  dueAt: doneAt,
  priority: 'P2',
  status: 'done',
  doneAt,
  createdAt: doneAt,
});

describe('periodStart 周期起点', () => {
  it('本月 / 本季 / 今年 / 全部', () => {
    expect(periodStart('month').getTime()).toBe(new Date(2026, 6, 1).getTime());
    expect(periodStart('quarter').getTime()).toBe(new Date(2026, 6, 1).getTime());
    expect(periodStart('year').getTime()).toBe(new Date(2026, 0, 1).getTime());
    expect(periodStart('all').getTime()).toBe(0);
  });
});

describe('computeOverview 概览', () => {
  const data = [
    opp({ createdAt: '2026-07-05T10:00:00', wonAt: '2026-07-15T10:00:00', stage: 'won', amount: 200000 }), // 周期 10 天
    opp({ createdAt: '2026-06-20T10:00:00', wonAt: '2026-07-10T10:00:00', stage: 'won', amount: 400000 }), // 周期 20 天
    opp({ createdAt: '2026-07-02T10:00:00', lostAt: '2026-07-08T10:00:00', stage: 'lost' }),
    opp({ createdAt: '2026-03-01T10:00:00' }), // 期外创建,进行中
  ];

  it('赢单率 / 平均周期 / 平均客单价', () => {
    const o = computeOverview(data, 'month');
    expect(o.created).toBe(2);
    expect(o.wonCount).toBe(2);
    expect(o.wonSum).toBe(600000);
    expect(o.lostCount).toBe(1);
    expect(o.winRate).toBe(67);
    expect(o.avgCycleDays).toBe(15);
    expect(o.avgDeal).toBe(300000);
  });

  it('切换周期改变归属(今年含 3 月创建)', () => {
    expect(computeOverview(data, 'year').created).toBe(4);
  });

  it('空数据集全部为 0 / null', () => {
    const o = computeOverview([], 'all');
    expect(o).toEqual({
      created: 0, wonCount: 0, wonSum: 0, lostCount: 0,
      winRate: null, avgCycleDays: null, avgDeal: null,
    });
  });
});

describe('monthlyWonTrend 月度赢单', () => {
  it('月界:上月最后一刻归上月,当月 1 日零点归当月', () => {
    const data = [
      opp({ stage: 'won', wonAt: '2026-06-30T23:59:59', amount: 100000 }),
      opp({ stage: 'won', wonAt: '2026-07-01T00:00:00', amount: 200000 }),
    ];
    const trend = monthlyWonTrend(data, 6);
    expect(trend).toHaveLength(6);
    expect(trend.map((t) => t.label)).toEqual(['2月', '3月', '4月', '5月', '6月', '7月']);
    expect(trend[4]).toMatchObject({ count: 1, sum: 100000 });
    expect(trend[5]).toMatchObject({ count: 1, sum: 200000 });
  });
});

describe('lostReasons 输单原因', () => {
  it('分组计数、降序,空白原因归「未填写」;非输单不计', () => {
    const data = [
      opp({ stage: 'lost', lostReason: '价格' }),
      opp({ stage: 'lost', lostReason: '价格' }),
      opp({ stage: 'lost', lostReason: '  ' }),
      opp({ stage: 'won', lostReason: '不该出现' }),
    ];
    expect(lostReasons(data)).toEqual([
      { reason: '价格', count: 2 },
      { reason: '未填写', count: 1 },
    ]);
  });
});

describe('sourceBreakdown 来源分析', () => {
  it('空来源归「未标来源」;无已定结果时赢单率为 null;在途金额只算进行中', () => {
    const data = [
      opp({ source: '展会', stage: 'won', amount: 100000 }),
      opp({ source: '展会', stage: 'lost' }),
      opp({ source: '展会', stage: 'needs', amount: 300000 }),
      opp({ source: '', stage: 'lead', amount: 50000 }),
    ];
    const rows = sourceBreakdown(data);
    expect(rows[0]).toMatchObject({ source: '展会', total: 3, wonCount: 1, activeSum: 300000, winRate: 50 });
    expect(rows[1]).toMatchObject({ source: '未标来源', total: 1, winRate: null, activeSum: 50000 });
  });
});

describe('weeklyDoneTrend 周跟进量', () => {
  it('周一为界:周日 23:59 归本周,下周一 00:00 不计入', () => {
    // 今天 2026-07-22(周三),本周一为 07-20
    const fus = [
      doneFu('2026-07-20T00:00:00'), // 本周一零点 → 本周
      doneFu('2026-07-19T23:59:00'), // 上周日深夜 → 上周
      doneFu('2026-07-26T23:59:00'), // 本周日深夜 → 本周
    ];
    const trend = weeklyDoneTrend(fus, 2);
    expect(trend.map((t) => t.label)).toEqual(['07-13', '07-20']);
    expect(trend[0].count).toBe(1);
    expect(trend[1].count).toBe(2);
  });

  it('未完成与无 doneAt 的不计入', () => {
    const open: FollowUp = { ...doneFu('2026-07-21T10:00:00'), status: 'open', doneAt: undefined };
    expect(weeklyDoneTrend([open], 1)[0].count).toBe(0);
  });
});

describe('stageSnapshot 阶段快照', () => {
  it('数量 / 金额 / 加权金额', () => {
    const data = [
      opp({ stage: 'needs', amount: 100000, winRate: 40 }),
      opp({ stage: 'needs', amount: 200000, winRate: 40 }),
      opp({ stage: 'won', amount: 999999 }), // 不在管道内
    ];
    const snap = stageSnapshot(data);
    const needs = snap.find((s) => s.stage === 'needs')!;
    expect(needs).toMatchObject({ count: 2, sum: 300000, weighted: 120000 });
    expect(snap.some((s) => (s.stage as string) === 'won')).toBe(false);
  });
});
