"""
为GTDSystem添加自动标题提取功能
"""
file_path = r'C:\test\antinet\src\components\GTDSystem.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 添加自动提取标题函数（在组件内部，newTask state之后）
auto_title_function = '''
  // 自动从描述提取标题
  const extractTitleFromDesc = (description: string): string => {
    if (!description.trim()) return '';
    
    // 1. 尝试提取第一行作为标题
    const firstLine = description.split('\\n')[0].trim();
    if (firstLine && firstLine.length <= 50) {
      return firstLine;
    }
    
    // 2. 尝试提取第一个句子
    const sentenceMatch = description.match(/^[^。！？.!?]{5,50}[。！？.!?]?/);
    if (sentenceMatch) {
      return sentenceMatch[0].trim();
    }
    
    // 3. 提取前50个字符
    return description.substring(0, 50).trim() + (description.length > 50 ? '...' : '');
  };

  // 处理描述变化，自动更新标题
  const handleDescriptionChange = (value: string) => {
    setNewTask(prev => {
      // 如果标题为空或是自动生成的，则自动更新
      const shouldAutoTitle = !prev.title || prev.title === extractTitleFromDesc(prev.description);
      return {
        ...prev,
        description: value,
        title: shouldAutoTitle ? extractTitleFromDesc(value) : prev.title
      };
    });
  };
'''

# 查找 setNewTask 定义后的位置
pattern = r'(const \[newTask, setNewTask\] = useState<\{[^}]+\}>\([^)]+\))'

import re
match = re.search(pattern, content)
if match:
    insert_pos = match.end()
    
    # 在 setNewTask 定义后插入函数
    new_content = content[:insert_pos] + auto_title_function + content[insert_pos:]
    
    # 2. 修改 description textarea 的 onChange
    # 查找 description textarea
    old_textarea_pattern = r'(name="description"[^>]*onChange=\{)e => setNewTask\(\{[^}]+\}\)(\})'
    
    match2 = re.search(old_textarea_pattern, new_content)
    if match2:
        new_content = new_content.replace(match2.group(0), match2.group(1) + 'e => handleDescriptionChange(e.target.value)' + match2.group(2))
        print("✅ 已替换 description textarea onChange")
    else:
        # 尝试查找其他模式
        old_pattern2 = 'onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}'
        new_pattern2 = 'onChange={(e) => handleDescriptionChange(e.target.value)}'
        if old_pattern2 in new_content:
            new_content = new_content.replace(old_pattern2, new_pattern2)
            print("✅ 已替换 description textarea onChange (模式2)")
        else:
            print("⚠️  未找到 description textarea onChange")
    
    # 保存文件
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("✅ GTD自动提取标题功能已添加")
else:
    print("❌ 未找到 setNewTask 定义")
