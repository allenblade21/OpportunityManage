import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { fmtWan, isActiveStage, priorityMeta, stageMeta, typeLabel } from '../utils';
import { Icon, PriorityChip, StageDot } from './ui';

interface Hit {
  key: string;
  primary: string;
  secondary: string;
  badge?: JSX.Element;
  run: () => void;
}

export function SearchModal() {
  const { openModal, opportunities, contacts, followUps, ideas, go } = useStore();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') openModal(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openModal]);

  const close = () => openModal(null);
  const nav = (run: () => void) => {
    run();
    close();
  };

  const sections = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const match = (...fields: (string | undefined)[]) =>
      fields.some((f) => f && f.toLowerCase().includes(query));

    const oppHits: Hit[] = opportunities
      .filter((o) => match(o.name, o.company, ...o.tags))
      .slice(0, 5)
      .map((o) => ({
        key: o.id,
        primary: `${o.company} · ${o.name}`,
        secondary: `${stageMeta[o.stage].label} · ${fmtWan(o.amount)}`,
        badge: <StageDot stage={o.stage} withLabel={false} />,
        run: () => go('detail', o.id),
      }));

    const contactHits: Hit[] = contacts
      .filter((c) => match(c.name, c.company, c.title, c.phone))
      .slice(0, 5)
      .map((c) => {
        const opp = opportunities.find(
          (o) => o.contactIds.includes(c.id) && isActiveStage(o.stage),
        );
        return {
          key: c.id,
          primary: c.name,
          secondary: `${c.company}${c.title ? ` · ${c.title}` : ''}`,
          run: () => (opp ? go('detail', opp.id) : go('contacts')),
        };
      });

    const fuHits: Hit[] = followUps
      .filter((f) => match(f.title))
      .slice(0, 5)
      .map((f) => ({
        key: f.id,
        primary: f.title,
        secondary: `${typeLabel[f.type]} · ${f.status === 'done' ? '已完成' : priorityMeta[f.priority].full}`,
        badge: f.status === 'open' ? <PriorityChip p={f.priority} /> : undefined,
        run: () => go('followups'),
      }));

    const ideaHits: Hit[] = ideas
      .filter((i) => match(i.title, i.content))
      .slice(0, 5)
      .map((i) => ({
        key: i.id,
        primary: i.title,
        secondary:
          i.status === 'pending' ? '想法 · 待评估' : i.status === 'adopted' ? '想法 · 已采纳' : '想法 · 已搁置',
        run: () => go('ideas'),
      }));

    return [
      { label: '商机', hits: oppHits },
      { label: '联系人', hits: contactHits },
      { label: '跟进项', hits: fuHits },
      { label: '想法', hits: ideaHits },
    ].filter((s) => s.hits.length > 0);
  }, [q, opportunities, contacts, followUps, ideas, go]);

  const first = sections[0]?.hits[0];
  const total = sections.reduce((n, s) => n + s.hits.length, 0);

  return (
    <div
      className="backdrop open"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal search-modal" role="dialog" aria-modal="true" aria-label="全局搜索">
        <div className="sr-input">
          <Icon name="search" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && first) nav(first.run);
            }}
            placeholder="搜索商机、联系人、跟进、想法…"
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="sr-body">
          {q.trim() === '' ? (
            <div className="sr-hint">输入关键词,回车打开第一条结果</div>
          ) : total === 0 ? (
            <div className="sr-hint">没有找到「{q.trim()}」相关的内容</div>
          ) : (
            sections.map((sec) => (
              <div className="sr-sec" key={sec.label}>
                <div className="sr-label">{sec.label}</div>
                {sec.hits.map((h) => (
                  <button className="sr-row" key={h.key} onClick={() => nav(h.run)}>
                    {h.badge}
                    <span className="sr-primary">{h.primary}</span>
                    <span className="sr-secondary">{h.secondary}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
