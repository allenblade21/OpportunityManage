import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { jsonBackup, parseJsonBackup } from '../lib/backup';
import { fromWorkbook, rowToContact, rowToFu, rowToIdea, rowToOpp, toWorkbook } from '../lib/excel';
import { buildSeed } from '../seed';

describe('Excel 工作簿往返', () => {
  it('导出→写二进制→读回:四类对象数量与关键字段一致', () => {
    const seed = buildSeed();
    const wb = toWorkbook(seed);
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const parsed = fromWorkbook(XLSX.read(buf, { type: 'array' }));

    expect(parsed.opportunities).toHaveLength(seed.opportunities.length);
    expect(parsed.contacts).toHaveLength(seed.contacts.length);
    expect(parsed.followUps).toHaveLength(seed.followUps.length);
    expect(parsed.ideas).toHaveLength(seed.ideas.length);

    const star = parsed.opportunities.find((o) => o.id === 'opp-star')!;
    expect(star.name).toBe('ERP 系统升级项目');
    expect(star.stage).toBe('negotiation');
    expect(star.priority).toBe('P0');
    expect(star.amount).toBe(680000);
    expect(star.winRate).toBe(70);
    expect(star.contactIds).toEqual(['ct-zwm', 'ct-lxy']);
    expect(star.primaryContactId).toBe('ct-zwm');

    const zwm = parsed.contacts.find((c) => c.id === 'ct-zwm')!;
    expect(zwm.name).toBe('张伟明');
    expect(zwm.role).toBe('decision');
    expect(zwm.phone).toBe('138-0101-2233');

    const fu2 = parsed.followUps.find((f) => f.id === 'fu-2')!;
    expect(fu2.opportunityId).toBe('opp-star');
    expect(fu2.type).toBe('call');
    expect(fu2.priority).toBe('P0');
    expect(fu2.status).toBe('open');

    const idea1 = parsed.ideas.find((i) => i.id === 'id-1')!;
    expect(idea1.status).toBe('pending');
    expect(idea1.opportunityId).toBe('opp-hy');
  });
});

describe('行映射容错', () => {
  it('标签与联系人 ID 按逗号拆分,未知枚举回退默认值', () => {
    const opp = rowToOpp({
      商机名称: 'X', 客户公司: 'Y', 阶段: '不存在的阶段', 优先级: '???',
      标签: 'a, b', 联系人IDs: 'c1,c2', '赢率%': '250',
    });
    expect(opp).not.toBeNull();
    expect(opp!.id).toBeTruthy();
    expect(opp!.stage).toBe('lead');
    expect(opp!.priority).toBe('P2');
    expect(opp!.tags).toEqual(['a', 'b']);
    expect(opp!.contactIds).toEqual(['c1', 'c2']);
    expect(opp!.winRate).toBe(100);
  });

  it('缺必填列的行被跳过(返回 null)', () => {
    expect(rowToOpp({ 客户公司: 'Y' })).toBeNull();
    expect(rowToContact({ 姓名: '张三' })).toBeNull();
    expect(rowToFu({ 类型: '电话' })).toBeNull();
    expect(rowToIdea({ 内容: 'xx' })).toBeNull();
  });

  it('日期列同时支持 YYYY-MM-DD 与 ISO', () => {
    const byDate = rowToOpp({ 商机名称: 'X', 客户公司: 'Y', 预计成交: '2026-08-15' })!;
    expect(byDate.expectedClose).toBeTruthy();
    const byIso = rowToFu({ 跟进事项: 'T', 截止时间: '2026-08-15T10:00:00.000Z' })!;
    expect(byIso.dueAt).toBe('2026-08-15T10:00:00.000Z');
  });
});

describe('JSON 备份', () => {
  it('往返无损(含时间线)', () => {
    const seed = buildSeed();
    const parsed = parseJsonBackup(jsonBackup(seed));
    expect(parsed).toEqual(seed);
  });

  it('缺少必要数据时抛错', () => {
    expect(() => parseJsonBackup('{"data":{}}')).toThrow();
    expect(() => parseJsonBackup('not json')).toThrow();
  });
});
