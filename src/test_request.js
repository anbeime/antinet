// 测试不同的请求格式
async function testRequest() {
  const request1 = {
    query: '知识卡片',
    conversation_history: []
  };
  
  console.log('测试1: 标准格式');
  try {
    const res1 = await fetch('http://localhost:8000/api/chat/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request1)
    });
    console.log('状态:', res1.status, res1.statusText);
    const data1 = await res1.json();
    console.log('响应:', JSON.stringify(data1, null, 2).substring(0, 200));
  } catch (e) {
    console.error('错误:', e.message);
  }
}

testRequest();
