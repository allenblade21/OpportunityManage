/**
 * 把 SINGLE_FILE 构建产物(dist-single/)内联为一个自包含 HTML:
 * dist-single/single.html —— 双击即可打开,便于分发试用。
 * 前置:SINGLE_FILE=1 vite build(见 package.json 的 build:single)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(process.cwd(), 'dist-single');
let html = readFileSync(resolve(dir, 'index.html'), 'utf8');

const jsMatch = html.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
const cssMatch = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!jsMatch || !cssMatch) {
  console.error('未找到构建产物引用,请先运行 SINGLE_FILE=1 vite build');
  process.exit(1);
}

const asset = (ref) => readFileSync(resolve(dir, ref.replace(/^\.?\//, '')), 'utf8');
// 防止 JS 字符串中的 </script> 提前终止内联脚本(\/ 与 / 等价)
const js = asset(jsMatch[1]).replace(/<\/script/gi, '<\\/script');
const css = asset(cssMatch[1]);

html = html
  .replace(cssMatch[0], `<style>${css}</style>`)
  .replace(jsMatch[0], '')
  .replace('</body>', `<script type="module">${js}</script>\n</body>`);

const out = resolve(dir, 'single.html');
writeFileSync(out, html);
console.log(`single-file build -> ${out} (${(html.length / 1024).toFixed(0)} KB)`);
