// 测试前端chatService实现
async function testChatService() {
  console.log('=== 测试前端chatService ===\n');
  
  // 1. 模拟后端返回的数据
  const mockResponse = {
    response: '这是测试回复',
    sources: [
      { card_id: 'db_16', card_type: 'green', title: '如何使用聊天功能', similarity: 0.8 },
      { card_id: 'db_15', card_type: 'blue', title: '知识库搜索功能', similarity: 0.8 }
    ],
    cards: [
      {
        card_id: 'db_16',
        id: 16,
        card_type: 'green',
        title: '如何使用聊天功能',
        content: { description: '在聊天界面输入问题...' },
        source: null,
        category: '解释',
        similarity: 0.8
      }
    ],
    suggested_questions: ['推荐问题1', '推荐问题2']
  };
  
  console.log('1. 后端返回数据:');
  console.log('   response:', mockResponse.response);
  console.log('   sources数量:', mockResponse.sources.length);
  console.log('   cards数量:', mockResponse.cards.length);
  console.log('   suggested_questions:', mockResponse.suggested_questions);
  console.log();
  
  // 2. 检查前端如何处理
  const relevant_cards = mockResponse.cards;
  console.log('2. 前端处理:');
  console.log('   relevant_cards:', relevant_cards);
  console.log('   relevant_cards.length:', relevant_cards.length);
  console.log();
  
  // 3. 检查响应生成逻辑
  if (!relevant_cards || relevant_cards.length === 0) {
    console.log('   ⚠️ 卡片数量为0，将返回默认消息');
    const defaultResponse = "抱歉，我没有找到与您的问题相关的知识卡片...";
    console.log('   结果:', defaultResponse);
  } else {
    console.log('   ✅ 有卡片数据，将生成结构化回复');
    console.log('   卡片类型:', relevant_cards[0].card_type);
  }
}

testChatService();
