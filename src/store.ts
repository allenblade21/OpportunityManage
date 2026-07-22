import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { buildSeed } from './seed';
import type {
  Activity, Contact, ContactRole, FollowUp, FollowUpType, Idea, IdeaStatus,
  Opportunity, Priority, Stage,
} from './types';
import { nowISO, stageMeta, typeLabel, uid, fmtWan } from './utils';

export type Page = 'dashboard' | 'opps' | 'detail' | 'contacts' | 'followups' | 'ideas';

export type ModalState =
  | null
  | { kind: 'opp'; presetName?: string; presetNotes?: string; fromIdeaId?: string }
  | { kind: 'contact'; opportunityId?: string }
  | { kind: 'followup'; opportunityId?: string; contactId?: string; presetTitle?: string }
  | { kind: 'idea' };

export interface ToastState {
  msg: string;
  action?: { label: string; run: () => void };
}

export interface NewOpportunityInput {
  name: string;
  company: string;
  amount: number;
  stage: Stage;
  priority: Priority;
  expectedClose?: string;
  source?: string;
  tags: string[];
  contactName?: string;
  notes?: string;
  fromIdeaId?: string;
}

export interface NewContactInput {
  name: string;
  company: string;
  title?: string;
  role: ContactRole;
  phone?: string;
  wechat?: string;
  opportunityId?: string;
}

export interface NewFollowUpInput {
  title: string;
  type: FollowUpType;
  dueAt: string;
  priority: Priority;
  opportunityId?: string;
  contactId?: string;
}

export interface NewIdeaInput {
  title: string;
  content?: string;
  priority?: Priority;
  opportunityId?: string;
}

interface Store {
  opportunities: Opportunity[];
  contacts: Contact[];
  followUps: FollowUp[];
  ideas: Idea[];
  activities: Activity[];

  page: Page;
  oppView: 'board' | 'list';
  selectedOppId: string | null;
  modal: ModalState;
  toastState: ToastState | null;

  go: (page: Page, oppId?: string) => void;
  setOppView: (v: 'board' | 'list') => void;
  openModal: (m: ModalState) => void;
  toast: (msg: string, action?: ToastState['action']) => void;
  clearToast: () => void;

  addOpportunity: (input: NewOpportunityInput) => void;
  setStage: (id: string, stage: Stage) => void;
  markLost: (id: string, reason: string) => void;
  setOppPriority: (id: string, priority: Priority) => void;

  addContact: (input: NewContactInput) => string;
  addFollowUp: (input: NewFollowUpInput) => void;
  completeFollowUp: (id: string) => void;
  reopenFollowUp: (id: string) => void;

  addIdea: (input: NewIdeaInput) => void;
  convertIdeaToFollowUp: (id: string) => void;
  setIdeaStatus: (id: string, status: IdeaStatus) => void;

  resetDemoData: () => void;
}

function activity(partial: Omit<Activity, 'id' | 'at'>): Activity {
  return { ...partial, id: uid(), at: nowISO() };
}

