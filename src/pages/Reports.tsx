import { useMemo, useState } from 'react';
import {
  PERIOD_LABEL, computeOverview, lostReasons, monthlyWonTrend, sourceBreakdown,
  stageSnapshot, weeklyDoneTrend, type Period,
} from '../lib/stats';
import { useStore } from '../store';
import { fmtMoney, fmtWan, stageMeta } from '../utils';
import { Empty, Panel, Seg } from '../components/ui';

/** 柱状图:单序列、细柱、4px 圆角端、悬停提示(标题即序列名,无需图例) */
function Columns({
  data, colorClass,
}: {
  data: { label: string; value: number; title: string }[];
  colorClass: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div className="colchart">
        {data.map((d) => (
          <div className="colbar" key={d.label} title={d.title}>
            <span className="cv num">{d.value}</span>
            <div
              className={`cb ${d.value === 0 ? 'zero' : colorClass}`}
              style={{ height: `${Math.max(Math.round((d.value / max) * 108), 2)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="collabels">
        {data.map((d) => (
          <span key={d.label} className="num">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export function Reports() {
  const { opportunities, followUps } = useStore();
  const [period, setPeriod] = useState<Period>('quarter');

  const overview = useMemo(
    () => computeOverview(opportunities, period),
    [opportunities, period],
  );
  const trend = useMemo(() => monthlyWonTrend(opportunities), [opportunities]);
  const reasons = useMemo(() => lostReasons(opportunities), [opportunities]);
  const sources = useMemo(() => sourceBreakdown(opportunities), [opportunities]);
  const weekly = useMemo(() => weeklyDoneTrend(followUps), [followUps]);
  const stages = useMemo(() => stageSnapshot(opportunities), [opportunities]);
  const stageMax = Math.max(...stages.map((s) => s.sum), 1);
  const reasonMax = Math.max(...reasons.map((r) => r.count), 1);

  const dash = (v: number | null, suffix = '') => (v === null ? '—' : `${v}${suffix}`);

  return (
    <section className="page visible">
      <div className="phead">
        <h1>统计</h1>
        <span className="sub">按 {PERIOD_LABEL[period]} 汇总,趋势图固定展示近期区间</span>
        <span className="spacer" />
        <Seg
          options={(['month', 'quarter', 'year', 'all'] as Period[]).map((p) => ({
            key: p,
            label: PERIOD_LABEL[p],
          }))}
          value={period}
          onChange={setPeriod}
        />
      </div>

      <div className="kpis6">
        <div className="kpi"><div className="k">新增商机</div><div className="v num">{overview.created}</div><div className="d">{PERIOD_LABEL[period]}创建</div></div>
        <div className="kpi"><div className="k">赢单</div><div className="v num">{overview.wonCount}</div><div className="d num">{fmtWan(overview.wonSum)}</div></div>
        <div className="kpi"><div className="k">输单</div><div className="v num">{overview.lostCount}</div><div className="d">已填原因见下方分布</div></div>
        <div className="kpi"><div className="k">赢单率</div><div className="v num">{dash(overview.winRate, '%')}</div><div className="d">按已定输赢计算</div></div>
        <div className="kpi"><div className="k">平均成交周期</div><div className="v num">{dash(overview.avgCycleDays, ' 天')}</div><div className="d">创建 → 赢单</div></div>
        <div className="kpi"><div className="k">平均客单价</div><div className="v num">{overview.avgDeal === null ? '—' : fmtWan(overview.avgDeal)}</div><div className="d">赢单金额 / 单数</div></div>
      </div>

      <div className="grid2">
        <Panel title="月度赢单趋势" count="近 6 个月 · 单数">
          <Columns
            colorClass="bg-s5"
            data={trend.map((t) => ({
              label: t.label,
              value: t.count,
              title: `${t.label}:${t.count} 单 · ${fmtWan(t.sum)}`,
            }))}
          />
          <div className="funnel-note">
            近 6 个月合计 {trend.reduce((s, t) => s + t.count, 0)} 单 ·{' '}
            <span className="num">{fmtWan(trend.reduce((s, t) => s + t.sum, 0))}</span>
          </div>
        </Panel>

        <Panel title="在途阶段快照" count="数量 · 金额 · 加权">
          {stages.map((s) => (
            <div className="fr" key={s.stage}>
              <span className="fl">{stageMeta[s.stage].label}</span>
              <div>
                <div
                  className={`bar bg-${stageMeta[s.stage].color}`}
                  style={{ width: `${Math.max((s.sum / stageMax) * 100, s.count > 0 ? 4 : 0)}%` }}
                  title={`${stageMeta[s.stage].label}:${s.count} 单 · ${fmtWan(s.sum)} · 加权 ${fmtWan(s.weighted)}`}
                />
              </div>
              <span className="fv">
                {s.count} 单 · <span className="num">{fmtWan(s.sum)}</span>
              </span>
            </div>
          ))}
          <div className="funnel-note">
            加权在途合计 <span className="num">{fmtWan(stages.reduce((t, s) => t + s.weighted, 0))}</span>(金额 × 赢率)
          </div>
        </Panel>
      </div>

      <div className="grid2b" style={{ marginBottom: 14 }}>
        <Panel title="输单原因分布" count={`${reasons.reduce((s, r) => s + r.count, 0)} 次`}>
          {reasons.length === 0 ? (
            <Empty text="暂无输单记录 — 继续保持" />
          ) : (
            reasons.map((r) => (
              <div className="fr fr-wide" key={r.reason}>
                <span className="fl" title={r.reason}>{r.reason}</span>
                <div>
                  <div
                    className="bar bg-muted"
                    style={{ width: `${(r.count / reasonMax) * 100}%` }}
                    title={`${r.reason}:${r.count} 次`}
                  />
                </div>
                <span className="fv num">{r.count} 次</span>
              </div>
            ))
          )}
        </Panel>

        <Panel title="来源分析" count="全部商机">
          <div className="twrap">
            <table className="rtable">
              <thead>
                <tr><th>来源</th><th>商机数</th><th>赢单</th><th>在途金额</th><th>赢单率</th></tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.source} style={{ cursor: 'default' }}>
                    <td className="b">{s.source}</td>
                    <td className="num">{s.total}</td>
                    <td className="num">{s.wonCount}</td>
                    <td className="num">{fmtWan(s.activeSum)}</td>
                    <td className="num">{s.winRate === null ? '—' : `${s.winRate}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="跟进活跃度" count="近 6 周完成跟进数(周一起算)">
        <Columns
          colorClass="bg-s3"
          data={weekly.map((w) => ({
            label: w.label,
            value: w.count,
            title: `${w.label} 当周:完成 ${w.count} 条跟进`,
          }))}
        />
        {overview.avgDeal !== null && (
          <div className="funnel-note">
            提示:平均客单价 <span className="num">{fmtMoney(overview.avgDeal)}</span>,可用于评估单个跟进动作的期望价值
          </div>
        )}
      </Panel>
    </section>
  );
}
