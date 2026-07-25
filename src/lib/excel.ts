/**
 * Excel(SheetJS)与 JSON 备份的序列化/反序列化。
 * - Excel:四张工作表,中文表头,面向人读与再导入(按 ID upsert);不含时间线
 * - JSON:带版本号的无损备份(含时间线),恢复时整体替换
 */
import * as XLSX from 'xlsx';
import { fileStamp, triggerDownload } from './backup';
import type { DataBundle } from '../store';
import type {
  Contact, ContactRole, FollowUp, FollowUpStatus, FollowUpType, Idea, IdeaStatus,
  Opportunity, Priority, Stage,
} from '../types';
import { nowISO, priorityMeta, roleMeta, stageMeta, typeLabel, uid } from '../utils';

/* ---------- 枚举 ↔ 中文标签 ---------- */

const label = {
  stage: (s: Stage) => stageMeta[s].label,
  priority: (p: Priority) => priorityMeta[p].full,
  role: (r: ContactRole) => roleMeta[r].label,
  fuType: (t: FollowUpType) => typeLabel[t],
  fuStatus: (s: FollowUpStatus) => ({ open: '待办', done: '已完成', canceled: '已取消' }[s]),
  ideaStatus: (s: IdeaStatus) => ({ pending: '待评估', adopted: '已采纳', shelved: '已搁置' }[s]),
};

function reverse<K extends string>(pairs: [K, string][], fallback: K) {
  const map = new Map(pairs.map(([k, v]) => [v, k]));
  return (v: unknown): K => map.get(String(v ?? '').trim()) ?? fallback;
}

const parseStage = reverse<Stage>(
  (Object.keys(stageMeta) as Stage[]).map((s) => [s, stageMeta[s].label]),
  'lead',
);
const parsePriority = reverse<Priority>(
  (Object.keys(priorityMeta) as Priority[]).map((p) => [p, priorityMeta[p].full] as [Priority, string]),
  'P2',
);
const parseRole = reverse<ContactRole>(
  (Object.keys(roleMeta) as ContactRole[]).map((r) => [r, roleMeta[r].label]),
  'decision',
);
const parseFuType = reverse<FollowUpType>(
  (Object.keys(typeLabel) as FollowUpType[]).map((t) => [t, typeLabel[t]]),
  'other',
);
const parseFuStatus = reverse<FollowUpStatus>(
  [['open', '待办'], ['done', '已完成'], ['canceled', '已取消']],
  'open',
);
const parseIdeaStatus = reverse<IdeaStatus>(
  [['pending', '待评估'], ['adopted', '已采纳'], ['shelved', '已搁置']],
  'pending',
);

/* ---------- 单元格工具 ---------- */

