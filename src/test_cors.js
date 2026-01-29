// 测试CORS问题
async function testCORS() {
  console.log('=== 测试CORS和前端调用 ===\n');
  
  const API_BASE_URL = 'http://localhost:8000/api/chat';
  const request = {
    query: '卡片',
    conversation_history: []
  };
  
  console.log('1. 测试前端 fetch 调用');
  try {
    const response = await fetch(`${API_BASE_URL}/query`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    console.log('  状态:', response.status);
    console.log('  状态文本:', response.statusText);
    console.log('  Content-Type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      console.log('  ❌ 请求失败');
    } else {
      console.log('  ✓ 请求成功');
      
      const data = await response.json();
      console.log('  返回数据:', data.cards ? `${data.cards.length}张卡片` : '无卡片');
    }
  } catch (error) {
    console.log('  ❌ 请求错误:', error.message);
  }
  
  console.log('\n2. 测试跨域 (模拟浏览器)');
  console.log('  注意: 这需要浏览器环境才能完全测试');
}

testCORS();