const seed = buildSeed();

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...seed,

      page: 'dashboard',
      oppView: 'board',
      selectedOppId: null,
      modal: null,
      toastState: null,

      go: (page, oppId) =>
        set((s) => ({ page, selectedOppId: oppId !== undefined ? oppId : s.selectedOppId })),
      setOppView: (v) => set({ oppView: v }),
      openModal: (m) => set({ modal: m }),
      toast: (msg, action) => set({ toastState: { msg, action } }),
      clearToast: () => set({ toastState: null }),

      addOpportunity: (input) => {
        const now = nowISO();
        const id = uid();
        let contactIds: string[] = [];
        let primaryContactId: string | undefined;

        if (input.contactName && input.contactName.trim()) {
          const name = input.contactName.trim();
          const existing = get().contacts.find(
            (c) => c.name === name && c.company === input.company,
          );
          if (existing) {
            contactIds = [existing.id];
            primaryContactId = existing.id;
          } else {
            const cid = get().addContact({ name, company: input.company, role: 'decision' });
            contactIds = [cid];
            primaryContactId = cid;
          }
        }

        const opp: Opportunity = {
          id,
          name: input.name,
          company: input.company,
          amount: input.amount,
          stage: input.stage,
          priority: input.priority,
          winRate: stageMeta[input.stage].defWin,
          expectedClose: input.expectedClose,
          source: input.source,
          tags: input.tags,
          contactIds,
          primaryContactId,
          owner: '我',
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({
          opportunities: [opp, ...s.opportunities],
          activities: [
            activity({
              opportunityId: id,
              kind: 'create',
              text: `创建商机${input.source ? `(来源:${input.source})` : ''}${input.notes ? ` — ${input.notes}` : ''}`,
            }),
            ...s.activities,
          ],
          ideas: input.fromIdeaId
            ? s.ideas.map((i) =>
                i.id === input.fromIdeaId
                  ? { ...i, status: 'adopted' as IdeaStatus, convertedOpportunityId: id }
                  : i,
              )
            : s.ideas,
        }));
        get().toast(`商机「${input.name}」已创建`, {
          label: '打开详情',
          run: () => get().go('detail', id),
        });
      },

      setStage: (id, stage) => {
        const opp = get().opportunities.find((o) => o.id === id);
        if (!opp || opp.stage === stage || opp.stage === 'lost') return;
        const now = nowISO();
        const isWon = stage === 'won';
        set((s) => ({
          opportunities: s.opportunities.map((o) =>
            o.id === id
              ? {
                  ...o,
                  stage,
                  winRate: stageMeta[stage].defWin,
                  wonAt: isWon ? now : o.wonAt,
                  updatedAt: now,
                }
              : o,
          ),
          activities: [
            activity({
              opportunityId: id,
              kind: isWon ? 'won' : 'stage',
              text: isWon
                ? `标记为赢单(${fmtWan(opp.amount)})`
                : `阶段变更:${stageMeta[opp.stage].label} → ${stageMeta[stage].label}`,
            }),
            ...s.activities,
          ],
        }));
        get().toast(
          isWon ? `恭喜赢单!${opp.company} · ${opp.name}` : `阶段已推进到「${stageMeta[stage].label}」`,
        );
      },

      markLost: (id, reason) => {
        const opp = get().opportunities.find((o) => o.id === id);
        if (!opp || opp.stage === 'won' || opp.stage === 'lost') return;
        const now = nowISO();
        set((s) => ({
          opportunities: s.opportunities.map((o) =>
            o.id === id
              ? { ...o, stage: 'lost' as Stage, winRate: 0, lostReason: reason, lostAt: now, updatedAt: now }
              : o,
          ),
          activities: [
            activity({ opportunityId: id, kind: 'lost', text: `标记为输单 — 原因:${reason}` }),
            ...s.activities,
          ],
        }));
        get().toast('已标记输单,原因已写入时间线');
      },

      setOppPriority: (id, priority) =>
        set((s) => ({
          opportunities: s.opportunities.map((o) =>
            o.id === id ? { ...o, priority, updatedAt: nowISO() } : o,
          ),
        })),

      addContact: (input) => {
        const id = uid();
        const contact: Contact = {
          id,
          name: input.name,
          company: input.company,
          title: input.title,
          role: input.role,
          phone: input.phone,
          wechat: input.wechat,
          createdAt: nowISO(),
        };
        set((s) => ({
          contacts: [contact, ...s.contacts],
          opportunities: input.opportunityId
            ? s.opportunities.map((o) =>
                o.id === input.opportunityId
                  ? {
                      ...o,
                      contactIds: [...o.contactIds, id],
                      primaryContactId: o.primaryContactId ?? id,
                    }
                  : o,
              )
            : s.opportunities,
          activities: input.opportunityId
            ? [
                activity({
                  opportunityId: input.opportunityId,
                  kind: 'contact',
                  text: `新增联系人:${input.name}${input.title ? `(${input.company} · ${input.title})` : ''}`,
                }),
                ...s.activities,
              ]
            : s.activities,
        }));
        return id;
      },

      addFollowUp: (input) => {
        const fu: FollowUp = {
          id: uid(),
          title: input.title,
          type: input.type,
          dueAt: input.dueAt,
          priority: input.priority,
          opportunityId: input.opportunityId,
          contactId: input.contactId,
          status: 'open',
          createdAt: nowISO(),
        };
        set((s) => ({ followUps: [fu, ...s.followUps] }));
        get().toast('跟进项已创建');
      },

      completeFollowUp: (id) => {
        const fu = get().followUps.find((f) => f.id === id);
        if (!fu || fu.status === 'done') return;
        const now = nowISO();
        set((s) => ({
          followUps: s.followUps.map((f) => (f.id === id ? { ...f, status: 'done', doneAt: now } : f)),
          contacts: fu.contactId
            ? s.contacts.map((c) => (c.id === fu.contactId ? { ...c, lastContactAt: now } : c))
            : s.contacts,
          activities: fu.opportunityId
            ? [
                activity({
                  opportunityId: fu.opportunityId,
                  kind: 'followup_done',
                  text: `完成跟进(${typeLabel[fu.type]}):${fu.title}`,
                }),
                ...s.activities,
              ]
            : s.activities,
        }));
        get().toast('已完成跟进 · 保持商机总有下一步', {
          label: '创建下一次跟进',
          run: () =>
            get().openModal({
              kind: 'followup',
              opportunityId: fu.opportunityId,
              contactId: fu.contactId,
            }),
        });
      },

      reopenFollowUp: (id) =>
        set((s) => ({
          followUps: s.followUps.map((f) =>
            f.id === id ? { ...f, status: 'open', doneAt: undefined } : f,
          ),
        })),

      addIdea: (input) => {
        const idea: Idea = {
          id: uid(),
          title: input.title,
          content: input.content,
          opportunityId: input.opportunityId,
          priority: input.priority ?? 'P2',
          status: 'pending',
          tags: [],
          createdAt: nowISO(),
        };
        set((s) => ({
          ideas: [idea, ...s.ideas],
          activities: [
            activity({ opportunityId: input.opportunityId, kind: 'idea', text: `新增想法:${input.title}` }),
            ...s.activities,
          ],
        }));
        get().toast('想法已记录,默认进入「待评估」');
      },

      convertIdeaToFollowUp: (id) => {
        const idea = get().ideas.find((i) => i.id === id);
        if (!idea) return;
        const due = new Date();
        due.setDate(due.getDate() + 3);
        due.setHours(18, 0, 0, 0);
        const fuId = uid();
        const fu: FollowUp = {
          id: fuId,
          title: idea.title,
          type: 'other',
          dueAt: due.toISOString(),
          priority: idea.priority,
          opportunityId: idea.opportunityId,
          status: 'open',
          createdAt: nowISO(),
        };
        set((s) => ({
          followUps: [fu, ...s.followUps],
          ideas: s.ideas.map((i) =>
            i.id === id ? { ...i, status: 'adopted' as IdeaStatus, convertedFollowUpId: fuId } : i,
          ),
          activities: idea.opportunityId
            ? [
                activity({
                  opportunityId: idea.opportunityId,
                  kind: 'idea',
                  text: `想法转化为跟进项:${idea.title}`,
                }),
                ...s.activities,
              ]
            : s.activities,
        }));
        get().toast('已转为跟进项(3 天后截止,可在跟进页调整)', {
          label: '查看跟进',
          run: () => get().go('followups'),
        });
      },

      setIdeaStatus: (id, status) =>
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, status } : i)),
        })),

      resetDemoData: () => {
        set({ ...buildSeed() });
        get().toast('已重置为演示数据');
      },
    }),
    {
      name: 'jihui-store-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        opportunities: s.opportunities,
        contacts: s.contacts,
        followUps: s.followUps,
        ideas: s.ideas,
        activities: s.activities,
      }),
    },
  ),
);
