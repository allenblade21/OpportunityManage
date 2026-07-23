import { beforeEach, describe, expect, it } from 'vitest';
import { buildSeed } from '../seed';
import { useStore } from '../store';

const S = () => useStore.getState();

beforeEach(() => {
  useStore.setState({
    ...buildSeed(),
    page: 'dashboard',
    oppView: 'board',
    selectedOppId: null,
    modal: null,
    toastState: null,
  });
});

describe('商机阶段流转', () => {
  it('推进阶段:更新默认赢率并写入时间线', () => {
    S().setStage('opp-hy', 'proposal');
    const opp = S().opportunities.find((o) => o.id === 'opp-hy')!;
    expect(opp.stage).toBe('proposal');
    expect(opp.winRate).toBe(60);
    const act = S().activities[0];
    expect(act.kind).toBe('stage');
    expect(act.opportunityId).toBe('opp-hy');
    expect(act.text).toContain('需求确认 → 方案报价');
  });

  it('标记赢单:记录 wonAt 与赢单动态', () => {
    S().setStage('opp-star', 'won');
    const opp = S().opportunities.find((o) => o.id === 'opp-star')!;
    expect(opp.wonAt).toBeTruthy();
    expect(opp.winRate).toBe(100);
    expect(S().activities[0].kind).toBe('won');
  });

  it('同阶段变更为 no-op', () => {
    const before = S().activities.length;
    S().setStage('opp-star', 'negotiation');
    expect(S().activities.length).toBe(before);
  });

  it('输单:必填原因,输单后阶段锁定', () => {
    S().markLost('opp-th', '预算取消');
    const opp = S().opportunities.find((o) => o.id === 'opp-th')!;
    expect(opp.stage).toBe('lost');
    expect(opp.lostReason).toBe('预算取消');
    expect(opp.lostAt).toBeTruthy();
    expect(S().activities[0].kind).toBe('lost');

    S().setStage('opp-th', 'lead');
    expect(S().opportunities.find((o) => o.id === 'opp-th')!.stage).toBe('lost');
  });
});

