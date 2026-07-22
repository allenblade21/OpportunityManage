import { useState } from 'react';
import { useStore } from '../store';
import type { Idea, IdeaStatus } from '../types';
import { fmtWhen, priorityMeta } from '../utils';
import { PriorityChip } from '../components/ui';

const statusChip: Record<IdeaStatus, { label: string; cls: string }> = {
  pending: { label: '待评估', cls: 'c-warn' },
  adopted: { label: '已采纳', cls: 'c-ok' },
  shelved: { label: '已搁置', cls: 'c-hold' },
};

const statusOrder: Record<IdeaStatus, number> = { pending: 0, adopted: 1, shelved: 2 };

export function Ideas() {
  const {
    ideas, opportunities, addIdea, convertIdeaToFollowUp, setIdeaStatus, openModal, go,
  } = useStore();
  const [quick, setQuick] = useState('');

  const pendingCount = ideas.filter((i) => i.status === 'pending').length;
  const sorted = [...ideas].sort(
    (a, b) =>
      statusOrder[a.status] - statusOrder[b.status] ||
      priorityMeta[a.priority].order - priorityMeta[b.priority].order ||
      b.createdAt.localeCompare(a.createdAt),
  );

  const saveQuick = () => {
    if (!quick.trim()) return;
    addIdea({ title: quick.trim() });
    setQuick('');
  };

  const relatedText = (idea: Idea) => {
    if (!idea.opportunityId) return '独立想法(未关联商机)';
    const opp = opportunities.find((o) => o.id === idea.opportunityId);
    return opp ? `关联:${opp.company} · ${opp.name}` : '独立想法';
  };

  return (
    <section className="page visible">
      <div className="phead">
        <h1>想法</h1>
        <span className="sub">
          {ideas.length} 条
          {pendingCount > 0 && ` · ${pendingCount} 条待评估,建议每周回顾一次`}
        </span>
        <span className="spacer" />
        <button className="btn" onClick={() => openModal({ kind: 'idea' })}>详细记录</button>
      </div>

      <div className="quick">
        <input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveQuick()}
          placeholder="随手记一个想法…(回车即存,默认进入「待评估」)"
        />
        <button className="btn btn-pri" onClick={saveQuick}>记下来</button>
      </div>

      <div className="iwrap">
        {sorted.map((idea) => {
          const st = statusChip[idea.status];
          return (
            <div className="icard" key={idea.id}>
              <div className="ih">
                <span className={`chip ${st.cls}`}>{st.label}</span>
                <PriorityChip p={idea.priority} />
              </div>
              <h3>{idea.title}</h3>
              {idea.content && <p>{idea.content}</p>}
              <div className="im">
                {idea.opportunityId ? (
                  <button className="metalink" onClick={() => go('detail', idea.opportunityId)}>
                    {relatedText(idea)}
                  </button>
                ) : (
                  <span>{relatedText(idea)}</span>
                )}
                <span className="num">{fmtWhen(idea.createdAt, false)}</span>
              </div>
              <div className="ia">
                {idea.status === 'pending' && (
                  <>
                    <button className="lnk" onClick={() => convertIdeaToFollowUp(idea.id)}>转为跟进项</button>
                    <button
                      className="lnk"
                      onClick={() =>
                        openModal({
                          kind: 'opp',
                          presetName: idea.title,
                          presetNotes: idea.content,
                          fromIdeaId: idea.id,
                        })
                      }
                    >
                      升级为商机
                    </button>
                    <button className="lnk lnk-mute" onClick={() => setIdeaStatus(idea.id, 'shelved')}>搁置</button>
                  </>
                )}
                {idea.status === 'adopted' && (
                  <button className="lnk" onClick={() => go(idea.convertedOpportunityId ? 'detail' : 'followups', idea.convertedOpportunityId ?? undefined)}>
                    查看转化结果 →
                  </button>
                )}
                {idea.status === 'shelved' && (
                  <button className="lnk" onClick={() => setIdeaStatus(idea.id, 'pending')}>重新激活</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
