"""
应用所有修复到Home.tsx
"""
import re

file_path = r'C:\test\antinet\src\pages\Home.tsx'

# 读取文件
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("开始应用修复...")

# 1. 修复 handleCreateCard - 改为async并调用API
old_create = '''  // 处理创建卡片
  const handleCreateCard = (cardData: CardFormData) => {
    // 检查是否存在内容完全相同的卡片
    const isDuplicate = cards.some(
      card => card.title.toLowerCase().trim() === cardData.title.toLowerCase().trim() && 
              card.content.toLowerCase().trim() === cardData.content.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      toast('警告：已存在相同内容的卡片，请勿重复创建！', {
        className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
      });
      return;
    }
    
    // 确保relatedCards数组存在
    const validRelatedCards = cardData.relatedCards || [];
    
    const newCard: KnowledgeCard = {
      id: `card-${Date.now()}`,
      title: cardData.title,
      content: cardData.content,
      color: cardData.color,
      address: cardData.address,
      createdAt: new Date().toISOString(),
      relatedCards: validRelatedCards
    };
    
    // 添加新卡片到卡片列表
    setCards(prevCards => [newCard, ...prevCards]);
    
     // 保存到localStorage
     localStorage.setItem('antinet_cards', JSON.stringify([newCard, ...cards]));
     
     // 显示成功提示
     toast('卡片创建成功！', {
       className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
     });
  };'''

new_create = '''  // 处理创建卡片
  const handleCreateCard = async (cardData: CardFormData) => {
    // 检查是否存在内容完全相同的卡片
    const isDuplicate = cards.some(
      card => card.title.toLowerCase().trim() === cardData.title.toLowerCase().trim() && 
              card.content.toLowerCase().trim() === cardData.content.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      toast.warning('警告：已存在相同内容的卡片，请勿重复创建！', {
        className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
      });
      return;
    }
    
    try {
      // 调用后端API创建卡片
      const response = await fetch('http://localhost:8000/api/knowledge/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: cardData.color,
          title: cardData.title,
          content: cardData.content,
          category: cardData.color === 'blue' ? '事实' : 
                    cardData.color === 'green' ? '解释' : 
                    cardData.color === 'yellow' ? '风险' : '行动'
        })
      });

      if (!response.ok) {
        throw new Error('创建失败');
      }

      const newCard = await response.json();
      
      // 转换为前端格式并添加到列表
      const formattedCard: KnowledgeCard = {
        id: String(newCard.id),
        title: newCard.title,
        content: newCard.content,
        color: newCard.card_type || cardData.color,
        address: newCard.address || cardData.address,
        createdAt: newCard.created_at || new Date().toISOString(),
        relatedCards: []
      };
      
      setCards(prevCards => [formattedCard, ...prevCards]);
      
      toast.success('卡片创建成功！', {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
      
    } catch (error) {
      console.error('创建卡片失败:', error);
      toast.error('创建失败，请检查后端服务', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    }
  };'''

if old_create in content:
    content = content.replace(old_create, new_create)
    print("✅ 已修复 handleCreateCard")
else:
    print("⚠️  handleCreateCard 模式不匹配，可能已修复或格式不同")

# 2. 修复 handleImportCards
old_import = '''  // 处理导入卡片
  const handleImportCards = (importedCards: Array<{
    title: string;
    content: string;
    color: CardColor;
    address: string;
  }>) => {'''

new_import = '''  // 处理导入卡片
  const handleImportCards = async (importedCards: Array<{
    title: string;
    content: string;
    color: CardColor;
    address: string;
  }>) => {'''

if old_import in content:
    content = content.replace(old_import, new_import)
    print("✅ 已修复 handleImportCards (改为async)")
else:
    print("⚠️  handleImportCards 模式不匹配")

# 3. 修复 handleDeleteCard
old_delete = '''  // 删除卡片
  const handleDeleteCard = (cardId: string) => {
    // 从列表中移除卡片
    setCards(prevCards => prevCards.filter(card => card.id !== cardId));
    
    // 更新localStorage
    const updatedCards = cards.filter(card => card.id !== cardId);
    localStorage.setItem('antinet_cards', JSON.stringify(updatedCards));
  };'''

