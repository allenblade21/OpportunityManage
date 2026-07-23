import { useStore } from '../store';
import { dueForNotify, fmtWhen, typeLabel } from '../utils';

/** 开关到期通知(处理权限申请),顶栏铃铛与设置弹窗共用 */
export async function toggleNotifications(): Promise<void> {
  const { notifyEnabled, setNotifyEnabled, toast } = useStore.getState();
  if (notifyEnabled) {
    setNotifyEnabled(false);
    toast('已关闭到期通知');
    return;
  }
  if (typeof Notification === 'undefined') {
    toast('当前浏览器不支持桌面通知');
    return;
  }
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    toast('通知权限被拒绝,请在浏览器地址栏的站点设置中允许通知');
    return;
  }
  setNotifyEnabled(true);
  toast('已开启到期通知:跟进截止前 15 分钟提醒');
}

/** 检查一轮并发送通知;返回本轮发送数量(供测试与调度器使用) */
export function runNotifyCheck(): number {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return 0;
  const { followUps, notifiedIds, markNotified, opportunities, go } = useStore.getState();
  const due = dueForNotify(followUps, notifiedIds, Date.now());
  if (due.length === 0) return 0;

  for (const fu of due) {
    const opp = fu.opportunityId
      ? opportunities.find((o) => o.id === fu.opportunityId)
      : undefined;
    const n = new Notification(`跟进到期:${fu.title}`, {
      body: [typeLabel[fu.type], opp ? `${opp.company} · ${opp.name}` : null, `截止 ${fmtWhen(fu.dueAt)}`]
        .filter(Boolean)
        .join(' · '),
      tag: fu.id,
    });
    n.onclick = () => {
      window.focus();
      go('followups');
      n.close();
    };
  }
  markNotified(due.map((f) => f.id));
  return due.length;
}
