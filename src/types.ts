export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export type Stage =
  | 'lead'          // 线索
  | 'contacted'     // 初步接触
  | 'needs'         // 需求确认
  | 'proposal'      // 方案报价
  | 'negotiation'   // 谈判
  | 'won'           // 赢单
  | 'lost';         // 输单

export type FollowUpType = 'call' | 'visit' | 'email' | 'wechat' | 'meeting' | 'other';
export type FollowUpStatus = 'open' | 'done' | 'canceled';
export type IdeaStatus = 'pending' | 'adopted' | 'shelved';
export type ContactRole = 'decision' | 'influencer' | 'user' | 'gatekeeper';

export interface Opportunity {
  id: string;
  name: string;
  company: string;
  /** 预计金额,单位:元 */
  amount: number;
  stage: Stage;
  priority: Priority;
  /** 赢率 0-100 */
  winRate: number;
  /** 预计成交日期 ISO */
  expectedClose?: string;
  source?: string;
  tags: string[];
  contactIds: string[];
  primaryContactId?: string;
  owner: string;
  lostReason?: string;
  wonAt?: string;
  lostAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  title?: string;
  role: ContactRole;
  phone?: string;
  wechat?: string;
  email?: string;
  notes?: string;
  lastContactAt?: string;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  title: string;
  type: FollowUpType;
  opportunityId?: string;
  contactId?: string;
  dueAt: string;
  priority: Priority;
  status: FollowUpStatus;
  result?: string;
  createdAt: string;
  doneAt?: string;
}

export interface Idea {
  id: string;
  title: string;
  content?: string;
  opportunityId?: string;
  priority: Priority;
  status: IdeaStatus;
  tags: string[];
  createdAt: string;
  convertedFollowUpId?: string;
  convertedOpportunityId?: string;
}

export type ActivityKind =
  | 'create' | 'stage' | 'won' | 'lost'
  | 'followup_done' | 'idea' | 'contact' | 'note';

export interface Activity {
  id: string;
  opportunityId?: string;
  kind: ActivityKind;
  text: string;
  at: string;
}
