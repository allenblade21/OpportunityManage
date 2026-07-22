import { useState } from 'react';
import { useStore } from '../store';
import type { Opportunity, Priority, Stage } from '../types';
import {
  PRIORITIES, STAGES, fmtDate, fmtWan, fmtWhen, isOverdue, priorityMeta, stageMeta,
} from '../utils';
import { Avatar, Icon, PriorityChip, Seg, StageDot } from '../components/ui';

export function Opportunities() {
  const { opportunities, followUps, contacts, oppView, setOppView, openModal, go } = useStore();
  const [fStage, setFStage] = useState<'all' | Stage>('all');
  const [fPri, setFPri] = useState<'all' | Priority>('all');

  const filtered = opportunities.filter(
    (o) =>
      (fStage === 'all' ? o.stage !== 'lost' : o.stage === fStage) &&
      (fPri === 'all' || o.priority === fPri),
  );

  const activeSum = opportunities
    .filter((o) => o.stage !== 'won' && o.stage !== 'lost')
    .reduce((s, o) => s + o.amount, 0);

  const nextFuOf = (oppId: string) => {
    const list = followUps.filter((f) => f.status === 'open' && f.opportunityId === oppId);
    if (list.length === 0) return null;
    return list.reduce((min, f) => (f.dueAt < min.dueAt ? f : min));
  };

  const primaryContact = (o: Opportunity) =>
    contacts.find((c) => c.id === o.primaryContactId);

  const renderNext = (o: Opportunity) => {
    if (o.stage === 'won') {
      return <span className="chip c-ok">已赢单{o.wonAt ? ` · ${fmtDate(o.wonAt)}` : ''}</span>;
    }
    const next = nextFuOf(o.id);
    if (!next) {
      return (
        <span className="nx none">
          <Icon name="clock" style={{ width: 12, height: 12 }} />无跟进
        </span>
      );
    }
    return (
      <span className={`nx${isOverdue(next) ? ' late' : ''}`}>
        <Icon name="clock" style={{ width: 12, height: 12 }} />
        {isOverdue(next) ? '已逾期' : <span className="num">{fmtWhen(next.dueAt)}</span>}
      </span>
    );
  };

  return (
    <section className="page visible">
      <div className="phead">
        <h1>商机</h1>
        <span className="sub">
          {opportunities.length} 个 · 在途 <span className="num">{fmtWan(activeSum)}</span>
        </span>
        <span className="spacer" />
        <Seg
          options={[
            { key: 'board' as const, label: '看板' },
            { key: 'list' as const, label: '列表' },
          ]}
          value={oppView}
          onChange={setOppView}
        />
        <select className="sel" value={fStage} onChange={(e) => setFStage(e.target.value as 'all' | Stage)}>
          <option value="all">全部阶段</option>
          {[...STAGES, 'lost' as Stage].map((s) => (
            <option key={s} value={s}>{stageMeta[s].label}</option>
          ))}
        </select>
        <select className="sel" value={fPri} onChange={(e) => setFPri(e.target.value as 'all' | Priority)}>
          <option value="all">全部优先级</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{priorityMeta[p].full}</option>
          ))}
        </select>
        <button className="btn btn-pri" onClick={() => openModal({ kind: 'opp' })}>
          <Icon name="plus" />新建商机
        </button>
      </div>

      {oppView === 'board' ? (
        <>
          <div className="board">
            {STAGES.map((stage) => {
              const cards = filtered
                .filter((o) => o.stage === stage)
                .sort((a, b) => priorityMeta[a.priority].order - priorityMeta[b.priority].order);
              const sum = cards.reduce((s, o) => s + o.amount, 0);
              return (
                <div className="col" key={stage}>
                  <div className="col-h">
                    <span className={`dot bg-${stageMeta[stage].color}`} />
                    {stageMeta[stage].label}
                    <span className="n">{cards.length}</span>
                    <span className="sum num">{fmtWan(sum)}</span>
                  </div>
                  {cards.map((o) => {
                    const pc = primaryContact(o);
                    return (
                      <div className="kcard" key={o.id} onClick={() => go('detail', o.id)}>
                        <div className="co">{o.company}</div>
                        <div className="ti">{o.name}</div>
                        <div className="amt num">
                          {fmtWan(o.amount)}
                          {o.stage !== 'won' && <span className="wr"> · 赢率 {o.winRate}%</span>}
                        </div>
                        <div className="ft">
                          {o.stage === 'won' ? (
                            <span className="chip c-ok">已赢单{o.wonAt ? ` · ${fmtDate(o.wonAt)}` : ''}</span>
                          ) : (
                            <PriorityChip p={o.priority} />
                          )}
                          {o.stage !== 'won' && renderNext(o)}
                          {pc && <Avatar name={pc.name} title={pc.name} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="board-hint">点击卡片进入详情,在详情页可推进阶段(拖拽变更阶段规划于下一迭代)</div>
        </>
      ) : (
        <div className="panel">
          <div className="twrap">
            <table>
              <thead>
                <tr>
                  <th>商机</th><th>客户</th><th>阶段</th><th>优先级</th><th>金额</th>
                  <th>赢率</th><th>下次跟进</th><th>预计成交</th><th>主要联系人</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice()
                  .sort((a, b) => priorityMeta[a.priority].order - priorityMeta[b.priority].order || b.amount - a.amount)
                  .map((o) => (
                    <tr key={o.id} onClick={() => go('detail', o.id)}>
                      <td className="b">{o.name}</td>
                      <td>{o.company}</td>
                      <td><StageDot stage={o.stage} /></td>
                      <td>
                        {o.stage === 'won' ? (
                          <span className="chip c-ok">已成交</span>
                        ) : o.stage === 'lost' ? (
                          <span className="chip p0">输单</span>
                        ) : (
                          <PriorityChip p={o.priority} full />
                        )}
                      </td>
                      <td className="num b">{fmtWan(o.amount)}</td>
                      <td className="num">{o.winRate}%</td>
                      <td>{renderNext(o)}</td>
                      <td className="num">{o.expectedClose ? fmtDate(o.expectedClose) : '—'}</td>
                      <td>{primaryContact(o)?.name ?? '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
