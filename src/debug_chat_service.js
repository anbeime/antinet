// 模拟完整的聊天流程
async function debugChatFlow() {
  console.log('=== 完整聊天流程调试 ===\n');
  
  const API_BASE_URL = 'http://localhost:8000/api/chat';
  const query = '卡片';
  
  console.log('用户输入:', query);
  console.log();
  
  // 步骤1: 后端搜索卡片
  console.log('步骤1: 后端搜索卡片...');
  const searchRequest = {
    query: query,
    conversation_history: []
  };
  
  const searchResponse = await fetch(`${API_BASE_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchRequest)
  });
  
  const searchResult = await searchResponse.json();
  console.log('  搜索结果:', searchResult.cards ? `${searchResult.cards.length}张` : '无');
  
  // 步骤2: 检查前端处理
  console.log('\n步骤2: 前端数据处理检查...');
  const relevant_cards = searchResult.cards;
  
  console.log('  relevant_cards:', relevant_cards);
  console.log('  relevant_cards.length:', relevant_cards ? relevant_cards.length : 0);
  console.log('  relevant_cards[0]:', relevant_cards && relevant_cards[0] ? relevant_cards[0].card_type : '无');
  
  // 步骤3: 检查 _generate_response 逻辑
  console.log('\n步骤3: _generate_response 逻辑检查...');
  
  if (!relevant_cards || relevant_cards.length === 0) {
    console.log('  ❌ relevant_cards 为空或不存在');
    console.log('  结果: 返回默认消息');
    console.log('  消息:', "抱歉，我没有找到与您的问题相关的知识卡片...");
  } else {
    console.log('  ✓ relevant_cards 有数据');
    console.log('  卡片数量:', relevant_cards.length);
    console.log('  第一个卡片:', relevant_cards[0].card_type);
    console.log('  结果: 生成结构化回复');
  }
  
  // 步骤4: 实际响应
  console.log('\n步骤4: 实际响应内容:');
  console.log('  response:', searchResult.response.substring(0, 100) + '...');
  console.log('  sources:', searchResult.sources.length);
  console.log('  cards:', searchResult.cards.length);
  console.log('  suggested_questions:', searchResult.suggested_questions.length);
}

debugChatFlow();
