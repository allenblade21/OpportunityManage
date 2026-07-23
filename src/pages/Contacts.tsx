import { useState } from 'react';
import { useStore } from '../store';
import type { ContactRole } from '../types';
import { daysSince, fmtWhen, isActiveStage, roleMeta } from '../utils';
import { Avatar, Icon } from '../components/ui';

const STALE_DAYS = 14;

export function Contacts() {
  const { contacts, opportunities, openModal, go } = useStore();
  const [fCompany, setFCompany] = useState('all');
  const [fRole, setFRole] = useState<'all' | ContactRole>('all');

  const companies = [...new Set(contacts.map((c) => c.company))];
  const filtered = contacts.filter(
    (c) => (fCompany === 'all' || c.company === fCompany) && (fRole === 'all' || c.role === fRole),
  );

  const oppsOf = (contactId: string) =>
    opportunities.filter((o) => o.contactIds.includes(contactId));

  return (
    <section className="page visible">
      <div className="phead">
        <h1>联系人</h1>
        <span className="sub">{contacts.length} 位 · 覆盖 {companies.length} 家客户</span>
        <span className="spacer" />
        <select className="sel" value={fCompany} onChange={(e) => setFCompany(e.target.value)}>
          <option value="all">全部公司</option>
          {companies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="sel" value={fRole} onChange={(e) => setFRole(e.target.value as 'all' | ContactRole)}>
          <option value="all">全部角色</option>
          {(Object.keys(roleMeta) as ContactRole[]).map((r) => (
            <option key={r} value={r}>{roleMeta[r].label}</option>
          ))}
        </select>
        <button className="btn btn-pri" onClick={() => openModal({ kind: 'contact' })}>
          <Icon name="plus" />新建联系人
        </button>
      </div>

      <div className="panel">
        <div className="twrap">
          <table>
            <thead>
              <tr>
                <th>姓名</th><th>公司 · 职位</th><th>角色</th><th>电话</th><th>微信</th>
                <th>关联商机</th><th>最近联系</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const opps = oppsOf(c.id);
                const activeOpp = opps.find((o) => isActiveStage(o.stage)) ?? opps[0];
                const stale =
                  c.lastContactAt !== undefined &&
                  daysSince(c.lastContactAt) > STALE_DAYS &&
                  opps.some((o) => isActiveStage(o.stage));
                return (
                  <tr key={c.id} onClick={() => activeOpp && go('detail', activeOpp.id)}>
                    <td>
                      <span className="namecell">
                        <Avatar name={c.name} />
                        <span className="b">{c.name}</span>
                      </span>
                    </td>
                    <td>
                      {c.company}
                      {c.title && <span className="sub"> · {c.title}</span>}
                    </td>
                    <td><span className={`chip ${roleMeta[c.role].cls}`}>{roleMeta[c.role].label}</span></td>
                    <td className="num">{c.phone ?? '—'}</td>
                    <td className="num">{c.wechat ?? '—'}</td>
                    <td>
                      {opps.length === 0 ? (
                        <span className="sub">—</span>
                      ) : (
                        <span className="sub">
                          {opps[0].name}
                          {opps.length > 1 && ` 等 ${opps.length} 个`}
                        </span>
                      )}
                    </td>
                    <td className={stale ? 'stale' : 'num'}>
                      {c.lastContactAt
                        ? stale
                          ? `${fmtWhen(c.lastContactAt, false)} · ${daysSince(c.lastContactAt)} 天未联系`
                          : fmtWhen(c.lastContactAt, false)
                        : '从未联系'}
                    </td>
                    <td>
                      <button
                        className="lnk"
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal({ kind: 'contact', editId: c.id });
                        }}
                      >
                        编辑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
