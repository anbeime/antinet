import React from 'react';

/**
 * 轻量富文本编辑器占位实现
 *
 * 说明：项目原 RichTextEditor 组件文件缺失，此处提供最小可用实现，
 * 保证 WikiEditor / CardDetailModal 等依赖方可正常导入与渲染。
 * 后续如需完整富文本能力（工具栏/格式化），可替换为基于 Tiptap 的实现。
 *
 * Props 与原组件保持兼容：
 *   - content: 当前内容
 *   - onChange: 内容变更回调
 *   - onSave: 保存回调（可选）
 *   - placeholder: 占位提示文本（可选）
 */
type RichTextEditorProps = {
  content: string;
  onChange: (content: string) => void;
  onSave?: (html: string) => void;
  placeholder?: string;
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  onSave,
  placeholder = '请输入内容...',
}) => {
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-gray-800">
      {onSave && (
        <div className="flex items-center justify-end px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => onSave(content)}
            className="px-3 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            保存
          </button>
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 w-full p-4 text-sm leading-relaxed text-gray-800 dark:text-gray-100 bg-transparent border-0 outline-none resize-none focus:ring-0"
        spellCheck={false}
      />
    </div>
  );
};

export default RichTextEditor;
