import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { ContactRole, FollowUpType, Priority, Stage } from '../types';
import {
  FOLLOWUP_TYPES, PRIORITIES, isActiveStage, priorityMeta, roleMeta, stageMeta, typeLabel,
} from '../utils';
import { Field, Modal } from './ui';

const STAGE_OPTIONS: Stage[] = ['lead', 'contacted', 'needs', 'proposal', 'negotiation'];

function PrioritySelect({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Priority)}>
      {PRIORITIES.map((p) => (
        <option key={p} value={p}>{priorityMeta[p].full}</option>
      ))}
    </select>
  );
}

function DeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={onDelete}>
      {label}
    </button>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDatePart = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toTimePart = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/* ================= 商机:新建 / 编辑 ================= */

export function OpportunityModal({
  editId, presetName, presetNotes, fromIdeaId,
}: {
  editId?: string; presetName?: string; presetNotes?: string; fromIdeaId?: string;
}) {
  const {
    openModal, addOpportunity, updateOpportunity, deleteOpportunity, toast, opportunities,
  } = useStore();
  const editing = editId ? opportunities.find((o) => o.id === editId) : undefined;

  const [name, setName] = useState(editing?.name ?? presetName ?? '');
  const [company, setCompany] = useState(editing?.company ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [stage, setStage] = useState<Stage>('lead');
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'P2');
  const [winRate, setWinRate] = useState(editing ? String(editing.winRate) : '');
  const [expectedClose, setExpectedClose] = useState(
    editing?.expectedClose ? toDatePart(editing.expectedClose) : '',
  );
  const [source, setSource] = useState(editing?.source ?? '');
  const [contactName, setContactName] = useState('');
  const [tags, setTags] = useState(editing ? editing.tags.join(', ') : '');
  const [notes, setNotes] = useState(presetNotes ?? '');

  const close = () => openModal(null);
  const parsedTags = () => tags.split(/[,,\s]+/).map((t) => t.trim()).filter(Boolean);

  const save = () => {
    if (!name.trim() || !company.trim()) {
      toast('请填写商机名称与客户公司');
      return;
    }
    if (editing) {
      updateOpportunity(editing.id, {
        name: name.trim(),
        company: company.trim(),
        amount: Math.max(0, Number(amount) || 0),
        priority,
        winRate: Math.min(100, Math.max(0, Number(winRate) || 0)),
        expectedClose: expectedClose
          ? new Date(expectedClose + 'T18:00:00').toISOString()
          : undefined,
        source: source.trim() || undefined,
        tags: parsedTags(),
      });
    } else {
      addOpportunity({
        name: name.trim(),
        company: company.trim(),
        amount: Math.max(0, Number(amount) || 0),
        stage,
        priority,
        expectedClose: expectedClose
          ? new Date(expectedClose + 'T18:00:00').toISOString()
          : undefined,
        source: source.trim() || undefined,
        tags: parsedTags(),
        contactName: contactName.trim() || undefined,
        notes: notes.trim() || undefined,
        fromIdeaId,
      });
    }
    close();
  };

  const remove = () => {
    if (!editing) return;
    if (!window.confirm(`删除商机「${editing.name}」?其下的跟进项与时间线将一并删除。`)) return;
    deleteOpportunity(editing.id);
    close();
  };

  return (
    <Modal
      title={editing ? '编辑商机' : fromIdeaId ? '想法升级为商机' : '新建商机'}
      onClose={close}
      footer={
        <>
          {editing && <DeleteButton label="删除商机" onDelete={remove} />}
          <button className="btn" onClick={close}>取消</button>
          <button className="btn btn-pri" onClick={save}>保存</button>
        </>
      }
    >
      <Field label="商机名称" required full>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如:ERP 系统升级项目" autoFocus />
      </Field>
      <Field label="客户公司" required>
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="如:星辰科技" />
      </Field>
      <Field label="预计金额(元)">
        <input className="num" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="680000" inputMode="numeric" />
      </Field>
      {editing ? (
        <Field label={`赢率 %(当前阶段:${stageMeta[editing.stage].label})`}>
          <input className="num" value={winRate} onChange={(e) => setWinRate(e.target.value)} inputMode="numeric" />
        </Field>
      ) : (
        <Field label="阶段">
          <select value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
            {STAGE_OPTIONS.map((s) => (
              <option key={s} value={s}>{stageMeta[s].label}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="优先级">
        <PrioritySelect value={priority} onChange={setPriority} />
      </Field>
      <Field label="预计成交日期">
        <input type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} />
      </Field>
      <Field label="来源">
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="老客户转介绍 / 展会 / 线上咨询…" />
      </Field>
      {!editing && (
        <Field label="主要联系人">
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="填写姓名,不存在时自动新建" />
        </Field>
      )}
      <Field label="标签" full={!!editing}>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="逗号分隔,如:ERP, 华东区" />
      </Field>
      {!editing && (
        <Field label="备注" full>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="背景信息、客户诉求…" />
        </Field>
      )}
    </Modal>
  );
}

/* ================= 跟进:新建 / 编辑 ================= */

function defaultDue(): { date: string; time: string } {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return { date: toDatePart(d.toISOString()), time: '10:00' };
}

export function FollowUpModal({
  editId, opportunityId, contactId, presetTitle, presetDate,
}: {
  editId?: string; opportunityId?: string; contactId?: string; presetTitle?: string; presetDate?: string;
}) {
  const {
    openModal, addFollowUp, updateFollowUp, deleteFollowUp, toast, opportunities, contacts, followUps,
  } = useStore();
  const editing = editId ? followUps.find((f) => f.id === editId) : undefined;
  const def = defaultDue();

  const [title, setTitle] = useState(editing?.title ?? presetTitle ?? '');
  const [type, setType] = useState<FollowUpType>(editing?.type ?? 'call');
  const [date, setDate] = useState(editing ? toDatePart(editing.dueAt) : presetDate ?? def.date);
  const [time, setTime] = useState(editing ? toTimePart(editing.dueAt) : def.time);
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'P2');
  const [oppId, setOppId] = useState(editing?.opportunityId ?? opportunityId ?? '');
  const [ctId, setCtId] = useState(editing?.contactId ?? contactId ?? '');

  const activeOpps = useMemo(
    () => opportunities.filter((o) => isActiveStage(o.stage) || o.id === oppId),
    [opportunities, oppId],
  );
  const opp = opportunities.find((o) => o.id === oppId);
  const contactOptions = opp
    ? contacts.filter((c) => opp.contactIds.includes(c.id) || c.id === ctId)
    : contacts;

  const close = () => openModal(null);
  const save = () => {
    if (!title.trim()) {
      toast('请填写跟进事项');
      return;
    }
    const dueAt = new Date(`${date}T${time}:00`).toISOString();
    if (editing) {
      updateFollowUp(editing.id, {
        title: title.trim(),
        type,
        dueAt,
        priority,
        opportunityId: oppId || undefined,
        contactId: ctId || undefined,
      });
    } else {
      addFollowUp({
        title: title.trim(),
        type,
        dueAt,
        priority,
        opportunityId: oppId || undefined,
        contactId: ctId || undefined,
      });
    }
    close();
  };

  const remove = () => {
    if (!editing) return;
    if (!window.confirm(`删除跟进「${editing.title}」?`)) return;
    deleteFollowUp(editing.id);
    close();
  };

  return (
    <Modal
      title={editing ? '编辑跟进' : '新建跟进'}
      onClose={close}
      footer={
        <>
          {editing && <DeleteButton label="删除跟进" onDelete={remove} />}
          <button className="btn" onClick={close}>取消</button>
          <button className="btn btn-pri" onClick={save}>保存</button>
        </>
      }
    >
      <Field label="跟进事项" required full>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如:电话回访,确认商务条款" autoFocus />
      </Field>
      <Field label="类型">
        <select value={type} onChange={(e) => setType(e.target.value as FollowUpType)}>
          {FOLLOWUP_TYPES.map((t) => (
            <option key={t} value={t}>{typeLabel[t]}</option>
          ))}
        </select>
      </Field>
      <Field label="优先级">
        <PrioritySelect value={priority} onChange={setPriority} />
      </Field>
      <Field label="日期">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="时间">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="关联商机">
        <select value={oppId} onChange={(e) => { setOppId(e.target.value); setCtId(''); }}>
          <option value="">不关联</option>
          {activeOpps.map((o) => (
            <option key={o.id} value={o.id}>{o.company} · {o.name}</option>
          ))}
        </select>
      </Field>
      <Field label="关联联系人">
        <select value={ctId} onChange={(e) => setCtId(e.target.value)}>
          <option value="">不关联</option>
          {contactOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}({c.company})</option>
          ))}
        </select>
      </Field>
    </Modal>
  );
}

