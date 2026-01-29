// 模拟前端chatService的调用
async function testChatAPI() {
  const API_BASE_URL = 'http://localhost:8000/api/chat';
  
  const request = {
    query: '知识卡片',
    conversation_history: []
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

testChatAPI().then(console.log).catch(console.error);
