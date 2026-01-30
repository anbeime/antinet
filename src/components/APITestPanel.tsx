// API测试页面组件
// 用于测试所有后端API的连通性

import React, { useState } from 'react';
import { API_ENDPOINTS, apiRequest } from '@/config/api';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'pending' | 'success' | 'error';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  data?: any;
}

const APITestPanel: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const testEndpoints = [
    { name: '系统健康', endpoint: API_ENDPOINTS.HEALTH, method: 'GET' },
    { name: '知识卡片列表', endpoint: API_ENDPOINTS.KNOWLEDGE_CARDS, method: 'GET' },
    { name: '知识统计', endpoint: API_ENDPOINTS.KNOWLEDGE_STATS, method: 'GET' },
    { name: 'Agent状态', endpoint: API_ENDPOINTS.AGENT_STATUS, method: 'GET' },
    { name: 'Agent统计', endpoint: API_ENDPOINTS.AGENT_STATS, method: 'GET' },
    { name: '技能列表', endpoint: API_ENDPOINTS.SKILL_LIST, method: 'GET' },
    { name: '技能分类', endpoint: API_ENDPOINTS.SKILL_CATEGORIES, method: 'GET' },
    { name: '技能统计', endpoint: API_ENDPOINTS.SKILL_STATS, method: 'GET' },
    { name: 'NPU状态', endpoint: API_ENDPOINTS.NPU_STATUS, method: 'GET' },
    { name: '聊天卡片', endpoint: API_ENDPOINTS.CHAT_CARDS, method: 'GET' },
    { name: '团队成员', endpoint: API_ENDPOINTS.DATA_TEAM_MEMBERS, method: 'GET' },
    { name: '检查清单', endpoint: API_ENDPOINTS.DATA_CHECKLIST, method: 'GET' },
    { name: '分析历史', endpoint: API_ENDPOINTS.ANALYSIS_LIST, method: 'GET' },
  ];

  const testSingleEndpoint = async (
    name: string,
    endpoint: string,
    method: string
  ): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      return {
        endpoint: `${name} (${endpoint})`,
        method,
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        responseTime,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : JSON.stringify(data),
      };
    } catch (error) {
      return {
        endpoint: `${name} (${endpoint})`,
        method,
        status: 'error',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    const testResults: TestResult[] = [];

    for (const test of testEndpoints) {
      const result = await testSingleEndpoint(test.name, test.endpoint, test.method);
      testResults.push(result);
      setResults([...testResults]); // 实时更新
    }

    setTesting(false);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalCount = results.length;

  return (
    <div className="p-6 space-y-6">
      {/* 标题和操作 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">API连通性测试</h1>
          <p className="text-gray-600 dark:text-gray-400">
            测试所有后端API端点的连通性和响应时间
          </p>
        </div>
        <button
          onClick={runAllTests}
          disabled={testing}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {testing ? '测试中...' : '开始测试'}
        </button>
      </div>

      {/* 统计信息 */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-600">{totalCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">总计</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-600">{successCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">成功</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-600">{errorCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">失败</div>
          </div>
        </div>
      )}

      {/* 测试结果列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">测试结果</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {results.map((result, index) => (
            <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    {/* 状态图标 */}
                    {result.status === 'success' && (
                      <span className="text-green-500 text-xl">✓</span>
                    )}
                    {result.status === 'error' && (
                      <span className="text-red-500 text-xl">✗</span>
                    )}
                    {result.status === 'pending' && (
                      <span className="text-gray-400 text-xl">○</span>
                    )}

                    {/* 端点信息 */}
                    <div>
                      <div className="font-medium">{result.endpoint}</div>
                      <div className="text-sm text-gray-500">
                        {result.method} | 
                        {result.statusCode && ` ${result.statusCode} |`}
                        {result.responseTime && ` ${result.responseTime}ms`}
                      </div>
                    </div>
                  </div>

                  {/* 错误信息 */}
                  {result.error && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      错误: {result.error}
                    </div>
                  )}

                  {/* 成功数据预览 */}
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer">
                        查看响应数据
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}

          {results.length === 0 && !testing && (
            <div className="p-8 text-center text-gray-500">
              点击"开始测试"按钮开始测试API连通性
            </div>
          )}

          {testing && results.length < testEndpoints.length && (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">测试进行中...</p>
            </div>
          )}
        </div>
      </div>

      {/* 测试建议 */}
      {results.length > 0 && errorCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            [!] 发现问题
          </h3>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• 检查后端服务是否正常运行 (http://localhost:8000)</li>
            <li>• 查看后端日志中的错误信息</li>
            <li>• 确认相关路由是否已在main.py中注册</li>
            <li>• 检查数据库连接是否正常</li>
          </ul>
        </div>
      )}

      {results.length > 0 && errorCount === 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 dark:text-green-200">
            ✓ 所有API测试通过
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            后端API运行正常，可以开始前端开发
          </p>
        </div>
      )}
    </div>
  );
};

export default APITestPanel;
