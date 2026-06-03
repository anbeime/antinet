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
