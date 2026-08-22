/** 统计报表的纯计算函数(全部可单测,不依赖 store) */
import type { FollowUp, Opportunity, Stage } from '../types';
import { PIPELINE_STAGES, isActiveStage } from '../utils';

export type Period = 'month' | 'quarter' | 'year' | 'all';

export const PERIOD_LABEL: Record<Period, string> = {
  month: '本月', quarter: '本季', year: '今年', all: '全部',
};

export function periodStart(period: Period, now = new Date()): Date {
  switch (period) {
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarter':
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
      return new Date(0);
  }
}

const inRange = (iso: string | undefined, start: Date) => !!iso && new Date(iso) >= start;

export interface Overview {
  created: number;
  wonCount: number;
  wonSum: number;
  lostCount: number;
  /** 期内已定输赢中的赢单占比;无已定结果时为 null */
  winRate: number | null;
  /** 赢单平均周期(创建→赢单,天,1 位小数);无赢单时为 null */
  avgCycleDays: number | null;
  /** 平均客单价(赢单金额/赢单数);无赢单时为 null */
  avgDeal: number | null;
}

export function computeOverview(opps: Opportunity[], period: Period, now = new Date()): Overview {
  const start = periodStart(period, now);
  const won = opps.filter((o) => inRange(o.wonAt, start));
  const lost = opps.filter((o) => inRange(o.lostAt, start));
  const wonSum = won.reduce((s, o) => s + o.amount, 0);
  const decided = won.length + lost.length;
  const cycles = won
    .map((o) => (new Date(o.wonAt!).getTime() - new Date(o.createdAt).getTime()) / 86400000)
    .filter((d) => d >= 0);
  return {
    created: opps.filter((o) => inRange(o.createdAt, start)).length,
    wonCount: won.length,
    wonSum,
    lostCount: lost.length,
    winRate: decided > 0 ? Math.round((won.length / decided) * 100) : null,
    avgCycleDays:
      cycles.length > 0
        ? Math.round((cycles.reduce((a, b) => a + b, 0) / cycles.length) * 10) / 10
        : null,
    avgDeal: won.length > 0 ? Math.round(wonSum / won.length) : null,
  };
}

export interface MonthBucket {
  label: string;
  count: number;
  sum: number;
}

/** 近 N 个自然月(含当月)的赢单趋势 */
export function monthlyWonTrend(opps: Opportunity[], months = 6, now = new Date()): MonthBucket[] {
  const out: MonthBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const won = opps.filter(
      (o) => o.wonAt && new Date(o.wonAt) >= start && new Date(o.wonAt) < end,
    );
    out.push({
      label: `${start.getMonth() + 1}月`,
      count: won.length,
      sum: won.reduce((s, o) => s + o.amount, 0),
    });
  }
  return out;
}

export interface ReasonBucket {
  reason: string;
  count: number;
}

/** 输单原因分布(按次数降序,空原因归入「未填写」) */
export function lostReasons(opps: Opportunity[]): ReasonBucket[] {
  const map = new Map<string, number>();
  for (const o of opps) {
    if (o.stage !== 'lost') continue;
    const reason = (o.lostReason ?? '').trim() || '未填写';
    map.set(reason, (map.get(reason) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

export interface SourceBucket {
  source: string;
  total: number;
  wonCount: number;
  activeSum: number;
  winRate: number | null;
}

/** 来源分析(按商机数降序,空来源归入「未标来源」) */
export function sourceBreakdown(opps: Opportunity[]): SourceBucket[] {
  const map = new Map<string, Opportunity[]>();
  for (const o of opps) {
    const source = (o.source ?? '').trim() || '未标来源';
    map.set(source, [...(map.get(source) ?? []), o]);
  }
  return [...map.entries()]
    .map(([source, list]) => {
      const wonCount = list.filter((o) => o.stage === 'won').length;
      const lostCount = list.filter((o) => o.stage === 'lost').length;
      const decided = wonCount + lostCount;
      return {
        source,
        total: list.length,
        wonCount,
        activeSum: list.filter((o) => isActiveStage(o.stage)).reduce((s, o) => s + o.amount, 0),
        winRate: decided > 0 ? Math.round((wonCount / decided) * 100) : null,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export interface WeekBucket {
  label: string;
  count: number;
}

/** 近 N 周(周一起算,含本周)完成跟进数 */
export function weeklyDoneTrend(followUps: FollowUp[], weeks = 6, now = new Date()): WeekBucket[] {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const pad = (n: number) => String(n).padStart(2, '0');
  const out: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(monday);
    start.setDate(monday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    out.push({
      label: `${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      count: followUps.filter(
        (f) => f.doneAt && new Date(f.doneAt) >= start && new Date(f.doneAt) < end,
      ).length,
    });
  }
  return out;
}

export interface StageBucket {
  stage: Stage;
  count: number;
  sum: number;
  weighted: number;
}

/** 在途阶段快照(数量、金额、按赢率加权金额) */
export function stageSnapshot(opps: Opportunity[]): StageBucket[] {
  return PIPELINE_STAGES.map((stage) => {
    const list = opps.filter((o) => o.stage === stage);
    const sum = list.reduce((s, o) => s + o.amount, 0);
    return {
      stage,
      count: list.length,
      sum,
      weighted: Math.round(list.reduce((s, o) => s + (o.amount * o.winRate) / 100, 0)),
    };
  });
}
