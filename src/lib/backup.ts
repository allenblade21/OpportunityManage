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

/** 触发浏览器下载:必须先挂载到 DOM,否则部分环境忽略 download 文件名 */
export function triggerDownload(blob: Blob, filename: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function downloadJson(data: Required<DataBundle>): void {
  const blob = new Blob([jsonBackup(data)], { type: 'application/json' });
  // 文件名用 ASCII:部分环境(headless、跨语言文件系统、老压缩工具)对中文名支持不佳
  triggerDownload(blob, `jihui-backup-${fileStamp()}.json`);
}
