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

/* ================= 新建商机 ================= */

export function NewOpportunityModal({
  presetName, presetNotes, fromIdeaId,
}: {
  presetName?: string; presetNotes?: string; fromIdeaId?: string;
}) {
  const { openModal, addOpportunity, toast } = useStore();
  const [name, setName] = useState(presetName ?? '');
  const [company, setCompany] = useState('');
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState<Stage>('lead');
  const [priority, setPriority] = useState<Priority>('P2');
  const [expectedClose, setExpectedClose] = useState('');
  const [source, setSource] = useState('');
  const [contactName, setContactName] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState(presetNotes ?? '');

  const close = () => openModal(null);
  const save = () => {
    if (!name.trim() || !company.trim()) {
      toast('请填写商机名称与客户公司');
      return;
    }
    addOpportunity({
      name: name.trim(),
      company: company.trim(),
      amount: Math.max(0, Number(amount) || 0),
      stage,
      priority,
      expectedClose: expectedClose ? new Date(expectedClose + 'T18:00:00').toISOString() : undefined,
      source: source.trim() || undefined,
      tags: tags.split(/[,,\s]+/).map((t) => t.trim()).filter(Boolean),
      contactName: contactName.trim() || undefined,
      notes: notes.trim() || undefined,
      fromIdeaId,
    });
    close();
  };

  return (
    <Modal
      title={fromIdeaId ? '想法升级为商机' : '新建商机'}
      onClose={close}
      footer={
        <>
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
      <Field label="阶段">
        <select value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
          {STAGE_OPTIONS.map((s) => (
            <option key={s} value={s}>{stageMeta[s].label}</option>
          ))}
        </select>
      </Field>
      <Field label="优先级">
        <PrioritySelect value={priority} onChange={setPriority} />
      </Field>
      <Field label="预计成交日期">
        <input type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} />
      </Field>
      <Field label="来源">
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="老客户转介绍 / 展会 / 线上咨询…" />
      </Field>
      <Field label="主要联系人">
        <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="填写姓名,不存在时自动新建" />
      </Field>
      <Field label="标签">
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="逗号分隔,如:ERP, 华东区" />
      </Field>
      <Field label="备注" full>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="背景信息、客户诉求…" />
      </Field>
    </Modal>
  );
}

/* ================= 新建跟进 ================= */

function defaultDue(): { date: string; time: string } {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: '10:00' };
}

export function NewFollowUpModal({
  opportunityId, contactId, presetTitle,
}: {
  opportunityId?: string; contactId?: string; presetTitle?: string;
}) {
  const { openModal, addFollowUp, toast, opportunities, contacts } = useStore();
  const def = defaultDue();
  const [title, setTitle] = useState(presetTitle ?? '');
  const [type, setType] = useState<FollowUpType>('call');
  const [date, setDate] = useState(def.date);
  const [time, setTime] = useState(def.time);
  const [priority, setPriority] = useState<Priority>('P2');
  const [oppId, setOppId] = useState(opportunityId ?? '');
  const [ctId, setCtId] = useState(contactId ?? '');

  const activeOpps = useMemo(
    () => opportunities.filter((o) => isActiveStage(o.stage)),
    [opportunities],
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
    addFollowUp({
      title: title.trim(),
      type,
      dueAt: new Date(`${date}T${time}:00`).toISOString(),
      priority,
      opportunityId: oppId || undefined,
      contactId: ctId || undefined,
    });
    close();
  };

  return (
    <Modal
      title="新建跟进"
      onClose={close}
      footer={
        <>
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

/* ================= 新建联系人 ================= */

export function NewContactModal({ opportunityId }: { opportunityId?: string }) {
  const { openModal, addContact, toast, opportunities } = useStore();
  const opp = opportunities.find((o) => o.id === opportunityId);
  const [name, setName] = useState('');
  const [company, setCompany] = useState(opp?.company ?? '');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<ContactRole>('decision');
  const [phone, setPhone] = useState('');
  const [wechat, setWechat] = useState('');

  const close = () => openModal(null);
  const save = () => {
    if (!name.trim() || !company.trim()) {
      toast('请填写姓名与公司');
      return;
    }
    addContact({
      name: name.trim(),
      company: company.trim(),
      title: title.trim() || undefined,
      role,
      phone: phone.trim() || undefined,
      wechat: wechat.trim() || undefined,
      opportunityId,
    });
    toast(`联系人「${name.trim()}」已创建`);
    close();
  };

  return (
    <Modal
      title={opp ? `为「${opp.name}」添加联系人` : '新建联系人'}
      onClose={close}
      footer={
        <>
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

/* ================= 新建想法 ================= */

export function NewIdeaModal() {
  const { openModal, addIdea, toast, opportunities } = useStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority>('P2');
  const [oppId, setOppId] = useState('');

  const activeOpps = opportunities.filter((o) => isActiveStage(o.stage));
  const close = () => openModal(null);
  const save = () => {
    if (!title.trim()) {
      toast('请填写想法标题');
      return;
    }
    addIdea({
      title: title.trim(),
      content: content.trim() || undefined,
      priority,
      opportunityId: oppId || undefined,
    });
    close();
  };

  return (
    <Modal
      title="记录想法"
      onClose={close}
      footer={
        <>
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
