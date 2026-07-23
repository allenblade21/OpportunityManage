import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { FollowUp } from '../types';
import { buildCalendarDays, isOverdue, priorityMeta, sortFollowUps, typeLabel, ymd } from '../utils';
import { Icon } from './ui';

/** 跟进项月历视图:按截止日展示,点击条目编辑,悬停日格可快建当日跟进 */
export function CalendarView() {
  const { followUps, openModal } = useStore();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const days = useMemo(() => buildCalendarDays(month), [month]);
  const todayKey = ymd(new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, FollowUp[]>();
    for (const f of followUps) {
      if (f.status === 'canceled') continue;
      const key = ymd(new Date(f.dueAt));
      map.set(key, [...(map.get(key) ?? []), f]);
    }
    for (const [k, list] of map) map.set(k, sortFollowUps(list));
    return map;
  }, [followUps]);

  const shift = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const MAX_CHIPS = 3;

  return (
    <div className="panel cal">
      <div className="cal-head">
        <button className="btn btn-sm" onClick={() => shift(-1)} aria-label="上一月">
          <Icon name="back" style={{ width: 13, height: 13 }} />
        </button>
        <span className="cal-title num">
          {month.getFullYear()} 年 {month.getMonth() + 1} 月
        </span>
        <button className="btn btn-sm cal-next" onClick={() => shift(1)} aria-label="下一月">
          <Icon name="back" style={{ width: 13, height: 13 }} />
        </button>
        <button
          className="btn btn-sm"
          onClick={() => {
            const d = new Date();
            setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
          }}
        >
          今天
        </button>
        <span className="cal-legend">
          点击条目编辑 · 悬停日格「+」新建当日跟进 · 左侧红条 = 已逾期
        </span>
      </div>
      <div className="cal-scroll">
        <div className="cal-grid">
          {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
            <div className="cal-dow" key={w}>周{w}</div>
          ))}
          {days.map((d) => {
            const key = ymd(d);
            const list = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            const out = d.getMonth() !== month.getMonth();
            return (
              <div className={`cal-cell${out ? ' out' : ''}${isToday ? ' today' : ''}`} key={key}>
                <button
                  className="cal-add"
                  aria-label={`在 ${key} 新建跟进`}
                  title="新建当日跟进"
                  onClick={() => openModal({ kind: 'followup', presetDate: key })}
                >
                  <Icon name="plus" style={{ width: 12, height: 12 }} />
                </button>
                <div className="cal-date num">
                  <span>{d.getDate()}</span>
                </div>
                {list.slice(0, MAX_CHIPS).map((f) => (
                  <button
                    key={f.id}
                    className={`cal-chip ${f.status === 'done' ? 'done' : priorityMeta[f.priority].cls}${isOverdue(f) ? ' late' : ''}`}
                    title={`${typeLabel[f.type]} · ${f.title}`}
                    onClick={() => openModal({ kind: 'followup', editId: f.id })}
                  >
                    {f.title}
                  </button>
                ))}
                {list.length > MAX_CHIPS && (
                  <span className="cal-more">还有 {list.length - MAX_CHIPS} 条</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
