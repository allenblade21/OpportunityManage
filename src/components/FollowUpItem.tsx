import { useStore } from '../store';
import type { FollowUp } from '../types';
import { fmtWhen, isOverdue, typeLabel } from '../utils';
import { Check, PriorityChip } from './ui';

/** 跟进条目:工作台 / 跟进项页 / 商机详情共用 */
export function FollowUpItem({ fu, showRelated = true }: { fu: FollowUp; showRelated?: boolean }) {
  const opportunities = useStore((s) => s.opportunities);
  const contacts = useStore((s) => s.contacts);
  const completeFollowUp = useStore((s) => s.completeFollowUp);
  const reopenFollowUp = useStore((s) => s.reopenFollowUp);
  const go = useStore((s) => s.go);

  const opp = fu.opportunityId ? opportunities.find((o) => o.id === fu.opportunityId) : undefined;
  const contact = fu.contactId ? contacts.find((c) => c.id === fu.contactId) : undefined;
  const done = fu.status === 'done';
  const late = isOverdue(fu);

  return (
    <div className={`fu${done ? ' done' : ''}${late ? ' late' : ''}`}>
      <Check done={done} onToggle={() => (done ? reopenFollowUp(fu.id) : completeFollowUp(fu.id))} />
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
        </div>
      </div>
      <div className="end">
        <PriorityChip p={fu.priority} />
        <span className="due num">{done && fu.doneAt ? `完成于 ${fmtWhen(fu.doneAt)}` : fmtWhen(fu.dueAt)}</span>
      </div>
    </div>
  );
}
