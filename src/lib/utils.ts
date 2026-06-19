import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Markdown转HTML渲染函数
export function renderMarkdown(text: string): string {
  if (!text) return ''

  let html = text
    // 转义HTML特殊字符
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 代码块 (fenced) - 必须在行内代码之前处理
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-2 text-sm"><code>$2</code></pre>')

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm">$1</code>')

  // 表格
  html = html.replace(/^\|(.+)\|$/gm, (match: string, row: string) => {
    const cells = row.split('|').map(c => c.trim())
    if (cells.every(c => /^[-:\s]+$/.test(c))) return '<hr class="my-2 border-t-2 border-gray-300" />'
    const tag = match.startsWith('|-') ? 'th' : 'td'
    return '<tr>' + cells.map(c => `<${tag} class="border border-gray-300 dark:border-gray-600 px-3 py-1.5">${c}</${tag}>`).join('') + '</tr>'
  })
  html = html.replace(/<tr>.*?<\/tr>/g, m => m)

  // 标题 (从大到小，避免冲突)
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold mt-3 mb-1">$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-2">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-2">$1</h1>')

  // 引用
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2 text-gray-600 dark:text-gray-400 italic">$1</blockquote>')

  // 水平线
  html = html.replace(/^---$/gm, '<hr class="my-4 border-t border-gray-300 dark:border-gray-600" />')

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>')

  // Wiki链接
  html = html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '<a href="#" class="text-blue-600 hover:underline">$1</a>')

  // 加粗
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // 斜体
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // 删除线
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')

  // 无序列表
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')

  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')

  // 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full my-2 rounded" />')

  // 换行
  html = html.replace(/\n/g, '<br/>')

  return html
}

// PDF.js text items → 结构化 Markdown
export function pdfItemsToMarkdown(itemsByPage: Map<number, any[]>): string {
  const Y_TOLERANCE = 4;
  const bodyTexts: number[] = [];

  itemsByPage.forEach((items) => {
    items.forEach((t: any) => {
      if ((t.height || 12) > 0) bodyTexts.push(t.height || 12);
    });
  });
  bodyTexts.sort((a, b) => a - b);
  const bodyFontSize = bodyTexts[Math.floor(bodyTexts.length * 0.6)] || 12;

  const pages: string[] = [];

  itemsByPage.forEach((items, pageNum) => {
    if (!items.length) return;

    const lineMap = new Map<number, { y: number; items: any[] }>();
    items.forEach((item: any) => {
      const y = item.transform?.[5] ?? 0;
      let key = -1;
      lineMap.forEach((_, k) => {
        if (Math.abs(k - y) <= Y_TOLERANCE) key = k;
      });
      if (key === -1) {
        key = Math.round(y);
        lineMap.set(key, { y, items: [item] });
      } else {
        lineMap.get(key)!.items.push(item);
      }
    });

    const sortedLines = Array.from(lineMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, v]) => v);

    const rows: { y: number; x: number; text: string; height: number; segments: { x: number; text: string }[] }[] = [];

    sortedLines.forEach((line) => {
      line.items.sort((a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0));
      const text = line.items.map(t => t.str).join('').trim();
      if (!text) return;

      const avgHeight = line.items.reduce((s, t) => s + (t.height || bodyFontSize), 0) / line.items.length;
      const x0 = line.items[0]?.transform?.[4] ?? 0;

      const segments: { x: number; text: string }[] = [];
      let segText = '';
      let segX = 0;
      for (let i = 0; i < line.items.length; i++) {
        const it = line.items[i];
        const s = it.str || '';
        const cx = it.transform?.[4] ?? 0;
        const cw = it.width ?? 0;
        if (i === 0) {
          segX = cx; segText = s;
        } else {
          const prev = line.items[i - 1];
          const px = prev.transform?.[4] ?? 0;
          const pw = prev.width ?? 0;
          if (cx > px + pw + 2) {
            segments.push({ x: segX, text: segText });
            segX = cx; segText = s;
          } else {
            segText += s;
          }
        }
      }
      if (segText) segments.push({ x: segX, text: segText.trim() });

      const joinedText = segments.map(s => s.text).join(' ');
      rows.push({ y: line.y, x: x0, text: joinedText, height: avgHeight, segments });
    });

    // Try table detection: look for consecutive rows with same column count & similar X positions
    const tableRows: typeof rows[] = [];
    let currentTable: typeof rows = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const isTableRow = r.segments.length >= 2 && r.segments.every(s => s.text.trim().length > 0);
      if (isTableRow && currentTable.length > 0) {
        const prev = currentTable[currentTable.length - 1];
        if (r.segments.length !== prev.segments.length) {
          if (currentTable.length >= 2) tableRows.push([...currentTable]);
          currentTable = [r];
        } else {
          const alignOk = r.segments.every((s, j) => Math.abs(s.x - prev.segments[j].x) < 10);
          if (alignOk) { currentTable.push(r); }
          else { if (currentTable.length >= 2) tableRows.push([...currentTable]); currentTable = [r]; }
        }
      } else {
        if (currentTable.length >= 2) tableRows.push([...currentTable]);
        currentTable = [];
      }
    }
    if (currentTable.length >= 2) tableRows.push([...currentTable]);

    // Mark rows that belong to a table so we skip them in normal output
    const inTable = new Set<number>();
    tableRows.forEach(tbl => tbl.forEach(r => inTable.add(r.y)));

    const out: string[] = [];
    let prevY = 0;

    for (let ri = 0; ri < rows.length; ri++) {
      const r = rows[ri];
      if (inTable.has(r.y)) {
        if (ri === 0 || !inTable.has(rows[ri - 1].y)) {
          out.push('');
          const header = r.segments.map(s => s.text.trim());
          out.push('| ' + header.join(' | ') + ' |');
          out.push('| ' + header.map(() => '---').join(' | ') + ' |');
        } else {
          const cells = r.segments.map(s => s.text.trim());
          out.push('| ' + cells.join(' | ') + ' |');
        }
        prevY = r.y;
        continue;
      }

      if (prevY && (r.y - prevY) > bodyFontSize * 2.8) out.push('');
      prevY = r.y;

      if (r.height > bodyFontSize * 1.5) {
        const level = r.height > bodyFontSize * 2.2 ? 2 : 3;
        out.push(`${'#'.repeat(level)} ${r.text}`);
      } else if (/^[•·\-●○◆▪▸→⇒]\s/.test(r.text) || /^(\d+[.、）)])\s/.test(r.text)) {
        out.push(r.text);
      } else if (r.x > 15) {
        out.push(`  - ${r.text}`);
      } else {
        out.push(r.text);
      }
    }
    pages.push(out.join('\n'));
  });
  return pages.join('\n\n');
}

// 安全提取错误详情（FastAPI 422 错误中的 detail 可能是对象数组）
export function safeErrorDetail(detail: any, fallback: string = '操作失败'): string {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(d => d.msg || JSON.stringify(d)).join('; ');
  }
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return String(detail);
}

// 清理Markdown标记（用于纯文本显示）
export function cleanMarkdown(text: string): string {
  if (!text) return ''
  
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .trim()
}