describe('跟进闭环联动', () => {
  it('完成跟进:写结果入时间线、刷新联系人最近联系时间', () => {
    const before = S().contacts.find((c) => c.id === 'ct-zwm')!.lastContactAt!;
    S().completeFollowUp('fu-2', '客户确认商务条款');

    const fu = S().followUps.find((f) => f.id === 'fu-2')!;
    expect(fu.status).toBe('done');
    expect(fu.doneAt).toBeTruthy();
    expect(fu.result).toBe('客户确认商务条款');

    const act = S().activities[0];
    expect(act.kind).toBe('followup_done');
    expect(act.text).toContain('客户确认商务条款');

    const after = S().contacts.find((c) => c.id === 'ct-zwm')!.lastContactAt!;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it('撤销完成:恢复待办并清除完成时间', () => {
    S().completeFollowUp('fu-2');
    S().reopenFollowUp('fu-2');
    const fu = S().followUps.find((f) => f.id === 'fu-2')!;
    expect(fu.status).toBe('open');
    expect(fu.doneAt).toBeUndefined();
  });

  it('重复完成为 no-op', () => {
    S().completeFollowUp('fu-2', '第一次');
    const before = S().activities.length;
    S().completeFollowUp('fu-2', '第二次');
    expect(S().activities.length).toBe(before);
  });
});

describe('商机创建与编辑', () => {
  it('新建商机:主要联系人不存在时自动创建', () => {
    S().addOpportunity({
      name: '新项目', company: '新公司', amount: 100000,
      stage: 'lead', priority: 'P2', tags: ['测试'], contactName: '全新联系人',
    });
    const opp = S().opportunities.find((o) => o.name === '新项目')!;
    expect(opp.winRate).toBe(10);
    expect(opp.contactIds).toHaveLength(1);
    const ct = S().contacts.find((c) => c.id === opp.primaryContactId)!;
    expect(ct.name).toBe('全新联系人');
    expect(ct.company).toBe('新公司');
  });

  it('由想法升级:想法标记已采纳并建立双向链接', () => {
    S().addOpportunity({
      name: '联合方案', company: '恒远制造', amount: 0,
      stage: 'lead', priority: 'P1', tags: [], fromIdeaId: 'id-1',
    });
    const opp = S().opportunities.find((o) => o.name === '联合方案')!;
    const idea = S().ideas.find((i) => i.id === 'id-1')!;
    expect(idea.status).toBe('adopted');
    expect(idea.convertedOpportunityId).toBe(opp.id);
  });

  it('编辑商机字段', () => {
    S().updateOpportunity('opp-star', { name: '改名', winRate: 80, amount: 700000 });
    const opp = S().opportunities.find((o) => o.id === 'opp-star')!;
    expect(opp.name).toBe('改名');
    expect(opp.winRate).toBe(80);
    expect(opp.amount).toBe(700000);
  });
});

describe('想法转化', () => {
  it('转为跟进项:继承优先级与关联商机,想法标记已采纳', () => {
    S().convertIdeaToFollowUp('id-5');
    const idea = S().ideas.find((i) => i.id === 'id-5')!;
    expect(idea.status).toBe('adopted');
    expect(idea.convertedFollowUpId).toBeTruthy();

    const fu = S().followUps.find((f) => f.id === idea.convertedFollowUpId)!;
    expect(fu.opportunityId).toBe('opp-star');
    expect(fu.priority).toBe('P1');
    expect(fu.status).toBe('open');
  });

  it('搁置与重新激活', () => {
    S().setIdeaStatus('id-1', 'shelved');
    expect(S().ideas.find((i) => i.id === 'id-1')!.status).toBe('shelved');
    S().setIdeaStatus('id-1', 'pending');
    expect(S().ideas.find((i) => i.id === 'id-1')!.status).toBe('pending');
  });
});

describe('级联删除', () => {
  it('删除商机:跟进与时间线一并删除,想法解除关联但保留', () => {
    S().deleteOpportunity('opp-star');
    expect(S().opportunities.some((o) => o.id === 'opp-star')).toBe(false);
    expect(S().followUps.some((f) => f.opportunityId === 'opp-star')).toBe(false);
    expect(S().activities.some((a) => a.opportunityId === 'opp-star')).toBe(false);

    const idea = S().ideas.find((i) => i.id === 'id-5')!;
    expect(idea).toBeTruthy();
    expect(idea.opportunityId).toBeUndefined();
  });

  it('删除详情页正在查看的商机时返回商机列表', () => {
    useStore.setState({ page: 'detail', selectedOppId: 'opp-star' });
    S().deleteOpportunity('opp-star');
    expect(S().page).toBe('opps');
    expect(S().selectedOppId).toBeNull();
  });

  it('删除联系人:从商机与跟进中解除关联,主要联系人自动顺延', () => {
    S().deleteContact('ct-zwm');
    expect(S().contacts.some((c) => c.id === 'ct-zwm')).toBe(false);

    const opp = S().opportunities.find((o) => o.id === 'opp-star')!;
    expect(opp.contactIds).not.toContain('ct-zwm');
    expect(opp.primaryContactId).toBe('ct-lxy');

    const fu = S().followUps.find((f) => f.id === 'fu-2')!;
    expect(fu.contactId).toBeUndefined();
  });

  it('删除跟进与想法', () => {
    S().deleteFollowUp('fu-1');
    expect(S().followUps.some((f) => f.id === 'fu-1')).toBe(false);
    S().deleteIdea('id-4');
    expect(S().ideas.some((i) => i.id === 'id-4')).toBe(false);
  });
});

describe('编辑跟进 / 联系人 / 想法', () => {
  it('updateFollowUp 修改字段', () => {
    S().updateFollowUp('fu-1', { title: '改标题', priority: 'P0' });
    const fu = S().followUps.find((f) => f.id === 'fu-1')!;
    expect(fu.title).toBe('改标题');
    expect(fu.priority).toBe('P0');
  });

  it('updateContact 修改字段', () => {
    S().updateContact('ct-zwm', { title: 'CEO', role: 'gatekeeper' });
    const ct = S().contacts.find((c) => c.id === 'ct-zwm')!;
    expect(ct.title).toBe('CEO');
    expect(ct.role).toBe('gatekeeper');
  });

  it('updateIdea 修改并可解除商机关联', () => {
    S().updateIdea('id-5', { title: '改想法', opportunityId: undefined });
    const idea = S().ideas.find((i) => i.id === 'id-5')!;
    expect(idea.title).toBe('改想法');
    expect(idea.opportunityId).toBeUndefined();
  });
});
