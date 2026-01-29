// 完整测试前端到后端的调用流程

async function testCompleteFlow() {
  console.log('=== 开始完整流程测试 ===\n');
  
  // 1. 测试后端健康检查
  console.log('1. 测试后端健康检查...');
  try {
    const healthRes = await fetch('http://localhost:8000/api/chat/health');
    const healthData = await healthRes.json();
    console.log('✅ 后端健康检查:', healthData.status);
  } catch (error) {
    console.error('❌ 后端健康检查失败:', error.message);
  }
  
  // 2. 测试查询API
  console.log('\n2. 测试查询API...');
  try {
    const request = {
      query: '知识卡片',
      conversation_history: []
    };
    
    const response = await fetch('http://localhost:8000/api/chat/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ 查询成功:', data.response.substring(0, 50) + '...');
    console.log('✅ 返回卡片数:', data.cards.length);
    console.log('✅ 推荐问题数:', data.suggested_questions.length);
  } catch (error) {
    console.error('❌ 查询API失败:', error.message);
  }
  
  // 3. 测试前端chatService调用
  console.log('\n3. 测试前端chatService调用...');
  try {
    const API_BASE_URL = 'http://localhost:8000/api/chat';
    const request = {
      query: '四色卡片',
      conversation_history: []
    };
    
    const response = await fetch(`${API_BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    const data = await response.json();
    console.log('✅ chatService调用成功:', data.response.substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ chatService调用失败:', error.message);
  }
  
  console.log('\n=== 测试完成 ===');
}

testCompleteFlow();