type Row = Record<string, unknown>;
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());
const orUndef = (v: unknown): string | undefined => (str(v) ? str(v) : undefined);
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
/** 支持 ISO 或 YYYY-MM-DD;无效返回 undefined */
const isoOrUndef = (v: unknown): string | undefined => {
  const s = str(v);
  if (!s) return undefined;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T18:00:00`) : new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

/* ---------- 行映射(导出为可单测的纯函数) ---------- */

export function oppToRow(o: Opportunity): Row {
  return {
    ID: o.id,
    商机名称: o.name,
    客户公司: o.company,
    '预计金额(元)': o.amount,
    阶段: label.stage(o.stage),
    优先级: label.priority(o.priority),
    '赢率%': o.winRate,
    预计成交: o.expectedClose ? o.expectedClose.slice(0, 10) : '',
    来源: o.source ?? '',
    标签: o.tags.join(','),
    负责人: o.owner,
    联系人IDs: o.contactIds.join(','),
    主要联系人ID: o.primaryContactId ?? '',
    输单原因: o.lostReason ?? '',
    赢单时间: o.wonAt ?? '',
    输单时间: o.lostAt ?? '',
    创建时间: o.createdAt,
  };
}

export function rowToOpp(r: Row): Opportunity | null {
  const name = str(r['商机名称']);
  const company = str(r['客户公司']);
  if (!name || !company) return null;
  return {
    id: str(r['ID']) || uid(),
    name,
    company,
    amount: Math.max(0, num(r['预计金额(元)'])),
    stage: parseStage(r['阶段']),
    priority: parsePriority(r['优先级']),
    winRate: Math.min(100, Math.max(0, num(r['赢率%']))),
    expectedClose: isoOrUndef(r['预计成交']),
    source: orUndef(r['来源']),
    tags: str(r['标签']).split(/[,,]/).map((t) => t.trim()).filter(Boolean),
    contactIds: str(r['联系人IDs']).split(/[,,]/).map((t) => t.trim()).filter(Boolean),
    primaryContactId: orUndef(r['主要联系人ID']),
    owner: str(r['负责人']) || '我',
    lostReason: orUndef(r['输单原因']),
    wonAt: isoOrUndef(r['赢单时间']),
    lostAt: isoOrUndef(r['输单时间']),
    createdAt: isoOrUndef(r['创建时间']) ?? nowISO(),
    updatedAt: nowISO(),
  };
}

export function contactToRow(c: Contact): Row {
  return {
    ID: c.id,
    姓名: c.name,
    公司: c.company,
    职位: c.title ?? '',
    角色: label.role(c.role),
    电话: c.phone ?? '',
    微信: c.wechat ?? '',
    邮箱: c.email ?? '',
    备注: c.notes ?? '',
    最近联系时间: c.lastContactAt ?? '',
    创建时间: c.createdAt,
  };
}

export function rowToContact(r: Row): Contact | null {
  const name = str(r['姓名']);
  const company = str(r['公司']);
  if (!name || !company) return null;
  return {
    id: str(r['ID']) || uid(),
    name,
    company,
    title: orUndef(r['职位']),
    role: parseRole(r['角色']),
    phone: orUndef(r['电话']),
    wechat: orUndef(r['微信']),
    email: orUndef(r['邮箱']),
    notes: orUndef(r['备注']),
    lastContactAt: isoOrUndef(r['最近联系时间']),
    createdAt: isoOrUndef(r['创建时间']) ?? nowISO(),
  };
}

export function fuToRow(f: FollowUp): Row {
  return {
    ID: f.id,
    跟进事项: f.title,
    类型: label.fuType(f.type),
    状态: label.fuStatus(f.status),
    优先级: label.priority(f.priority),
    截止时间: f.dueAt,
    商机ID: f.opportunityId ?? '',
    联系人ID: f.contactId ?? '',
    跟进结果: f.result ?? '',
    完成时间: f.doneAt ?? '',
    创建时间: f.createdAt,
  };
}

export function rowToFu(r: Row): FollowUp | null {
  const title = str(r['跟进事项']);
  if (!title) return null;
  return {
    id: str(r['ID']) || uid(),
    title,
    type: parseFuType(r['类型']),
    status: parseFuStatus(r['状态']),
    priority: parsePriority(r['优先级']),
    dueAt: isoOrUndef(r['截止时间']) ?? nowISO(),
    opportunityId: orUndef(r['商机ID']),
    contactId: orUndef(r['联系人ID']),
    result: orUndef(r['跟进结果']),
    doneAt: isoOrUndef(r['完成时间']),
    createdAt: isoOrUndef(r['创建时间']) ?? nowISO(),
  };
}

export function ideaToRow(i: Idea): Row {
  return {
    ID: i.id,
    想法: i.title,
    内容: i.content ?? '',
    状态: label.ideaStatus(i.status),
    优先级: label.priority(i.priority),
    商机ID: i.opportunityId ?? '',
    标签: i.tags.join(','),
    创建时间: i.createdAt,
  };
}

export function rowToIdea(r: Row): Idea | null {
  const title = str(r['想法']);
  if (!title) return null;
  return {
    id: str(r['ID']) || uid(),
    title,
    content: orUndef(r['内容']),
    status: parseIdeaStatus(r['状态']),
    priority: parsePriority(r['优先级']),
    opportunityId: orUndef(r['商机ID']),
    tags: str(r['标签']).split(/[,,]/).map((t) => t.trim()).filter(Boolean),
    createdAt: isoOrUndef(r['创建时间']) ?? nowISO(),
  };
}

/* ---------- 工作簿 ---------- */

const SHEETS = { opp: '商机', contact: '联系人', fu: '跟进项', idea: '想法' };

export function toWorkbook(data: DataBundle): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.opportunities.map(oppToRow)), SHEETS.opp);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.contacts.map(contactToRow)), SHEETS.contact);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.followUps.map(fuToRow)), SHEETS.fu);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.ideas.map(ideaToRow)), SHEETS.idea);
  return wb;
}

export function fromWorkbook(wb: XLSX.WorkBook): DataBundle {
  const rows = (name: string): Row[] => {
    const ws = wb.Sheets[name];
    return ws ? XLSX.utils.sheet_to_json<Row>(ws) : [];
  };
  return {
    opportunities: rows(SHEETS.opp).map(rowToOpp).filter((x): x is Opportunity => x !== null),
    contacts: rows(SHEETS.contact).map(rowToContact).filter((x): x is Contact => x !== null),
    followUps: rows(SHEETS.fu).map(rowToFu).filter((x): x is FollowUp => x !== null),
    ideas: rows(SHEETS.idea).map(rowToIdea).filter((x): x is Idea => x !== null),
  };
}

export function downloadExcel(data: DataBundle): void {
  const out = XLSX.write(toWorkbook(data), { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, `jihui-data-${fileStamp()}.xlsx`);
}

export function parseExcel(buf: ArrayBuffer): DataBundle {
  const wb = XLSX.read(buf, { type: 'array' });
  // 防御:任意文本可能被当作 CSV 静默解析成 Sheet1,导致"成功导入 0 条"的误导
  const known = Object.values(SHEETS);
  if (!wb.SheetNames.some((n) => known.includes(n))) {
    throw new Error('未找到机汇的数据工作表(商机/联系人/跟进项/想法)');
  }
  return fromWorkbook(wb);
}
