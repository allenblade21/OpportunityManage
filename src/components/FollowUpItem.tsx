import { useStore } from '../store';
import type { FollowUp } from '../types';
import { fmtWhen, isOverdue, typeLabel } from '../utils';
import { Check, Icon, PriorityChip } from './ui';

/** 跟进条目:工作台 / 跟进项页 / 商机详情共用 */
export function FollowUpItem({ fu, showRelated = true }: { fu: FollowUp; showRelated?: boolean }) {
  const opportunities = useStore((s) => s.opportunities);
  const contacts = useStore((s) => s.contacts);
  const reopenFollowUp = useStore((s) => s.reopenFollowUp);
  const openModal = useStore((s) => s.openModal);
  const go = useStore((s) => s.go);

  const opp = fu.opportunityId ? opportunities.find((o) => o.id === fu.opportunityId) : undefined;
  const contact = fu.contactId ? contacts.find((c) => c.id === fu.contactId) : undefined;
  const done = fu.status === 'done';
  const late = isOverdue(fu);

  return (
    <div className={`fu${done ? ' done' : ''}${late ? ' late' : ''}`}>
      <Check
        done={done}
        onToggle={() =>
          done ? reopenFollowUp(fu.id) : openModal({ kind: 'complete-followup', followUpId: fu.id })
        }
      />
      <div className="fx">
        <div className="t">{fu.title}</div>
        <div className="meta">
          <span className="typ">{typeLabel[fu.type]}</span>
          {showRelated && opp && (
            <button className="metalink" onClick={() => go('detail', opp.id)}>
              {opp.company} · {opp.name}
            </button>
          )}
          {contact && <span> · {contact.name}</span>}
          {done && fu.result && <span className="fu-result">结果:{fu.result}</span>}
        </div>
      </div>
      <div className="end">
        <button
          className="fu-edit"
          aria-label="编辑跟进"
          title="编辑跟进"
          onClick={() => openModal({ kind: 'followup', editId: fu.id })}
        >
          <Icon name="edit" style={{ width: 13, height: 13 }} />
        </button>
        <PriorityChip p={fu.priority} />
        <span className="due num">{done && fu.doneAt ? `完成于 ${fmtWhen(fu.doneAt)}` : fmtWhen(fu.dueAt)}</span>
      </div>
    </div>
  );
}
