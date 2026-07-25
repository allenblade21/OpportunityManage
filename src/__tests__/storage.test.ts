import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { appStorage } from '../lib/storage';

describe('appStorage(IndexedDB 适配器)', () => {
  it('set / get / remove 往返', async () => {
    await appStorage.setItem('k1', 'v1');
    expect(await appStorage.getItem('k1')).toBe('v1');
    await appStorage.setItem('k1', 'v2');
    expect(await appStorage.getItem('k1')).toBe('v2');
    await appStorage.removeItem('k1');
    expect(await appStorage.getItem('k1')).toBeNull();
  });

  it('读取不存在的键返回 null', async () => {
    expect(await appStorage.getItem('nope')).toBeNull();
  });

  it('迁移:IndexedDB 为空时读旧 localStorage 并复制入库', async () => {
    localStorage.setItem('mig-key', 'LEGACY');
    expect(await appStorage.getItem('mig-key')).toBe('LEGACY');
    // 删除 localStorage 后仍能读到,证明已复制进 IndexedDB
    localStorage.removeItem('mig-key');
    expect(await appStorage.getItem('mig-key')).toBe('LEGACY');
  });

  it('大值往返(约 1MB,超出 localStorage 常见压力场景)', async () => {
    const big = 'x'.repeat(1024 * 1024);
    await appStorage.setItem('big', big);
    const back = await appStorage.getItem('big');
    expect(back?.length).toBe(big.length);
    await appStorage.removeItem('big');
  });
});
