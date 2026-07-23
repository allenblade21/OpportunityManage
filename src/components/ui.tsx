import { useEffect, type CSSProperties, type ReactNode } from 'react';
import type { Priority, Stage } from '../types';
import { priorityMeta, stageMeta } from '../utils';

/* ---------- 图标 ---------- */

const ICON_PATHS: Record<string, ReactNode> = {
  home: (<><path d="M3 11l9-8 9 8" /><path d="M5 9.5V21h14V9.5" /></>),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".8" /></>),
  users: (<><circle cx="9.5" cy="8" r="3.6" /><path d="M3.5 20c.5-3.4 3-5.2 6-5.2s5.5 1.8 6 5.2" /><path d="M16 4.8a3.6 3.6 0 0 1 0 6.6" /><path d="M17.8 15.2c1.7.7 2.8 2.3 3.2 4.8" /></>),
  check2: (<><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" /><path d="M8 12.2l2.8 2.8L16.5 9" /></>),
  bulb: (<><path d="M9.5 18.5h5" /><path d="M10.5 21.5h3" /><path d="M12 2.8a6.2 6.2 0 0 0-4.1 10.8c.9.8 1.6 1.7 1.6 2.9h5c0-1.2.7-2.1 1.6-2.9A6.2 6.2 0 0 0 12 2.8z" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.6-4.6" /></>),
  plus: (<path d="M12 5v14M5 12h14" />),
  gear: (<><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" /></>),
  back: (<path d="M15 18l-6-6 6-6" />),
  phone: (<path d="M5 3h4l2 5-2.4 1.6a12.5 12.5 0 0 0 5.8 5.8L16 13l5 2v4a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5a2 2 0 0 1 2-2z" />),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></>),
  check: (<path d="M4.5 12.5l5 5L19.5 6.5" />),
  more: (<><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>),
  edit: (<><path d="M4 20l1-4L16.5 4.5l3 3L8 19l-4 1z" /><path d="M14 7l3 3" /></>),
  bell: (<><path d="M6 8.5a6 6 0 0 1 12 0c0 5 2 6.3 2 6.3H4s2-1.3 2-6.3z" /><path d="M10.2 20a2 2 0 0 0 3.6 0" /></>),
  cal: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4" /></>),
  logo: (<path d="M4 19V13M10 19V9M16 19V5M20 19H3" />),
};

export function Icon({ name, style }: { name: string; style?: CSSProperties }) {
  return (
    <svg className="ic" viewBox="0 0 24 24" style={style} aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

/* ---------- 胶囊 / 标识 ---------- */

export function PriorityChip({ p, full = false }: { p: Priority; full?: boolean }) {
  const m = priorityMeta[p];
  return <span className={`chip ${m.cls}`}>{full ? m.full : p}</span>;
}

export function StageDot({ stage, withLabel = true }: { stage: Stage; withLabel?: boolean }) {
  const m = stageMeta[stage];
  const dot = <span className={`dot bg-${m.color}`} />;
  if (!withLabel) return dot;
  return (
    <span className="st">
      {dot}
      {m.label}
    </span>
  );
}

export function Avatar({ name, lg = false, title }: { name?: string; lg?: boolean; title?: string }) {
  return (
    <span className={`av${lg ? ' av-lg' : ''}`} title={title ?? name}>
      {(name ?? '?').slice(0, 1)}
    </span>
  );
}

/* ---------- 面板 ---------- */

export function Panel({
  title, count, extra, children, headClass,
}: {
  title: ReactNode; count?: ReactNode; extra?: ReactNode; children: ReactNode; headClass?: string;
}) {
  return (
    <div className="panel">
      <div className={`panel-h ${headClass ?? ''}`}>
        {title}
        {count !== undefined && <span className="n">{count}</span>}
        {extra && <span className="more">{extra}</span>}
      </div>
      <div className="panel-b">{children}</div>
    </div>
  );
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div>{text}</div>
      {action}
    </div>
  );
}

/* ---------- 分段控件 ---------- */

export function Seg<T extends string>({
  options, value, onChange,
}: {
  options: { key: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={o.key === value}
          className={o.key === value ? 'active' : ''}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- 复选框 ---------- */

export function Check({ done, onToggle, label }: { done: boolean; onToggle: () => void; label?: string }) {
  return (
    <button
      type="button"
      className="check"
      aria-label={label ?? (done ? '撤销完成' : '完成跟进')}
      aria-pressed={done}
      onClick={onToggle}
    >
      <Icon name="check" />
    </button>
  );
}

/* ---------- 弹窗 ---------- */

export function Modal({
  title, onClose, children, footer, headExtra,
}: {
  title: ReactNode; onClose: () => void; children: ReactNode; footer: ReactNode; headExtra?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="backdrop open"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <div className="m-h">
          <b>{title}</b>
          {headExtra}
        </div>
        <div className="m-b">{children}</div>
        <div className="m-f">{footer}</div>
      </div>
    </div>
  );
}

export function Field({
  label, required, full, children,
}: {
  label: string; required?: boolean; full?: boolean; children: ReactNode;
}) {
  return (
    <div className={`field${full ? ' full' : ''}`}>
      <label>
        {label} {required && <em>*</em>}
      </label>
      {children}
    </div>
  );
}
