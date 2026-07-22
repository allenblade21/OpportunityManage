import { useStore } from '../store';
import {
  PIPELINE_STAGES, WEEKDAYS, fmtWan, fmtWhen, groupFollowUps, isActiveStage, isOverdue,
  priorityMeta, quarterStart, sortFollowUps, stageMeta,
} from '../utils';
import { FollowUpItem } from '../components/FollowUpItem';
import { Empty, Panel, PriorityChip, StageDot } from '../components/ui';

export function Dashboard() {
  const { opportunities, followUps, activities, go, openModal } = useStore();

  const active = opportunities.filter((o) => isActiveStage(o.stage));
  const pipelineSum = active.reduce((s, o) => s + o.amount, 0);
  const weightedSum = active.reduce((s, o) => s + (o.amount * o.winRate) / 100, 0);

  const groups = groupFollowUps(followUps);
  const weekDue = groups.overdue.length + groups.today.length + groups.week.length;
  const todayList = sortFollowUps([...groups.overdue, ...groups.today]);

  const qs = quarterStart();
  const wonQ = opportunities.filter((o) => o.wonAt && new Date(o.wonAt) >= qs);
  const lostQ = opportunities.filter((o) => o.lostAt && new Date(o.lostAt) >= qs);
  const decided = wonQ.length + lostQ.length;
  const winRate = decided > 0 ? Math.round((wonQ.length / decided) * 100) : null;
  const wonSum = wonQ.reduce((s, o) => s + o.amount, 0);

  const noNext = active.filter((o) => !followUps.some((f) => f.status === 'open' && f.opportunityId === o.id));

  const hiPriority = active
    .filter((o) => o.priority === 'P0' || o.priority === 'P1')
    .sort(
      (a, b) =>
        priorityMeta[a.priority].order - priorityMeta[b.priority].order || b.amount - a.amount,
    )
    .slice(0, 4);

  const recent = [...activities].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  const funnel = PIPELINE_STAGES.map((stage) => {
    const list = active.filter((o) => o.stage === stage);
    return { stage, count: list.length, sum: list.reduce((s, o) => s + o.amount, 0) };
  });
  const funnelMax = Math.max(...funnel.map((f) => f.sum), 1);

  const nextFuOf = (oppId: string) => {
    const list = followUps.filter((f) => f.status === 'open' && f.opportunityId === oppId);
    if (list.length === 0) return null;
    return list.reduce((min, f) => (f.dueAt < min.dueAt ? f : min));
  };

  const d = new Date();

  return (
    <section className="page visible">
      <div className="phead">
        <h1>工作台</h1>
        <span className="sub">
          {d.getMonth() + 1} 月 {d.getDate()} 日 周{WEEKDAYS[d.getDay()]} · 今天有{' '}
          {groups.today.length} 条跟进待处理
          {groups.overdue.length > 0 && `,${groups.overdue.length} 条已逾期`}
        </span>
      </div>

      {noNext.length > 0 && (
        <div className="warnbar">
          <span>
            ⚠ {noNext.length} 个进行中商机没有「下一步跟进」:
            {noNext.slice(0, 3).map((o) => o.company).join('、')}
            {noNext.length > 3 && ' 等'}
          </span>
          <button
            className="lnk"
            onClick={() => openModal({ kind: 'followup', opportunityId: noNext[0].id })}
          >
            立即补建 →
          </button>
        </div>
      )}

      <div className="kpis">
        <div className="kpi">
          <div className="k">进行中商机</div>
          <div className="v num">{active.length}</div>
          <div className="d">全部 {opportunities.length} 个商机</div>
        </div>
        <div className="kpi">
          <div className="k">在途总金额</div>
          <div className="v num">{fmtWan(pipelineSum)}</div>
          <div className="d">按赢率加权 <span className="num">{fmtWan(Math.round(weightedSum))}</span></div>
        </div>
        <div className="kpi">
          <div className="k">本周待跟进</div>
          <div className="v num">{weekDue}</div>
          <div className="d">
            {groups.overdue.length > 0 ? (
              <span className="bad">{groups.overdue.length} 条已逾期</span>
            ) : (
              <span className="good">无逾期</span>
            )}
          </div>
        </div>
        <div className="kpi">
          <div className="k">本季赢单率</div>
          <div className="v num">{winRate === null ? '—' : `${winRate}%`}</div>
          <div className="d">已赢 {wonQ.length} 单 · <span className="num">{fmtWan(wonSum)}</span></div>
        </div>
      </div>

      <div className="grid2">
        <Panel
          title="商机漏斗"
          count="按阶段 · 金额"
          extra={<button className="lnk" onClick={() => go('opps')}>进入商机看板</button>}
        >
          {funnel.map((f) => (
            <div className="fr" key={f.stage}>
              <span className="fl">{stageMeta[f.stage].label}</span>
              <div>
                <div
                  className={`bar bg-${stageMeta[f.stage].color}`}
                  style={{ width: `${Math.max((f.sum / funnelMax) * 100, f.count > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="fv">
                {f.count} 单 · <span className="num">{fmtWan(f.sum)}</span>
              </span>
            </div>
          ))}
          <div className="funnel-note">色带由浅至深 = 离成交越近</div>
        </Panel>

        <Panel
          title="今日跟进"
          count={`${todayList.length} 项${groups.overdue.length > 0 ? ` · ${groups.overdue.length} 逾期` : ''}`}
          extra={<button className="lnk" onClick={() => go('followups')}>全部跟进</button>}
        >
          {todayList.length === 0 ? (
            <Empty
              text="今天没有待办跟进"
              action={
                <button className="btn btn-sm" onClick={() => openModal({ kind: 'followup' })}>
                  + 新建跟进
                </button>
              }
            />
          ) : (
            todayList.map((fu) => <FollowUpItem key={fu.id} fu={fu} />)
          )}
        </Panel>
      </div>

      <div className="grid2b">
        <Panel
          title="高优先级商机"
          count="P0 / P1"
          extra={<button className="lnk" onClick={() => go('opps')}>全部商机</button>}
        >
          {hiPriority.length === 0 ? (
            <Empty text="暂无 P0 / P1 商机" />
          ) : (
            hiPriority.map((o) => {
              const next = nextFuOf(o.id);
              return (
                <div className="orow" key={o.id} onClick={() => go('detail', o.id)}>
                  <StageDot stage={o.stage} withLabel={false} />
                  <div className="ox">
                    <div className="t">{o.company} · {o.name}</div>
                    <div className="meta">
                      {stageMeta[o.stage].label} ·{' '}
                      {next ? (
                        isOverdue(next) ? (
                          <span style={{ color: 'var(--danger)' }}>跟进已逾期</span>
                        ) : (
                          `下次跟进:${fmtWhen(next.dueAt)}`
                        )
                      ) : (
                        <span style={{ color: 'var(--warn)' }}>无下一步跟进</span>
                      )}
                    </div>
                  </div>
                  <div className="end">
                    <div className="amt num">{fmtWan(o.amount)}</div>
                    <div className="wr">
                      赢率 {o.winRate}% · <PriorityChip p={o.priority} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </Panel>

        <Panel title="最近动态">
          <div className="tl">
            {recent.map((a) => (
              <div className={`tli${a.kind === 'stage' || a.kind === 'won' ? ' b' : ''}`} key={a.id}>
                <div className="tt">{a.text}</div>
                <div className="tm num">{fmtWhen(a.at)}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
