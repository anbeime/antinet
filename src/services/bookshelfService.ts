/**
 * 书架服务占位实现
 *
 * 说明：项目原 @/services/bookshelfService 文件缺失，此处提供基于 localStorage 的最小可用实现，
 * 保证 BookSkillCenter / PDFViewer 等依赖方可正常导入与运行。
 *
 * 后续如需接入后端 API，可替换为基于 fetch 的实现。
 */

export type BookshelfItem = {
  id: string;
  title: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileData?: string; // base64
  addedAt: string;
  lastReadAt?: string;
  readProgress?: number;
  tags?: string[];
  notes?: string;
};

const STORAGE_KEY = 'zhiyi_bookshelf';

function loadAll(): BookshelfItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveAll(items: BookshelfItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    // localStorage 满或不可用时忽略
    console.warn('[bookshelfService] save failed', e);
  }
}

export const bookshelfService = {
  /** 获取全部书籍 */
  async getAll(): Promise<BookshelfItem[]> {
    return loadAll();
  },

  /** 获取单本书 */
  async get(id: string): Promise<BookshelfItem | null> {
    return loadAll().find((b) => b.id === id) || null;
  },

  /** 新增书籍，返回新 ID */
  async add(data: Partial<BookshelfItem> & { title: string }): Promise<string> {
    const items = loadAll();
    const id = `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const item: BookshelfItem = {
      id,
      title: data.title,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileType: data.fileType,
      fileData: data.fileData,
      tags: data.tags || [],
      notes: data.notes || '',
      addedAt: new Date().toISOString(),
    };
    items.push(item);
    saveAll(items);
    return id;
  },

  /** 更新书籍 */
  async update(id: string, patch: Partial<BookshelfItem>): Promise<BookshelfItem | null> {
    const items = loadAll();
    const idx = items.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...patch };
    saveAll(items);
    return items[idx];
  },

  /** 删除书籍 */
  async remove(id: string): Promise<void> {
    const items = loadAll().filter((b) => b.id !== id);
    saveAll(items);
  },
};

export default bookshelfService;