/* ================= 联系人:新建 / 编辑 ================= */

export function ContactModal({ editId, opportunityId }: { editId?: string; opportunityId?: string }) {
  const {
    openModal, addContact, updateContact, deleteContact, toast, opportunities, contacts,
  } = useStore();
  const editing = editId ? contacts.find((c) => c.id === editId) : undefined;
  const opp = opportunities.find((o) => o.id === opportunityId);

  const [name, setName] = useState(editing?.name ?? '');
  const [company, setCompany] = useState(editing?.company ?? opp?.company ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [role, setRole] = useState<ContactRole>(editing?.role ?? 'decision');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [wechat, setWechat] = useState(editing?.wechat ?? '');

  const close = () => openModal(null);
  const save = () => {
    if (!name.trim() || !company.trim()) {
      toast('请填写姓名与公司');
      return;
    }
    const patch = {
      name: name.trim(),
      company: company.trim(),
      title: title.trim() || undefined,
      role,
      phone: phone.trim() || undefined,
      wechat: wechat.trim() || undefined,
    };
    if (editing) {
      updateContact(editing.id, patch);
    } else {
      addContact({ ...patch, opportunityId });
      toast(`联系人「${patch.name}」已创建`);
    }
    close();
  };

  const remove = () => {
    if (!editing) return;
    if (!window.confirm(`删除联系人「${editing.name}」?将同时解除与商机、跟进的关联。`)) return;
    deleteContact(editing.id);
    close();
  };

  return (
    <Modal
      title={editing ? '编辑联系人' : opp ? `为「${opp.name}」添加联系人` : '新建联系人'}
      onClose={close}
      footer={
        <>
          {editing && <DeleteButton label="删除联系人" onDelete={remove} />}
          <button className="btn" onClick={close}>取消</button>
          <button className="btn btn-pri" onClick={save}>保存</button>
        </>
      }
    >
      <Field label="姓名" required>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="公司" required>
        <input value={company} onChange={(e) => setCompany(e.target.value)} />
      </Field>
      <Field label="职位">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如:CTO" />
      </Field>
      <Field label="角色">
        <select value={role} onChange={(e) => setRole(e.target.value as ContactRole)}>
          {(Object.keys(roleMeta) as ContactRole[]).map((r) => (
            <option key={r} value={r}>{roleMeta[r].label}</option>
          ))}
        </select>
      </Field>
      <Field label="电话">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
      </Field>
      <Field label="微信">
        <input value={wechat} onChange={(e) => setWechat(e.target.value)} />
      </Field>
    </Modal>
  );
}

/* ================= 想法:新建 / 编辑 ================= */

export function IdeaModal({ editId }: { editId?: string }) {
  const {
    openModal, addIdea, updateIdea, deleteIdea, toast, opportunities, ideas,
  } = useStore();
  const editing = editId ? ideas.find((i) => i.id === editId) : undefined;

  const [title, setTitle] = useState(editing?.title ?? '');
  const [content, setContent] = useState(editing?.content ?? '');
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'P2');
  const [oppId, setOppId] = useState(editing?.opportunityId ?? '');

  const activeOpps = opportunities.filter((o) => isActiveStage(o.stage) || o.id === oppId);
  const close = () => openModal(null);

  const save = () => {
    if (!title.trim()) {
      toast('请填写想法标题');
      return;
    }
    if (editing) {
      updateIdea(editing.id, {
        title: title.trim(),
        content: content.trim() || undefined,
        priority,
        opportunityId: oppId || undefined,
      });
    } else {
      addIdea({
        title: title.trim(),
        content: content.trim() || undefined,
        priority,
        opportunityId: oppId || undefined,
      });
    }
    close();
  };

  const remove = () => {
    if (!editing) return;
    if (!window.confirm(`删除想法「${editing.title}」?`)) return;
    deleteIdea(editing.id);
    close();
  };

  return (
    <Modal
      title={editing ? '编辑想法' : '记录想法'}
      onClose={close}
      footer={
        <>
          {editing && <DeleteButton label="删除想法" onDelete={remove} />}
          <button className="btn" onClick={close}>取消</button>
          <button className="btn btn-pri" onClick={save}>保存</button>
        </>
      }
    >
      <Field label="想法" required full>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="一句话说清这个想法" autoFocus />
      </Field>
      <Field label="详细说明" full>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="背景、思路、下一步…" />
      </Field>
      <Field label="优先级">
        <PrioritySelect value={priority} onChange={setPriority} />
      </Field>
      <Field label="关联商机">
        <select value={oppId} onChange={(e) => setOppId(e.target.value)}>
          <option value="">不关联</option>
          {activeOpps.map((o) => (
            <option key={o.id} value={o.id}>{o.company} · {o.name}</option>
          ))}
        </select>
      </Field>
    </Modal>
  );
}

