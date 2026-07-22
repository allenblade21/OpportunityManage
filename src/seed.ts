import type { Activity, Contact, FollowUp, Idea, Opportunity } from './types';

/** 相对今天的时间点(演示数据首次载入后随 localStorage 固化) */
function at(dayOffset: number, time = '10:00'): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export interface SeedData {
  opportunities: Opportunity[];
  contacts: Contact[];
  followUps: FollowUp[];
  ideas: Idea[];
  activities: Activity[];
}

export function buildSeed(): SeedData {
  const contacts: Contact[] = [
    { id: 'ct-zwm', name: '张伟明', company: '星辰科技', title: 'CTO', role: 'decision', phone: '138-0101-2233', wechat: 'zwm_tech', lastContactAt: at(-1, '16:20'), createdAt: at(-17) },
    { id: 'ct-lxy', name: '李晓芸', company: '星辰科技', title: '采购经理', role: 'gatekeeper', phone: '137-2244-5566', wechat: 'lixy0522', lastContactAt: at(-10, '15:30'), createdAt: at(-16) },
    { id: 'ct-wjg', name: '王建国', company: '蓝湖数字', title: '运营总监', role: 'decision', phone: '136-8899-0011', wechat: 'wangjg_lh', lastContactAt: at(-7), createdAt: at(-40) },
    { id: 'ct-csy', name: '陈思远', company: '恒远制造', title: 'IT 经理', role: 'influencer', phone: '135-6677-8899', wechat: 'chensy_hy', lastContactAt: at(-1, '15:02'), createdAt: at(-25) },
    { id: 'ct-zk',  name: '周凯', company: '恒远制造', title: '生产总监', role: 'decision', phone: '139-0011-2233', lastContactAt: at(-12), createdAt: at(-25) },
    { id: 'ct-lyt', name: '刘雨婷', company: '云帆教育', title: '产品负责人', role: 'user', phone: '188-5566-7788', wechat: 'yuting_liu', lastContactAt: at(-6), createdAt: at(-20) },
    { id: 'ct-zp',  name: '赵鹏', company: '华信银行', title: '科技处副处长', role: 'decision', phone: '186-3344-5566', lastContactAt: at(-3, '09:00'), createdAt: at(-3, '09:00') },
    { id: 'ct-sm',  name: '孙梅', company: '泰合能源', title: '信息中心主任', role: 'influencer', phone: '158-2233-4455', wechat: 'sunmei_th', lastContactAt: at(-14), createdAt: at(-15) },
    { id: 'ct-wgd', name: '吴国栋', company: '中港物流', title: '运营副总', role: 'decision', phone: '133-9900-1122', lastContactAt: at(-22), createdAt: at(-30) },
  ];

  const opportunities: Opportunity[] = [
    {
      id: 'opp-star', name: 'ERP 系统升级项目', company: '星辰科技', amount: 680000,
      stage: 'negotiation', priority: 'P0', winRate: 70, expectedClose: at(24), source: '老客户转介绍',
      tags: ['ERP', '华东区', '老客户'], contactIds: ['ct-zwm', 'ct-lxy'], primaryContactId: 'ct-zwm',
      owner: '我', createdAt: at(-17, '11:00'), updatedAt: at(-1, '17:40'),
    },
    {
      id: 'opp-hx', name: '数据中台咨询', company: '华信银行', amount: 900000,
      stage: 'needs', priority: 'P0', winRate: 45, expectedClose: at(70), source: '主动开拓',
      tags: ['金融', '咨询'], contactIds: ['ct-zp'], primaryContactId: 'ct-zp',
      owner: '我', createdAt: at(-8), updatedAt: at(-3),
    },
    {
      id: 'opp-lh', name: '年度数据服务续约', company: '蓝湖数字', amount: 320000,
      stage: 'proposal', priority: 'P1', winRate: 60, expectedClose: at(39), source: '老客户续约',
      tags: ['续约'], contactIds: ['ct-wjg'], primaryContactId: 'ct-wjg',
      owner: '我', createdAt: at(-30), updatedAt: at(-7),
    },
    {
      id: 'opp-hy', name: 'MES 试点项目', company: '恒远制造', amount: 450000,
      stage: 'needs', priority: 'P1', winRate: 40, expectedClose: at(60), source: '展会',
      tags: ['制造业', 'MES'], contactIds: ['ct-csy', 'ct-zk'], primaryContactId: 'ct-csy',
      owner: '我', createdAt: at(-25), updatedAt: at(-1, '15:02'),
    },
    {
      id: 'opp-yf', name: '在线课堂平台定制', company: '云帆教育', amount: 280000,
      stage: 'contacted', priority: 'P2', winRate: 20, expectedClose: at(85), source: '线上咨询',
      tags: ['教育'], contactIds: ['ct-lyt'], primaryContactId: 'ct-lyt',
      owner: '我', createdAt: at(-20), updatedAt: at(-6),
    },
    {
      id: 'opp-th', name: '设备监控系统', company: '泰合能源', amount: 520000,
      stage: 'lead', priority: 'P2', winRate: 10, expectedClose: at(100), source: '转介绍',
      tags: ['能源', '物联网'], contactIds: ['ct-sm'], primaryContactId: 'ct-sm',
      owner: '我', createdAt: at(-15), updatedAt: at(-14),
    },
    {
      id: 'opp-zg', name: '仓储管理系统', company: '中港物流', amount: 180000,
      stage: 'lead', priority: 'P3', winRate: 10, expectedClose: at(116), source: '主动开拓',
      tags: ['物流'], contactIds: ['ct-wgd'], primaryContactId: 'ct-wgd',
      owner: '我', createdAt: at(-30), updatedAt: at(-22),
    },
    {
      id: 'opp-lz', name: '会员系统改造', company: '绿洲零售', amount: 150000,
      stage: 'won', priority: 'P2', winRate: 100, expectedClose: at(-4), source: '老客户',
      tags: ['零售'], contactIds: [], owner: '我', wonAt: at(-4, '14:00'),
      createdAt: at(-50), updatedAt: at(-4, '14:00'),
    },
  ];

  const followUps: FollowUp[] = [
    { id: 'fu-1', title: '发送续约报价对比表', type: 'email', opportunityId: 'opp-lh', contactId: 'ct-wjg', dueAt: at(-1, '18:00'), priority: 'P1', status: 'open', createdAt: at(-3) },
    { id: 'fu-2', title: '电话回访张伟明,确认商务条款', type: 'call', opportunityId: 'opp-star', contactId: 'ct-zwm', dueAt: at(0, '14:00'), priority: 'P0', status: 'open', createdAt: at(-1) },
    { id: 'fu-3', title: '拜访赵鹏,汇报数据中台方案初稿', type: 'visit', opportunityId: 'opp-hx', contactId: 'ct-zp', dueAt: at(0, '16:30'), priority: 'P0', status: 'open', createdAt: at(-2) },
    { id: 'fu-4', title: '微信跟进刘雨婷,收集试用反馈', type: 'wechat', opportunityId: 'opp-yf', contactId: 'ct-lyt', dueAt: at(1, '15:00'), priority: 'P2', status: 'open', createdAt: at(-2) },
    { id: 'fu-5', title: '整理恒远制造需求调研纪要,发陈思远确认', type: 'other', opportunityId: 'opp-hy', contactId: 'ct-csy', dueAt: at(2, '12:00'), priority: 'P1', status: 'open', createdAt: at(-1) },
    { id: 'fu-6', title: '电话约孙梅,确定初次拜访时间', type: 'call', opportunityId: 'opp-th', contactId: 'ct-sm', dueAt: at(2, '16:00'), priority: 'P2', status: 'open', createdAt: at(-2) },
    { id: 'fu-7', title: '发送合同草案给李晓芸审核', type: 'email', opportunityId: 'opp-star', contactId: 'ct-lxy', dueAt: at(3, '11:00'), priority: 'P1', status: 'open', createdAt: at(-1) },
    { id: 'fu-8', title: '中港物流仓储方案预沟通', type: 'call', opportunityId: 'opp-zg', contactId: 'ct-wgd', dueAt: at(7, '10:00'), priority: 'P3', status: 'open', createdAt: at(-3) },
    { id: 'fu-9', title: '给绿洲零售发送验收报告与回款提醒', type: 'email', opportunityId: 'opp-lz', dueAt: at(10, '10:00'), priority: 'P2', status: 'open', createdAt: at(-3) },
  ];

  const ideas: Idea[] = [
    {
      id: 'id-1', title: '制造业「MES + 设备监控」打包联合方案',
      content: '恒远与泰合的需求高度互补,打包报价可以拉高客单价,也能把泰合从线索直接推进到方案阶段。先做一页纸方案试探两边反应。',
      opportunityId: 'opp-hy', priority: 'P1', status: 'pending', tags: ['打法'], createdAt: at(0, '09:12'),
    },
    {
      id: 'id-2', title: '续约客户提前 60 天自动开启关怀跟进',
      content: '蓝湖续约差点被竞品截胡,教训:续约商机要提前两个月建跟进节奏(近况回访 → 价值复盘 → 报价)。',
      priority: 'P2', status: 'adopted', tags: ['机制'], createdAt: at(-6),
    },
    {
      id: 'id-3', title: '华信银行项目沉淀为金融行业标杆案例包',
      content: '若数据中台咨询落地,整理成「方案书 + ROI 测算 + 客户证言」案例包,金融线获客可以直接复用。',
      opportunityId: 'opp-hx', priority: 'P2', status: 'pending', tags: ['案例'], createdAt: at(-3),
    },
    {
      id: 'id-4', title: '教育行业 Q4 采购窗口 · 目标客户清单',
      content: '教育客户预算集中在 Q4 释放,9 月前整理 20 家目标校/机构清单。当前优先级低,10 月前再启动。',
      priority: 'P3', status: 'shelved', tags: ['获客'], createdAt: at(-20),
    },
    {
      id: 'id-5', title: '提供分期付款方案,降低决策门槛',
      content: '首付 40% + 上线验收 40% + 一年质保金 20%,配合财务出资金占用测算。',
      opportunityId: 'opp-star', priority: 'P1', status: 'pending', tags: ['商务'], createdAt: at(-7),
    },
  ];

  const activities: Activity[] = [
    { id: 'ac-1', opportunityId: 'opp-star', kind: 'create', text: '创建商机(来源:老客户转介绍)', at: at(-17, '11:00') },
    { id: 'ac-2', opportunityId: 'opp-star', kind: 'followup_done', text: '完成跟进(拜访):现场演示 DEMO,李晓芸参加,重点关注售后响应时效', at: at(-10, '15:30') },
    { id: 'ac-3', opportunityId: 'opp-star', kind: 'idea', text: '新增想法:提供分期付款方案,降低决策门槛', at: at(-7, '10:00') },
    { id: 'ac-4', opportunityId: 'opp-hx', kind: 'contact', text: '新增联系人:赵鹏(华信银行 · 科技处副处长)', at: at(-3, '09:00') },
    { id: 'ac-5', opportunityId: 'opp-lz', kind: 'won', text: '标记为赢单(¥15万)', at: at(-4, '14:00') },
    { id: 'ac-6', opportunityId: 'opp-hy', kind: 'followup_done', text: '完成跟进(会议):MES 试点范围沟通会,周凯参加', at: at(-1, '15:02') },
    { id: 'ac-7', opportunityId: 'opp-star', kind: 'followup_done', text: '完成跟进(电话):与张伟明确认技术方案细节,对分期付款方案有兴趣', at: at(-1, '16:20') },
    { id: 'ac-8', opportunityId: 'opp-star', kind: 'stage', text: '阶段变更:方案报价 → 谈判', at: at(-1, '17:40') },
    { id: 'ac-9', kind: 'idea', text: '新增想法:制造业「MES + 设备监控」打包联合方案', at: at(0, '09:12') },
  ];

  return { opportunities, contacts, followUps, ideas, activities };
}
