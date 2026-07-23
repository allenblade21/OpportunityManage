import { useStore } from '../store';
import type { Stage } from '../types';
import {
  STAGES, fmtFullDate, fmtMoney, fmtWhen, roleMeta, sortFollowUps, stageMeta,
} from '../utils';
import { FollowUpItem } from '../components/FollowUpItem';
import { Avatar, Empty, Icon, Panel, PriorityChip } from '../components/ui';
import { PRIORITIES, priorityMeta } from '../utils';

export function OpportunityDetail() {
  const {
    opportunities, contacts, followUps, ideas, activities,
    selectedOppId, go, openModal, setStage, markLost, setOppPriority, convertIdeaToFollowUp, toast,
  } = useStore();

  const opp = opportunities.find((o) => o.id === selectedOppId);

  if (!opp) {
    return (
      <section className="page visible">
        <button className="back" onClick={() => go('opps')}>
          <Icon name="back" />返回商机列表
        </button>
        <Empty text="未找到该商机" />
      </section>
    );
  }

  const openFus = sortFollowUps(followUps.filter((f) => f.opportunityId === opp.id && f.status === 'open'));
  const acts = activities
    .filter((a) => a.opportunityId === opp.id)
    .sort((a, b) => b.at.localeCompare(a.at));
  const oppContacts = contacts.filter((c) => opp.contactIds.includes(c.id));
  const oppIdeas = ideas.filter((i) => i.opportunityId === opp.id);
  const curIdx = STAGES.indexOf(opp.stage);
  const isEnded = opp.stage === 'won' || opp.stage === 'lost';

  const onStageClick = (stage: Stage) => {
    if (opp.stage === 'lost') return;
    if (stage === opp.stage) return;
    if (stage === 'won' && !window.confirm(`确认将「${opp.name}」标记为赢单?`)) return;
    setStage(opp.id, stage);
  };

  const onMarkLost = () => {
    const reason = window.prompt('填写输单原因(必填,将写入时间线):');
    if (reason === null) return;
    if (!reason.trim()) {
      toast('输单原因不能为空');
      return;
    }
    markLost(opp.id, reason.trim());
  };

  return (
    <section className="page visible">
      <button className="back" onClick={() => go('opps')}>
        <Icon name="back" />返回商机列表
      </button>

      {opp.stage === 'lost' && (
        <div className="lost-banner">已输单 — 原因:{opp.lostReason ?? '未填写'}</div>
      )}
      {opp.stage === 'won' && (
        <div className="won-banner">
          已赢单{opp.wonAt ? ` · ${fmtFullDate(opp.wonAt)}` : ''} · 金额 {fmtMoney(opp.amount)}
        </div>
      )}

      <div className="panel dhead">
        <div className="dtop">
          <div>
            <div className="co">
              {opp.company}
              {opp.source ? ` · 来源:${opp.source}` : ''}
            </div>
            <h1>{opp.name}</h1>
            <div className="chips">
              {isEnded ? (
                <PriorityChip p={opp.priority} full />
              ) : (
                <select
                  className="sel"
                  value={opp.priority}
                  onChange={(e) => setOppPriority(opp.id, e.target.value as (typeof PRIORITIES)[number])}
                  aria-label="调整优先级"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{priorityMeta[p].full}</option>
                  ))}
                </select>
              )}
              {opp.tags.map((t) => (
                <span className="tag" key={t}>{t}</span>
              ))}
            </div>
          </div>
          <div className="dact">
            {!isEnded && (
              <>
                <button
                  className="btn btn-pri btn-sm"
                  onClick={() => openModal({ kind: 'followup', opportunityId: opp.id, contactId: opp.primaryContactId })}
                >
                  <Icon name="plus" />新建跟进
                </button>
                <button className="btn btn-sm" onClick={onMarkLost}>标记输单</button>
              </>
            )}
            <button className="btn btn-sm" onClick={() => openModal({ kind: 'opp', editId: opp.id })}>编辑</button>
          </div>
        </div>

        {opp.stage !== 'lost' && (
          <div className="stepper">
            {STAGES.map((s, i) => (
              <div
                key={s}
                className={`step${i < curIdx ? ' done' : ''}${i === curIdx ? ' cur' : ''}`}
                onClick={() => onStageClick(s)}
                role="button"
                title={opp.stage === 'won' ? undefined : `推进到「${stageMeta[s].label}」`}
              >
                <span className="sd" />
                {stageMeta[s].label}
              </div>
            ))}
          </div>
        )}

        <div className="facts">
          <div className="fact"><div className="fk">预计金额</div><div className="fv num">{fmtMoney(opp.amount)}</div></div>
          <div className="fact"><div className="fk">赢率</div><div className="fv num">{opp.winRate}%</div></div>
          <div className="fact"><div className="fk">预计成交</div><div className="fv num">{opp.expectedClose ? fmtFullDate(opp.expectedClose) : '—'}</div></div>
          <div className="fact"><div className="fk">负责人</div><div className="fv">{opp.owner}</div></div>
          <div className="fact"><div className="fk">创建时间</div><div className="fv num">{fmtFullDate(opp.createdAt)}</div></div>
          <div className="fact"><div className="fk">最近活动</div><div className="fv num">{acts[0] ? fmtWhen(acts[0].at) : '—'}</div></div>
        </div>
      </div>

      <div className="dgrid">
        <div className="dcol">
          <Panel
            title="待办跟进"
            count={openFus.length}
            extra={
              !isEnded && (
                <button
                  className="lnk"
                  onClick={() => openModal({ kind: 'followup', opportunityId: opp.id, contactId: opp.primaryContactId })}
                >
                  + 添加跟进
                </button>
              )
            }
          >
            {openFus.length === 0 ? (
              <Empty
                text={isEnded ? '商机已结束,无待办跟进' : '没有下一步跟进 — 别让商机晾着'}
                action={
                  !isEnded && (
                    <button
                      className="btn btn-sm"
                      onClick={() => openModal({ kind: 'followup', opportunityId: opp.id, contactId: opp.primaryContactId })}
                    >
                      + 创建下一步
                    </button>
                  )
                }
              />
            ) : (
              openFus.map((fu) => <FollowUpItem key={fu.id} fu={fu} showRelated={false} />)
            )}
          </Panel>

          <Panel title="跟进时间线">
            {acts.length === 0 ? (
              <Empty text="暂无动态" />
            ) : (
              <div className="tl">
                {acts.map((a) => (
                  <div
                    className={`tli${a.kind === 'stage' || a.kind === 'won' || a.kind === 'lost' || a.kind === 'create' ? ' b' : ''}`}
                    key={a.id}
                  >
                    <div className="tt">{a.text}</div>
                    <div className="tm num">{fmtWhen(a.at)}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="dcol">
          <Panel
            title="联系人"
            count={oppContacts.length}
            extra={
              <button className="lnk" onClick={() => openModal({ kind: 'contact', opportunityId: opp.id })}>
                + 添加
              </button>
            }
          >
            {oppContacts.length === 0 ? (
              <Empty text="尚未关联联系人" />
            ) : (
              oppContacts.map((c) => (
                <div className="ccard" key={c.id}>
                  <Avatar name={c.name} lg />
                  <div className="cx">
                    <div className="cn">
                      {c.name}
                      {c.id === opp.primaryContactId && <span className="chip c-brand">主要联系人</span>}
                      <span className={`chip ${roleMeta[c.role].cls}`}>{roleMeta[c.role].label}</span>
                    </div>
                    {c.title && <div className="ct">{c.title}</div>}
                    <div className="cc">
                      {c.phone && (
                        <span><Icon name="phone" style={{ width: 12, height: 12 }} /><span className="num">{c.phone}</span></span>
                      )}
                      {c.lastContactAt && (
                        <span><Icon name="clock" style={{ width: 12, height: 12 }} />最近联系:{fmtWhen(c.lastContactAt, false)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </Panel>

          <Panel title="关联想法" count={oppIdeas.length}>
            {oppIdeas.length === 0 ? (
              <Empty text="暂无关联想法" />
            ) : (
              oppIdeas.map((i) => (
                <div className="mini-idea" key={i.id}>
                  <div className="ih">
                    {i.status === 'pending' && <span className="chip c-warn">待评估</span>}
                    {i.status === 'adopted' && <span className="chip c-ok">已采纳</span>}
                    {i.status === 'shelved' && <span className="chip c-hold">已搁置</span>}
                    <PriorityChip p={i.priority} />
                  </div>
                  <div className="mi-t">{i.title}</div>
                  {i.content && <p>{i.content}</p>}
                  {i.status === 'pending' && (
                    <button className="lnk" onClick={() => convertIdeaToFollowUp(i.id)}>转为跟进项 →</button>
                  )}
                </div>
              ))
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}