/* ================= 完成跟进(闭环) ================= */

export function CompleteFollowUpModal({ followUpId }: { followUpId: string }) {
  const { openModal, completeFollowUp, followUps, opportunities } = useStore();
  const fu = followUps.find((f) => f.id === followUpId);
  const opp = fu?.opportunityId
    ? opportunities.find((o) => o.id === fu.opportunityId)
    : undefined;
  const canNext = !!opp && isActiveStage(opp.stage);

  const [result, setResult] = useState('');
  const [next, setNext] = useState(canNext);

  const close = () => openModal(null);
  if (!fu) {
    close();
    return null;
  }

  const confirm = () => {
    completeFollowUp(fu.id, result);
    if (next && canNext && fu.opportunityId) {
      openModal({ kind: 'followup', opportunityId: fu.opportunityId, contactId: fu.contactId });
    } else {
      close();
    }
  };

  return (
    <Modal
      title="完成跟进"
      onClose={close}
      footer={
        <>
          <button className="btn" onClick={close}>取消</button>
          <button className="btn btn-pri" onClick={confirm}>
            {next && canNext ? '完成,去建下一次' : '完成'}
          </button>
        </>
      }
    >
      <div className="field full">
        <div className="fu-recap">
          <span className="typ">{typeLabel[fu.type]}</span>
          <b>{fu.title}</b>
          {opp && <span className="fu-recap-opp">{opp.company} · {opp.name}</span>}
        </div>
      </div>
      <Field label="跟进结果(选填,写入商机时间线)" full>
        <textarea
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="如:客户确认商务条款,下周出合同…"
          autoFocus
        />
      </Field>
      {canNext && (
        <label className="chk-row full">
          <input type="checkbox" checked={next} onChange={(e) => setNext(e.target.checked)} />
          完成后立即创建下一次跟进(保持商机总有下一步)
        </label>
      )}
    </Modal>
  );
}
