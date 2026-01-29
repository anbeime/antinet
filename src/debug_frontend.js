// 模拟前端chatService调用，详细调试
async function debugChat() {
  const API_BASE_URL = 'http://localhost:8000/api/chat';
  const request = {
    query: '四色卡片',
    conversation_history: []
  };
  
  console.log('发送请求:', request);
  
  try {
    const response = await fetch(`${API_BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    console.log('响应状态:', response.status, response.statusText);
    console.log('响应头:', response.headers.get('content-type'));
    
    const data = await response.json();
    console.log('响应数据:', JSON.stringify(data, null, 2));
    
    // 检查数据结构
    console.log('response字段:', data.response ? '存在' : '不存在');
    console.log('cards字段:', data.cards ? '存在' : '不存在');
    console.log('卡片数量:', data.cards ? data.cards.length : 0);
    console.log('推荐问题:', data.suggested_questions);
    
    // 模拟前端处理
    if (data.cards && data.cards.length > 0) {
      console.log('✅ 有卡片数据，前端应该正常显示');
    } else {
      console.log('❌ 没有卡片数据，前端显示默认消息');
    }
    
    return data;
  } catch (error) {
    console.error('请求失败:', error);
    return null;
  }
}

debugChat();
