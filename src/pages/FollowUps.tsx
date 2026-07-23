import { useState } from 'react';
import { useStore } from '../store';
import { groupFollowUps } from '../utils';
import { CalendarView } from '../components/Calendar';
import { FollowUpItem } from '../components/FollowUpItem';
import { Empty, Icon, Panel, Seg } from '../components/ui';

export function FollowUps() {
  const { followUps, openModal } = useStore();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const groups = groupFollowUps(followUps);
  const openCount = groups.overdue.length + groups.today.length + groups.week.length + groups.later.length;

  const sections: {
    key: string; title: string; list: typeof groups.overdue; headClass?: string;
  }[] = [
    { key: 'overdue', title: '已逾期', list: groups.overdue, headClass: 'late-h' },
    { key: 'today', title: '今天', list: groups.today },
    { key: 'week', title: '本周', list: groups.week },
    { key: 'later', title: '以后', list: groups.later },
  ];

  return (
    <section className="page visible">
      <div className="phead">
        <h1>跟进项</h1>
        <span className="sub">
          {openCount} 条待办
          {groups.overdue.length > 0 && ` · ${groups.overdue.length} 条已逾期`}
        </span>
        <span className="spacer" />
        <Seg
          options={[
            { key: 'list' as const, label: '列表' },
            { key: 'calendar' as const, label: '日历' },
          ]}
          value={view}
          onChange={setView}
        />
        <button className="btn btn-pri" onClick={() => openModal({ kind: 'followup' })}>
          <Icon name="plus" />新建跟进
        </button>
      </div>

      {view === 'calendar' && <CalendarView />}

      {view === 'list' && openCount === 0 && groups.doneToday.length === 0 && (
        <div className="panel">
          <div className="panel-b">
            <Empty
              text="没有待办跟进 — 为进行中的商机安排下一步吧"
              action={
                <button className="btn btn-sm" onClick={() => openModal({ kind: 'followup' })}>
                  + 新建跟进
                </button>
              }
            />
          </div>
        </div>
      )}

      {view === 'list' &&
        sections.map(
          (sec) =>
            sec.list.length > 0 && (
              <div className="fgroup" key={sec.key}>
                <Panel title={sec.title} count={sec.list.length} headClass={sec.headClass}>
                  {sec.list.map((fu) => (
                    <FollowUpItem key={fu.id} fu={fu} />
                  ))}
                </Panel>
              </div>
            ),
        )}

      {view === 'list' && groups.doneToday.length > 0 && (
        <div className="fgroup">
          <Panel title="今日已完成" count={groups.doneToday.length}>
            {groups.doneToday.map((fu) => (
              <FollowUpItem key={fu.id} fu={fu} />
            ))}
          </Panel>
        </div>
      )}
    </section>
  );
}
