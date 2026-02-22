"""
修改handleChange函数，为content字段添加自动标题提取
"""
file_path = r'C:\test\antinet\src\components\CreateCardModal.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 旧的 handleChange
old_handleChange = '''const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // 清除对应字段的错误
    if (errors[name as keyof CardFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };'''

# 新的 handleChange（添加自动标题提取）
new_handleChange = '''const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'content') {
      // 内容变化时，自动提取标题
      setFormData(prev => {
        // 如果标题为空或用户未手动修改，则自动提取
        const shouldAutoTitle = !prev.title || prev.title === extractTitle(prev.content);
        return {
          ...prev,
          [name]: value,
          title: shouldAutoTitle ? extractTitle(value) : prev.title
        };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // 清除对应字段的错误
    if (errors[name as keyof CardFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };'''

if old_handleChange in content:
    content = content.replace(old_handleChange, new_handleChange)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ handleChange已修改，添加自动标题提取")
else:
    print("❌ 未找到旧的handleChange")
    # 显示当前的handleChange
    import re
    pattern = r'const handleChange = \(e:[^)]+\) => \{[\s\S]+?\n  \};'
    match = re.search(pattern, content)
    if match:
        print("\n当前的handleChange:")
        print(match.group(0))