new_delete = '''  // 删除卡片
  const handleDeleteCard = async (cardId: string) => {
    try {
      // 调用后端API删除卡片
      const response = await fetch(`http://localhost:8000/api/knowledge/cards/${cardId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      // 从列表中移除卡片
      setCards(prevCards => prevCards.filter(card => card.id !== cardId));
      
      toast.success('卡片删除成功！', {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
      
    } catch (error) {
      console.error('删除卡片失败:', error);
      toast.error('删除失败，请检查后端服务', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    }
  };'''

if old_delete in content:
    content = content.replace(old_delete, new_delete)
    print("✅ 已修复 handleDeleteCard")
else:
    print("⚠️  handleDeleteCard 模式不匹配")

# 4. 修复 handleUpdateCard
old_update = '''  // 更新卡片
  const handleUpdateCard = (updatedCard: KnowledgeCard) => {
    // 确保关联卡片数组存在
    const cardWithValidRelations = {
      ...updatedCard,
      relatedCards: updatedCard.relatedCards || []
    };
    
    // 更新卡片列表
    const updatedCards = cards.map(card => 
      card.id === updatedCard.id ? cardWithValidRelations : card
    );
    
    // 设置更新后的卡片列表
    setCards(updatedCards);
    
    // 更新localStorage
    localStorage.setItem('antinet_cards', JSON.stringify(updatedCards));
    
    // 更新选中的卡片
    setSelectedCard(cardWithValidRelations);
    
    // 调试信息 - 可以帮助确认关联卡片是否被正确保存
    console.log('Updated card with relations:', cardWithValidRelations.relatedCards);
    
    // 显示成功提示
    toast('卡片更新成功！', {
      className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
    });
  };'''

new_update = '''  // 更新卡片
  const handleUpdateCard = async (updatedCard: KnowledgeCard) => {
    try {
      // 调用后端API更新卡片
      const response = await fetch(`http://localhost:8000/api/knowledge/cards/${updatedCard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: updatedCard.color,
          title: updatedCard.title,
          content: updatedCard.content,
          category: updatedCard.color === 'blue' ? '事实' : 
                    updatedCard.color === 'green' ? '解释' : 
                    updatedCard.color === 'yellow' ? '风险' : '行动'
        })
      });

      if (!response.ok) {
        throw new Error('更新失败');
      }

      // 确保关联卡片数组存在
      const cardWithValidRelations = {
        ...updatedCard,
        relatedCards: updatedCard.relatedCards || []
      };
      
      // 更新卡片列表
      const updatedCards = cards.map(card => 
        card.id === updatedCard.id ? cardWithValidRelations : card
      );
      
      setCards(updatedCards);
      setSelectedCard(cardWithValidRelations);
      
      toast.success('卡片更新成功！', {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
      
    } catch (error) {
      console.error('更新卡片失败:', error);
      toast.error('更新失败，请检查后端服务', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    }
  };'''

if old_update in content:
    content = content.replace(old_update, new_update)
    print("✅ 已修复 handleUpdateCard")
else:
    print("⚠️  handleUpdateCard 模式不匹配")

# 5. 删除所有localStorage.setItem
lines = content.split('\n')
new_lines = []
removed_count = 0

for i, line in enumerate(lines):
    if 'localStorage.setItem' in line and 'antinet_cards' in line:
        removed_count += 1
        # 同时删除前面的注释和空行
        if new_lines and '//' in new_lines[-1] and 'localStorage' in new_lines[-1]:
            new_lines.pop()
        if new_lines and new_lines[-1].strip() == '':
            new_lines.pop()
        continue
    new_lines.append(line)

content = '\n'.join(new_lines)
if removed_count > 0:
    print(f"✅ 已删除 {removed_count} 处 localStorage.setItem")

# 写回文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ 所有修复已应用！")
print("请重新启动前端服务以生效。")
