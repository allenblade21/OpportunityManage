import { useEffect, useRef, useState } from 'react';
import { useStore, type Page } from './store';
import { groupFollowUps, isActiveStage } from './utils';
import { Icon } from './components/ui';
import {
  CompleteFollowUpModal, ContactModal, FollowUpModal, IdeaModal, OpportunityModal,
} from './components/modals';
import { SearchModal } from './components/SearchModal';
import { SettingsModal } from './components/SettingsModal';
import { runNotifyCheck, toggleNotifications } from './lib/notify';
import { Dashboard } from './pages/Dashboard';
import { Opportunities } from './pages/Opportunities';
import { OpportunityDetail } from './pages/OpportunityDetail';
import { Contacts } from './pages/Contacts';
import { FollowUps } from './pages/FollowUps';
import { Ideas } from './pages/Ideas';

const NAV: { page: Page; icon: string; label: string }[] = [
  { page: 'dashboard', icon: 'home', label: '工作台' },
  { page: 'opps', icon: 'target', label: '商机' },
  { page: 'contacts', icon: 'users', label: '联系人' },
  { page: 'followups', icon: 'check2', label: '跟进项' },
  { page: 'ideas', icon: 'bulb', label: '想法' },
];

function Sidebar() {
  const { page, go, opportunities, contacts, followUps, ideas, openModal } = useStore();

  const counts: Record<string, number> = {
    opps: opportunities.filter((o) => isActiveStage(o.stage)).length,
    contacts: contacts.length,
    followups: followUps.filter((f) => f.status === 'open').length,
    ideas: ideas.filter((i) => i.status !== 'shelved').length,
  };
  const activeKey = page === 'detail' ? 'opps' : page;

  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="mark">
          <Icon name="logo" style={{ stroke: '#6FD0B4', width: 17, height: 17 }} />
        </span>
        <span>
          <b>机汇</b>
          <small>OPPORTUNITY MANAGE</small>
        </span>
      </div>
      <nav className="nav" aria-label="主导航">
        {NAV.map((n) => (
          <a
            key={n.page}
            href="#"
            className={activeKey === n.page ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault();
              go(n.page);
            }}
          >
            <Icon name={n.icon} />
            {n.label}
            {counts[n.page] !== undefined && <span className="cnt">{counts[n.page]}</span>}
          </a>
        ))}
      </nav>
      <div className="side-foot">
        <nav className="nav">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openModal({ kind: 'settings' });
            }}
          >
            <Icon name="gear" />设置
          </a>
        </nav>
        <div className="user">
          <span className="uav">我</span>
          <span className="ux">
            <span className="un">我的商机</span>
            <br />
            <span className="ue">本地单机版 · 数据存于浏览器</span>
          </span>
        </div>
      </div>
    </aside>
  );
}

