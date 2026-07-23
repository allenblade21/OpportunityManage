import { useRef } from 'react';
import { downloadJson, parseJsonBackup } from '../lib/backup';
import { toggleNotifications } from '../lib/notify';
import { useStore } from '../store';
import { Icon, Modal } from './ui';

export function SettingsModal() {
  const {
    openModal, toast, notifyEnabled,
    opportunities, contacts, followUps, ideas, activities,
    replaceAllData, upsertImported, resetDemoData,
  } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const close = () => openModal(null);
  const bundle = () => ({ opportunities, contacts, followUps, ideas, activities });

  // xlsx 体积较大,按需异步加载,避免进入首屏包
  const exportExcel = async () => {
    const { downloadExcel } = await import('../lib/excel');
    downloadExcel(bundle());
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = parseJsonBackup(await file.text());
        if (!window.confirm('导入 JSON 备份会覆盖当前全部数据,确定继续?')) return;
        replaceAllData(parsed);
      } else {
        const { parseExcel } = await import('../lib/excel');
        const { added, updated } = upsertImported(parseExcel(await file.arrayBuffer()));
        toast(`Excel 导入完成:新增 ${added} 条,更新 ${updated} 条`);
      }
    } catch {
      toast('导入失败:文件格式不正确或数据不完整');
    }
  };

  return (
    <Modal
      title="设置"
      onClose={close}
      footer={<button className="btn" onClick={close}>关闭</button>}
    >
      <div className="set-sec full">
        <div className="set-title">到期通知</div>
        <div className="set-row">
          <div className="set-desc">
            跟进截止前 15 分钟(或已逾期)弹出浏览器通知,每条只提醒一次。
          </div>
          <button
            className={`btn btn-sm${notifyEnabled ? ' btn-pri' : ''}`}
            onClick={() => void toggleNotifications()}
            data-testid="notify-toggle"
          >
            <Icon name="bell" style={{ width: 13, height: 13 }} />
            {notifyEnabled ? '已开启' : '开启通知'}
          </button>
        </div>
      </div>

      <div className="set-sec full">
        <div className="set-title">数据管理</div>
        <div className="set-row">
          <div className="set-desc">
            Excel 含商机/联系人/跟进/想法四张表,可修改后再导入(按 ID 更新、无 ID 新增);
            JSON 为无损备份(含时间线),恢复时整体覆盖。
          </div>
        </div>
        <div className="set-actions">
          <button className="btn btn-sm" onClick={() => void exportExcel()}>导出 Excel</button>
          <button className="btn btn-sm" onClick={() => downloadJson(bundle())}>导出 JSON 备份</button>
          <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
            导入数据(.xlsx / .json)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.json"
            style={{ display: 'none' }}
            onChange={onImportFile}
            data-testid="import-input"
          />
        </div>
      </div>

      <div className="set-sec full">
        <div className="set-title">演示数据</div>
        <div className="set-actions">
          <button
            className="btn btn-sm btn-danger"
            onClick={() => {
              if (window.confirm('将清空当前数据并恢复演示数据,确定?')) {
                resetDemoData();
                close();
              }
            }}
          >
            重置为演示数据
          </button>
        </div>
      </div>

      <div className="set-sec full set-about">
        机汇 OpportunityManage v0.3 · 本地单机版,数据仅存于当前浏览器(localStorage)
      </div>
    </Modal>
  );
}
