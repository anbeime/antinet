// 测试真实的后端API响应
async function testRealAPI() {
  console.log('=== 测试真实后端API ===\n');
  
  const API_BASE_URL = 'http://localhost:8000/api/chat';
  const request = {
    query: '卡片',
    conversation_history: []
  };
  
  console.log('发送请求:', request);
  
  try {
    const response = await fetch(`${API_BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    console.log('响应状态:', response.status);
    
    const data = await response.json();
    
    console.log('\n响应数据结构:');
    console.log('  response:', data.response ? '✓ 存在' : '✗ 不存在');
    console.log('  sources:', data.sources ? `✓ ${data.sources.length}条` : '✗ 不存在');
    console.log('  cards:', data.cards ? `✓ ${data.cards.length}张` : '✗ 不存在');
    console.log('  suggested_questions:', data.suggested_questions ? `✓ ${data.suggested_questions.length}个` : '✗ 不存在');
    console.log();
    
    if (data.cards && data.cards.length > 0) {
      console.log('卡片数据:');
      data.cards.forEach((card, i) => {
        console.log(`  ${i+1}. [${card.card_type}] ${card.title}`);
      });
    } else {
      console.log('⚠️ 没有卡片数据，返回默认消息');
    }
    
    console.log('\n最终回复:');
    console.log(data.response.substring(0, 100) + '...');
    
    return data;
  } catch (error) {
    console.error('请求失败:', error);
    return null;
  }
}

testRealAPI();