function QuickAdd() {
  const openModal = useStore((s) => s.openModal);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const items = [
    { label: '商机', icon: 'target', run: () => openModal({ kind: 'opp' }) },
    { label: '联系人', icon: 'users', run: () => openModal({ kind: 'contact' }) },
    { label: '跟进项', icon: 'check2', run: () => openModal({ kind: 'followup' }) },
    { label: '想法', icon: 'bulb', run: () => openModal({ kind: 'idea' }) },
  ];

  return (
    <div className="qwrap" ref={ref}>
      <button className="btn btn-pri" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Icon name="plus" />快速新建
      </button>
      {open && (
        <div className="qmenu" role="menu">
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.run();
              }}
            >
              <Icon name={it.icon} />新建{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Topbar() {
  const openModal = useStore((s) => s.openModal);
  const followUps = useStore((s) => s.followUps);
  const notifyEnabled = useStore((s) => s.notifyEnabled);
  const overdue = groupFollowUps(followUps).overdue.length;
  const go = useStore((s) => s.go);

  return (
    <header className="topbar">
      <div
        className="search"
        role="button"
        tabIndex={0}
        onClick={() => openModal({ kind: 'search' })}
        onKeyDown={(e) => e.key === 'Enter' && openModal({ kind: 'search' })}
      >
        <Icon name="search" />
        搜索商机、联系人、跟进、想法…
        <span className="kbd">⌘K</span>
      </div>
      <div className="topspace" />
      {overdue > 0 && (
        <button className="overdue-pill" onClick={() => go('followups')}>
          {overdue} 条逾期跟进
        </button>
      )}
      <button
        className={`btn btn-ic bell${notifyEnabled ? ' bell-on' : ''}`}
        onClick={() => void toggleNotifications()}
        aria-label={notifyEnabled ? '关闭到期通知' : '开启到期通知'}
        title={notifyEnabled ? '到期通知已开启(截止前 15 分钟提醒)' : '开启到期通知'}
      >
        <Icon name="bell" />
      </button>
      <QuickAdd />
    </header>
  );
}

function Toast() {
  const toastState = useStore((s) => s.toastState);
  const clearToast = useStore((s) => s.clearToast);

  useEffect(() => {
    if (!toastState) return;
    const t = setTimeout(clearToast, toastState.action ? 5200 : 2600);
    return () => clearTimeout(t);
  }, [toastState, clearToast]);

  return (
    <div className={`toast${toastState ? ' show' : ''}`} role="status">
      <span>{toastState?.msg}</span>
      {toastState?.action && (
        <button
          onClick={() => {
            toastState.action?.run();
            clearToast();
          }}
        >
          {toastState.action.label}
        </button>
      )}
    </div>
  );
}

function Shell() {
  const page = useStore((s) => s.page);
  const modal = useStore((s) => s.modal);
  const contentRef = useRef<HTMLElement>(null);
  const remindedRef = useRef(false);

  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
    if (window.innerWidth <= 920) window.scrollTo(0, 0);
  }, [page]);

  // ⌘K / Ctrl+K 打开全局搜索
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useStore.getState().openModal({ kind: 'search' });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // 应用载入时提醒逾期跟进(每次会话一次)
  useEffect(() => {
    if (remindedRef.current) return;
    remindedRef.current = true;
    const { followUps, toast, go } = useStore.getState();
    const overdue = groupFollowUps(followUps).overdue.length;
    if (overdue > 0) {
      toast(`你有 ${overdue} 条跟进已逾期`, { label: '去处理', run: () => go('followups') });
    }
  }, []);

  // 到期通知调度:开启后立即检查一轮,此后每 30 秒一轮
  const notifyEnabled = useStore((s) => s.notifyEnabled);
  useEffect(() => {
    if (!notifyEnabled) return;
    runNotifyCheck();
    const timer = setInterval(runNotifyCheck, 30_000);
    return () => clearInterval(timer);
  }, [notifyEnabled]);

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <main className="content" ref={contentRef}>
          {page === 'dashboard' && <Dashboard />}
          {page === 'opps' && <Opportunities />}
          {page === 'detail' && <OpportunityDetail />}
          {page === 'contacts' && <Contacts />}
          {page === 'followups' && <FollowUps />}
          {page === 'ideas' && <Ideas />}
        </main>
      </div>

      {modal?.kind === 'opp' && (
        <OpportunityModal
          editId={modal.editId}
          presetName={modal.presetName}
          presetNotes={modal.presetNotes}
          fromIdeaId={modal.fromIdeaId}
        />
      )}
      {modal?.kind === 'contact' && (
        <ContactModal editId={modal.editId} opportunityId={modal.opportunityId} />
      )}
      {modal?.kind === 'followup' && (
        <FollowUpModal
          editId={modal.editId}
          opportunityId={modal.opportunityId}
          contactId={modal.contactId}
          presetTitle={modal.presetTitle}
          presetDate={modal.presetDate}
        />
      )}
      {modal?.kind === 'idea' && <IdeaModal editId={modal.editId} />}
      {modal?.kind === 'search' && <SearchModal />}
      {modal?.kind === 'settings' && <SettingsModal />}
      {modal?.kind === 'complete-followup' && (
        <CompleteFollowUpModal key={modal.followUpId} followUpId={modal.followUpId} />
      )}

      <Toast />
    </div>
  );
}

/** 等待异步存储(IndexedDB)恢复完成后再渲染,避免种子数据闪现 */
export default function App() {
  const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    if (useStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  if (!hydrated) {
    return (
      <div className="boot" aria-label="加载中">
        <span className="boot-mark">
          <Icon name="logo" style={{ stroke: '#6FD0B4', width: 22, height: 22 }} />
        </span>
        机汇
      </div>
    );
  }
  return <Shell />;
}
