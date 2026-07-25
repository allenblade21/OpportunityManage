import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runNotifyCheck, toggleNotifications } from '../lib/notify';
import { buildSeed } from '../seed';
import { useStore } from '../store';
import type { FollowUp } from '../types';

class FakeNotification {
  static permission = 'granted';
  static grantResult = 'granted';
  static created: { title: string; body?: string; tag?: string }[] = [];
  static requestPermission = async () => FakeNotification.grantResult;
  onclick: (() => void) | null = null;
  constructor(title: string, options?: { body?: string; tag?: string }) {
    FakeNotification.created.push({ title, body: options?.body, tag: options?.tag });
  }
  close() {}
}

const fuAt = (id: string, minutesFromNow: number, status: FollowUp['status'] = 'open'): FollowUp => ({
  id,
  title: `跟进-${id}`,
  type: 'call',
  dueAt: new Date(Date.now() + minutesFromNow * 60_000).toISOString(),
  priority: 'P2',
  status,
  createdAt: new Date().toISOString(),
});

beforeEach(() => {
  useStore.setState({
    ...buildSeed(),
    followUps: [],
    notifiedIds: [],
    notifyEnabled: false,
    toastState: null,
  });
  FakeNotification.created = [];
  FakeNotification.permission = 'granted';
  FakeNotification.grantResult = 'granted';
  (globalThis as Record<string, unknown>).Notification = FakeNotification;
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).Notification;
});

describe('runNotifyCheck 到期检查', () => {
  it('已逾期与 15 分钟窗口内各发一条,记录去重后二次检查为 0', () => {
    useStore.setState({
      followUps: [fuAt('over', -60), fuAt('soon', 10), fuAt('far', 120)],
    });
    expect(runNotifyCheck()).toBe(2);
    expect(FakeNotification.created).toHaveLength(2);
    expect(useStore.getState().notifiedIds.sort()).toEqual(['over', 'soon']);
    expect(runNotifyCheck()).toBe(0);
  });

  it('已完成的跟进不通知', () => {
    useStore.setState({ followUps: [fuAt('done', -60, 'done')] });
    expect(runNotifyCheck()).toBe(0);
  });

  it('通知正文包含关联商机', () => {
    const seed = buildSeed();
    useStore.setState({
      opportunities: seed.opportunities,
      followUps: [{ ...fuAt('x', -5), opportunityId: 'opp-star' }],
    });
    runNotifyCheck();
    expect(FakeNotification.created[0].body).toContain('星辰科技');
  });

  it('权限未授予时返回 0', () => {
    FakeNotification.permission = 'denied';
    useStore.setState({ followUps: [fuAt('over', -60)] });
    expect(runNotifyCheck()).toBe(0);
    expect(FakeNotification.created).toHaveLength(0);
  });

  it('Notification 不存在的环境安全返回 0', () => {
    delete (globalThis as Record<string, unknown>).Notification;
    useStore.setState({ followUps: [fuAt('over', -60)] });
    expect(runNotifyCheck()).toBe(0);
  });
});

describe('toggleNotifications 开关', () => {
  it('default 权限:申请通过后开启', async () => {
    FakeNotification.permission = 'default';
    FakeNotification.grantResult = 'granted';
    await toggleNotifications();
    expect(useStore.getState().notifyEnabled).toBe(true);
    expect(useStore.getState().toastState?.msg).toContain('已开启');
  });

  it('权限被拒绝:不开启并提示', async () => {
    FakeNotification.permission = 'denied';
    await toggleNotifications();
    expect(useStore.getState().notifyEnabled).toBe(false);
    expect(useStore.getState().toastState?.msg).toContain('拒绝');
  });

  it('已开启时再次调用即关闭', async () => {
    useStore.setState({ notifyEnabled: true });
    await toggleNotifications();
    expect(useStore.getState().notifyEnabled).toBe(false);
  });
});
