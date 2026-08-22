/** JSON 无损备份(含时间线):导出为带版本号的文件,恢复时整体替换 */
import type { DataBundle } from '../store';
import { nowISO } from '../utils';

const JSON_VERSION = 1;

export const fileStamp = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
};

export function jsonBackup(data: Required<DataBundle>): string {
  return JSON.stringify(
    { app: 'jihui-opportunity-manage', version: JSON_VERSION, exportedAt: nowISO(), data },
    null,
    2,
  );
}

export function parseJsonBackup(text: string): Required<DataBundle> {
  const parsed = JSON.parse(text) as {
    version?: number;
    data?: Partial<Required<DataBundle>>;
  };
  const d = parsed.data;
  if (
    !d ||
    !Array.isArray(d.opportunities) ||
    !Array.isArray(d.contacts) ||
    !Array.isArray(d.followUps) ||
    !Array.isArray(d.ideas)
  ) {
    throw new Error('备份文件缺少必要数据');
  }
  return {
    opportunities: d.opportunities,
    contacts: d.contacts,
    followUps: d.followUps,
    ideas: d.ideas,
    activities: Array.isArray(d.activities) ? d.activities : [],
  };
}

export interface SaveOutcome {
  ok: boolean;
  /** declined = 用户在宿主确认框里拒绝(无需再提示);unsupported = 该环境无法保存此文件 */
  reason?: 'declined' | 'unsupported';
}

interface HostDownloads {
  save: (req: { filename: string; data: Blob }) => Promise<{ status: string }>;
}

/**
 * 触发文件保存:
 * - 发布为 Claude 预览页时,页面自触发的下载被沙盒拦截,改走宿主的
 *   downloads 能力(带用户确认;扩展名有白名单,.xlsx 不在其中)
 * - 普通网页环境走 <a download>(必须先挂载到 DOM,否则部分环境忽略文件名)
 */
export async function triggerDownload(blob: Blob, filename: string): Promise<SaveOutcome> {
  const host = (window as { claude?: { use?: (name: string) => Promise<HostDownloads | null> } }).claude;
  if (typeof host?.use === 'function') {
    try {
      const downloads = await host.use('downloads');
      if (!downloads) return { ok: false, reason: 'unsupported' };
      await downloads.save({ filename, data: blob });
      return { ok: true };
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code === 'declined' || code === 'rate_limited') return { ok: false, reason: 'declined' };
      return { ok: false, reason: 'unsupported' };
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return { ok: true };
}

export function downloadJson(data: Required<DataBundle>): Promise<SaveOutcome> {
  const blob = new Blob([jsonBackup(data)], { type: 'application/json' });
  // 文件名用 ASCII:部分环境(headless、跨语言文件系统、老压缩工具)对中文名支持不佳
  return triggerDownload(blob, `jihui-backup-${fileStamp()}.json`);
}
